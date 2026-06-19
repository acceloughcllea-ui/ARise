import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { indexHtml } from './pages/index'
import { exhibitHtml } from './pages/exhibit'
import { archiveHtml } from './pages/archive'

type Bindings = {
  HF_TOKEN?: string
  ECHO_KV?: KVNamespace
  DB?: D1Database  // Cloudflare D1 database binding (arise-echo-db, configured in dashboard)
  AI?: any         // Cloudflare Workers AI binding (configured in wrangler.jsonc)
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// ===================================================================
// /exhibit  · Live Exhibit (从 arise-echo-gallery-7nz.pages.dev 复刻)
// ===================================================================
app.get('/exhibit', (c) => c.html(exhibitHtml))

// ===================================================================
// /archive  · The Archive (从 arise-echo-gallery-7nz.pages.dev 复刻)
// ===================================================================
app.get('/archive', (c) => c.html(archiveHtml))

// ========== 内存兜底 ==========
const memoryStore = new Map<string, EchoRecord>()

type EchoRecord = {
  art: string         // data URL of generated image
  text: string        // user's whisper
  voice: string       // style key
  title: string       // generated poetic title
  curatorNote: string // generated curator's note
  createdAt: number
}

// ========== 存储层 (优先 D1, 退而求其次 KV, 最后内存) ==========
// 用一个模块级标记避免每次请求都跑迁移
let d1SchemaReady = false
// 独立的回填 flag - 与 schema flag 分离, 确保每个 worker 实例都会跑一次回填
let d1BackfillDone = false

async function ensureD1Schema(db: D1Database): Promise<void> {
  if (d1SchemaReady) return
  try {
    // === Step 1: 读当前列 ===
    const info = await db.prepare("PRAGMA table_info(echoes)").all()
    const cols = new Set((info.results ?? []).map((r: any) => r.name as string))

    // 表不存在 -> 直接建新表, 收工
    if (cols.size === 0) {
      await db.exec("CREATE TABLE echoes (id TEXT PRIMARY KEY, art TEXT NOT NULL, text TEXT NOT NULL, voice TEXT NOT NULL, title TEXT NOT NULL, curatorNote TEXT NOT NULL, createdAt INTEGER NOT NULL)")
      d1SchemaReady = true
      return
    }

    // === Step 2: 检查是否需要重建 ===
    // 新 schema 期望的列集合
    const targetCols = new Set(['id', 'art', 'text', 'voice', 'title', 'curatorNote', 'createdAt'])
    // 如果列正好相等, 啥也不用做
    const colArr = Array.from(cols)
    const isExactMatch = colArr.length === targetCols.size && colArr.every(c => targetCols.has(c))
    if (isExactMatch) {
      d1SchemaReady = true
      return
    }

    // 否则: 旧表 + 新列混在一起, 必须重建. 重建前先把所有数据搬到新表.
    // 旧->新 字段映射
    const pickExpr = (target: string, fallback1: string, fallback2: string, def: string): string => {
      // 用 COALESCE 选第一个非 NULL: 优先新列, 否则旧列, 否则默认值
      const candidates: string[] = []
      if (cols.has(target)) candidates.push(target)
      if (cols.has(fallback1)) candidates.push(fallback1)
      if (cols.has(fallback2)) candidates.push(fallback2)
      if (candidates.length === 0) return def
      return `COALESCE(${candidates.join(', ')}, ${def})`
    }
    const selectId = cols.has('id') ? 'id' : "'unknown'"
    const selectArt = pickExpr('art', 'art', 'art', "''")
    const selectText = pickExpr('text', 'text', 'text', "''")
    const selectVoice = pickExpr('voice', 'voice_key', 'voice', "'velvet-midnight'")
    const selectTitle = pickExpr('title', 'title', 'title', "'Untitled'")
    const selectNote = pickExpr('curatorNote', 'curator_note', 'curatorNote', "''")
    const selectCreated = pickExpr('createdAt', 'created_at', 'createdAt', '0')

    // 用事务式批量语句重建表
    const stmts = [
      "DROP TABLE IF EXISTS echoes_new",
      "CREATE TABLE echoes_new (id TEXT PRIMARY KEY, art TEXT NOT NULL, text TEXT NOT NULL, voice TEXT NOT NULL, title TEXT NOT NULL, curatorNote TEXT NOT NULL, createdAt INTEGER NOT NULL)",
      `INSERT INTO echoes_new (id, art, text, voice, title, curatorNote, createdAt) SELECT ${selectId}, ${selectArt}, ${selectText}, ${selectVoice}, ${selectTitle}, ${selectNote}, ${selectCreated} FROM echoes`,
      "DROP TABLE echoes",
      "ALTER TABLE echoes_new RENAME TO echoes",
    ]
    for (const sql of stmts) {
      try {
        await db.exec(sql)
      } catch (e) {
        console.warn('[D1 migrate] step failed:', sql.slice(0, 60), (e as Error)?.message)
        // 即使中间步骤失败, 也不要把 d1SchemaReady 设为 true; 下次请求会再试一遍
        return
      }
    }
    d1SchemaReady = true
    console.log('[D1 schema] migration complete, table rebuilt')
  } catch (e) {
    console.warn('[D1 schema] outer error:', (e as Error)?.message)
  }
}

// ========== 给历史的 createdAt=0 老画补伪时间戳 ==========
//   - 独立于 ensureD1Schema, 用独立 flag (d1BackfillDone) 控制
//   - 不依赖 schema 是否刚刚被重建过 —— 只要看到 createdAt=0 的行就执行
//   - 基准: 2024-01-01 UTC, 按 id 字典序每条 +1 秒
//   - 返回回填行数, 给 /api/admin/backfill-ts 用
async function backfillLegacyTimestamps(db: D1Database, force = false): Promise<{ scanned: number; updated: number; error?: string }> {
  if (d1BackfillDone && !force) return { scanned: 0, updated: 0 }
  try {
    const oldRows = await db.prepare("SELECT id FROM echoes WHERE createdAt = 0 ORDER BY id ASC").all<{ id: string }>()
    const results = oldRows.results ?? []
    if (results.length === 0) {
      d1BackfillDone = true
      return { scanned: 0, updated: 0 }
    }
    const baseTs = new Date('2024-01-01T00:00:00Z').getTime()
    let updated = 0
    for (let i = 0; i < results.length; i++) {
      const fakeTs = baseTs + i * 1000
      const res = await db
        .prepare("UPDATE echoes SET createdAt = ? WHERE id = ? AND createdAt = 0")
        .bind(fakeTs, results[i].id)
        .run()
      if ((res as any)?.meta?.changes && (res as any).meta.changes > 0) updated++
    }
    d1BackfillDone = true
    console.log(`[D1 backfill] scanned=${results.length} updated=${updated} (base 2024-01-01 +i sec)`)
    return { scanned: results.length, updated }
  } catch (e) {
    const msg = (e as Error)?.message || String(e)
    console.warn('[D1 backfill] error:', msg)
    return { scanned: 0, updated: 0, error: msg }
  }
}

async function saveEcho(env: Bindings, id: string, record: EchoRecord): Promise<{d1: string; kv: string; mem: boolean}> {
  const status = { d1: 'no-binding', kv: 'no-binding', mem: false }
  if (env.DB) {
    try {
      await ensureD1Schema(env.DB)
      // 顺手把历史 createdAt=0 的行补一下时间戳 (用 flag 保护, 每个 worker 实例只跑一次)
      if (!d1BackfillDone) {
        await backfillLegacyTimestamps(env.DB)
      }
      await env.DB.prepare(
        "INSERT OR REPLACE INTO echoes (id, art, text, voice, title, curatorNote, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(id, record.art, record.text, record.voice, record.title, record.curatorNote, record.createdAt).run()
      const verify = await env.DB.prepare("SELECT id FROM echoes WHERE id = ?").bind(id).first()
      status.d1 = verify ? 'ok' : 'wrote-but-readback-null'
    } catch (e) {
      status.d1 = 'error: ' + ((e as Error)?.message || String(e)).slice(0, 200)
      console.warn('[D1 saveEcho] error:', (e as Error)?.message)
    }
  }
  if (env.ECHO_KV) {
    try {
      await env.ECHO_KV.put(`echo:${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 })
      status.kv = 'ok'
    } catch (e) {
      status.kv = 'error: ' + ((e as Error)?.message || String(e)).slice(0, 200)
      console.warn('[KV saveEcho] error:', (e as Error)?.message)
    }
  }
  memoryStore.set(id, record)
  status.mem = true
  return status
}

async function loadEcho(env: Bindings, id: string): Promise<EchoRecord | null> {
  if (env.DB) {
    try {
      await ensureD1Schema(env.DB)
      const row = await env.DB.prepare("SELECT art, text, voice, title, curatorNote, createdAt FROM echoes WHERE id = ?").bind(id).first<EchoRecord>()
      if (row) return row
    } catch (e) {
      console.warn('[D1 loadEcho] error:', (e as Error)?.message)
    }
  }
  if (env.ECHO_KV) {
    const raw = await env.ECHO_KV.get(`echo:${id}`)
    if (raw) return JSON.parse(raw) as EchoRecord
  }
  return memoryStore.get(id) || null
}

async function updateEcho(env: Bindings, id: string, patch: Partial<Pick<EchoRecord, 'title' | 'curatorNote' | 'voice'>>): Promise<EchoRecord | null> {
  const existing = await loadEcho(env, id)
  if (!existing) return null
  const updated: EchoRecord = {
    ...existing,
    title: patch.title !== undefined ? patch.title : existing.title,
    curatorNote: patch.curatorNote !== undefined ? patch.curatorNote : existing.curatorNote,
    voice: patch.voice && VOICES[patch.voice] ? patch.voice : existing.voice,
  }
  await saveEcho(env, id, updated)
  return updated
}

async function deleteEcho(env: Bindings, id: string): Promise<boolean> {
  let deleted = false
  if (env.DB) {
    try {
      await ensureD1Schema(env.DB)
      const res = await env.DB.prepare("DELETE FROM echoes WHERE id = ?").bind(id).run()
      // D1 run() 返回 meta.changes 表示影响行数
      if ((res as any)?.meta?.changes && (res as any).meta.changes > 0) deleted = true
    } catch (e) {
      console.warn('[D1 deleteEcho] error:', (e as Error)?.message)
    }
  }
  if (env.ECHO_KV) {
    try {
      const had = await env.ECHO_KV.get(`echo:${id}`)
      if (had) {
        await env.ECHO_KV.delete(`echo:${id}`)
        deleted = true
      }
    } catch (e) {
      console.warn('[KV deleteEcho] error:', (e as Error)?.message)
    }
  }
  if (memoryStore.has(id)) {
    memoryStore.delete(id)
    deleted = true
  }
  return deleted
}

// ========== 风格定义 (美术馆级艺术语言) ==========
// 每种 voice 都引用真实艺术运动 / 大师风格 + 具体绘画媒介 + 情绪关键词,
// 这样 Stable Diffusion 才会真的画"艺术品"而不是普通图片
const VOICES: Record<string, { label: string; prompt: string; palette: string }> = {
  'sun-bleached': {
    label: 'Sun-bleached memory',
    prompt: 'oil painting in the style of Andrew Wyeth and Edward Hopper, sun-bleached pastoral landscape, golden ochre and faded sienna palette, soft impasto brushwork, museum exhibition piece, melancholic warmth of summer afternoon, faded photographic memory rendered in oil on linen, fine art gallery quality',
    palette: '#D4AF7A',
  },
  'underwater': {
    label: 'Underwater dream',
    prompt: 'abstract painting in the style of Helen Frankenthaler and Mark Rothko, submerged dreamlike composition, deep teal and prussian blue washes, color field painting with translucent layers, soft caustic light filtering through liquid space, contemporary museum acquisition, oil and acrylic on canvas, emotionally resonant aquatic abstraction',
    palette: '#7AB8D4',
  },
  'velvet-midnight': {
    label: 'Velvet midnight',
    prompt: 'oil painting in the style of Vija Celmins and Anselm Kiefer, deep velvet night sky composition, indigo violet and ink black palette with scattered silver pinpricks, contemplative cosmic abstraction, textured surface with stardust impasto, museum-grade fine art, intimate nocturnal solitude rendered in painterly brushwork',
    palette: '#9F7AEA',
  },
  'pressed-flower': {
    label: 'Pressed flower',
    prompt: 'mixed media artwork in the style of Cy Twombly and Kiki Smith, pressed botanical specimens on aged parchment, sepia and dusty rose with faded carmine, delicate ink lines and watercolor washes, vintage herbarium aesthetic elevated to fine art, gallery exhibition piece, intimate meditative composition with translucent petals',
    palette: '#C9A4A4',
  },
}

// ========== 标题与策展人评语生成 ==========
function generateTitle(text: string): string {
  const cleaned = text.trim().replace(/[.,;:!?…—-]+$/g, '')
  const words = cleaned.split(/\s+/).slice(0, 4).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const NOTE_FRAGMENTS = [
  'a study in fading light',
  'on the architecture of remembering',
  'where silence becomes a color',
  'a small monument to a soft hour',
  'translation of a private weather',
  'an essay in the language of dust',
  'the texture of an almost-forgotten room',
  'cartography of an inner season',
  'a quiet refusal to be summarized',
  'notes on the gravity of small things',
  'an inventory of what was nearly said',
]
function generateCuratorNote(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return NOTE_FRAGMENTS[h % NOTE_FRAGMENTS.length]
}

function formatEchoNumber(id: string, createdAt: number): string {
  const d = new Date(createdAt)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `№ A-${yyyy}.${mm}.${dd} / ${id}`
}

// ========== AI 生成 ==========
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json<{ text?: string; voice?: string }>()
    const memoryText = (body.text || '').trim()
    const voiceKey = body.voice && VOICES[body.voice] ? body.voice : 'velvet-midnight'

    if (!memoryText) return c.json({ error: 'Whisper cannot be empty' }, 400)

    const voice = VOICES[voiceKey]

    // 把用户的记忆提炼成"情绪/意象关键词"而非直译,
    // 避免 SD 把原文当成具象指令(否则会出"按字面画的插画"而非画廊艺术品)
    const memoryEssence = distillMemoryEssence(memoryText)

    const artPrompt = `${voice.prompt}, evoking ${memoryEssence}, non-figurative abstract composition, no human faces, no figures, no text, no letters, no watermarks, no signature, painterly brushstrokes, layered translucent textures, museum exhibition piece, fine art gallery acquisition quality, masterful composition with negative space, contemplative emotional resonance, award-winning contemporary fine art --no photorealism, no illustration, no cartoon, no anime`

    const seed = Math.floor(Math.random() * 1_000_000_000)
    let base64Image: string = ''
    let providerUsed = 'placeholder'
    const debug: string[] = []

    // ============================================================
    // L1 主力: Cloudflare Workers AI (Flux.1-schnell)
    //   - 项目已绑定 AI binding, 在生产环境 100% 可用
    //   - 真正 AI 出图, 每个 seed 不同结果绝不重样
    //   - 免费额度足够 (每天 10k Neurons)
    // ============================================================
    if (!base64Image && c.env.AI) {
      try {
        const aiResp: any = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
          prompt: artPrompt,
          steps: 6,
          seed,
        })
        if (aiResp && typeof aiResp.image === 'string' && aiResp.image.length > 1000) {
          base64Image = `data:image/jpeg;base64,${aiResp.image}`
          providerUsed = 'cf-workers-ai'
          debug.push(`cf-workers-ai: ok (${aiResp.image.length} chars)`)
        } else {
          debug.push(`cf-workers-ai: bad response (${aiResp ? typeof aiResp.image : 'null'})`)
        }
      } catch (e) {
        const msg = (e as Error)?.message || String(e)
        console.warn('[CF Workers AI] error:', msg)
        debug.push(`cf-workers-ai: error ${msg}`)
      }
    } else if (!c.env.AI) {
      debug.push('cf-workers-ai: AI binding not available')
    }

    // ============================================================
    // L2 备用 (NEW): Pollinations.ai (免费, Flux 模型, ~1-3s 出图)
    //   - 实测 1.3s 出一张 768×768 JPEG, 比 AI Horde 快几个数量级
    //   - 没有队列, 没有 worker 短缺问题, 不需要 API key
    //   - 是当前生产环境最稳定的 AI 后备
    // ============================================================
    if (!base64Image) {
      try {
        base64Image = await generateViaPollinations(artPrompt, seed)
        if (base64Image) {
          providerUsed = 'pollinations'
          debug.push(`pollinations: ok (${base64Image.length} chars)`)
        }
      } catch (e) {
        const msg = (e as Error)?.message || String(e)
        console.warn('[Pollinations] error:', msg)
        debug.push(`pollinations: error ${msg}`)
      }
    }

    // ============================================================
    // L3 最后的 AI 兜底: AI Horde (免费, 匿名, 社区算力)
    //   - 当 Pollinations 也失败时使用
    //   - 注意: 高峰时段队列可能 200+ 任务, 等待 2-10 分钟
    //   - 因此只作为最后一道 AI 防线, 不再是主力
    // ============================================================
    if (!base64Image) {
      try {
        base64Image = await generateViaHorde(artPrompt, seed)
        if (base64Image) {
          providerUsed = 'ai-horde'
          debug.push('ai-horde: ok')
        }
      } catch (e) {
        const msg = (e as Error)?.message || String(e)
        console.warn('[AI Horde] error:', msg)
        debug.push(`ai-horde: error ${msg}`)
      }
    }

    // ============================================================
    // L4 最终兜底: SVG 占位艺术 (按 seed 变化, 不再千篇一律)
    // ============================================================
    if (!base64Image) {
      base64Image = makePlaceholderArt(voice.palette, voiceKey, seed)
      debug.push('svg: fallback used')
    }

    console.log(`[generate] provider=${providerUsed} voice=${voiceKey} seed=${seed} debug=${debug.join(' | ')}`)

    const id = crypto.randomUUID().slice(0, 8)
    const record: EchoRecord = {
      art: base64Image,
      text: memoryText,
      voice: voiceKey,
      title: generateTitle(memoryText),
      curatorNote: generateCuratorNote(memoryText + voiceKey),
      createdAt: Date.now(),
    }

    const storageStatus = await saveEcho(c.env, id, record)
    debug.push(`storage: d1=${storageStatus.d1} kv=${storageStatus.kv} mem=${storageStatus.mem}`)

    c.header('X-AI-Provider', providerUsed)
    c.header('X-AI-Debug', debug.join(' | ').slice(0, 500))
    return c.json({
      id,
      ...record,
      number: formatEchoNumber(id, record.createdAt),
      voiceLabel: voice.label,
      _provider: providerUsed,
      _debug: debug,
      _storage: storageStatus,
    })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Internal error' }, 500)
  }
})

// ========== 把用户记忆文本 -> "情绪 + 意象"关键词 ==========
// 关键: 不能把原文直接塞 SD prompt (无论中英),
// 否则 SD 会按字面画 -> 出来像插画/图鉴, 没有画廊艺术性.
// 这里用关键词词典做意象提取, 提取到的词作为"情绪/氛围"加入 prompt,
// 让 AI 围绕这些氛围画抽象艺术品.
const ESSENCE_LEXICON: Array<[RegExp, string]> = [
  // 自然 / 景物
  [/sea|ocean|wave|tide|salt|shore|beach|海|浪|潮|岸/i, 'oceanic depth, undulating tidal forms'],
  [/sky|cloud|star|moon|sun|dawn|dusk|sunset|sunrise|天空|云|星|月|阳|黎明|黄昏/i, 'celestial vastness, atmospheric luminosity'],
  [/forest|tree|leaf|wood|garden|flower|petal|bloom|林|树|叶|花|园|花瓣|盛开/i, 'botanical organic forms, vegetal abstraction'],
  [/rain|storm|fog|mist|snow|wind|雨|雾|雪|风|暴/i, 'atmospheric weather phenomena, soft veiled diffusion'],
  [/mountain|hill|stone|rock|cliff|山|石|岩|悬崖/i, 'monumental geological strata'],
  [/river|lake|stream|pond|water|liquid|河|湖|溪|塘|水/i, 'fluid reflective surfaces'],
  [/fire|flame|burn|ember|ash|火|焰|烧|烬|灰/i, 'incandescent ember warmth'],
  // 情绪
  [/love|kiss|embrace|tender|warm|爱|吻|拥抱|温柔|温暖/i, 'tender intimate warmth'],
  [/sad|cry|tear|grief|mourn|loss|lonely|miss|悲|哭|泪|伤|失|孤|想念|思念/i, 'melancholic solitude, quiet grief'],
  [/joy|laugh|smile|happy|celebrate|喜|笑|乐|快乐|庆祝/i, 'luminous joy, radiant lightness'],
  [/fear|afraid|dark|shadow|惧|怕|暗|阴影/i, 'shadowed apprehension'],
  [/hope|dream|wish|future|希望|梦|愿|未来/i, 'aspirational ascending light'],
  [/quiet|silent|still|peace|静|寂|宁|和平/i, 'tranquil silent stillness'],
  // 时间
  [/childhood|young|child|kid|baby|童|孩|幼|小时候/i, 'childhood ephemeral innocence'],
  [/old|age|years|past|memory|forget|老|岁|往|忆|忘/i, 'time-worn faded patina, layered memory'],
  [/night|midnight|sleep|夜|午夜|深夜|睡/i, 'deep nocturnal intimacy'],
  [/morning|早晨|清晨/i, 'dawn awakening light'],
  // 人 / 关系
  [/mother|father|grandmother|grandfather|family|妈|爸|奶奶|外婆|爷爷|家|家人/i, 'familial tender bonds, ancestral warmth'],
  [/friend|朋友|挚友/i, 'companionable warmth'],
  [/lover|partner|her|him|she|he|恋人|她|他/i, 'intimate emotional presence'],
  // 物
  [/letter|paper|book|page|word|信|纸|书|页|字/i, 'aged parchment textures, ink traces'],
  [/music|song|melody|sound|音乐|歌|旋律|声音/i, 'rhythmic harmonic vibrations'],
  [/house|home|room|window|door|家|房|屋|窗|门/i, 'enclosed intimate domestic space'],
  [/photo|picture|image|mirror|照片|图|镜/i, 'reflective doubled imagery'],
]

function distillMemoryEssence(text: string): string {
  const matches: string[] = []
  for (const [re, essence] of ESSENCE_LEXICON) {
    if (re.test(text) && !matches.includes(essence)) matches.push(essence)
    if (matches.length >= 4) break  // 太多会冲淡画面, 取最多 4 个意象
  }
  if (matches.length === 0) {
    // 没匹配到具体意象 -> 给一个普适的诗意氛围
    return 'wordless emotional resonance, abstract memory traces, ineffable feeling'
  }
  return matches.join(', ')
}

// seed-based PRNG -> 让每次占位图也不一样,不再千篇一律
function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xFFFFFFFF
  }
}

// ========== Pollinations.ai 调用 (免费, 无需 key, Flux 模型, ~1-3s 出图) ==========
//   - 直接 GET 一个 URL 就拿到 JPEG, 没有排队系统, 比 AI Horde 快几个数量级
//   - 模型: flux (高质量), 分辨率: 768×768, 用 seed 保证每次不同
//   - 内置一次重试: 第一次失败/拿到非图片时, 改 seed 再试一次
//   - 失败/超时时上抛, 由调用方走下一级 fallback (ai-horde -> svg)
async function generateViaPollinations(prompt: string, seed: number): Promise<string> {
  const encoded = encodeURIComponent(prompt)
  const tryOnce = async (s: number): Promise<string> => {
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&model=flux&nologo=true&seed=${s}`
    // 45s 上限 - Pollinations 正常 1-3s, 给足缓冲应对偶尔的冷启动
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/jpeg,image/png,image/*',
        'User-Agent': 'ARiseGallery/1.0 (+https://arise-echo-gallery-7nz.pages.dev)',
      },
      signal: AbortSignal.timeout(45_000),
    })
    if (!resp.ok) {
      throw new Error(`pollinations HTTP ${resp.status}`)
    }
    const ct = resp.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await resp.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    // 真实 AI 图片至少 10KB, 太小说明拿到了占位/错误页
    if (bytes.length < 10_000) {
      throw new Error(`pollinations payload too small ${bytes.length}b`)
    }
    // 检查 JPEG/PNG 文件头 (防止拿到 HTML 错误页)
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    if (!isJpeg && !isPng) {
      throw new Error(`pollinations not an image (ct=${ct}, magic=${bytes[0].toString(16)}${bytes[1].toString(16)})`)
    }
    // base64 编码 (Workers 没有 Buffer, 用 btoa + chunk 处理大数组防爆栈)
    let bin = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
    }
    const b64 = btoa(bin)
    const mime = isPng ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${b64}`
  }

  try {
    return await tryOnce(seed)
  } catch (e1) {
    const msg1 = (e1 as Error)?.message || String(e1)
    console.warn('[Pollinations] attempt-1 failed:', msg1, '- retrying with new seed')
    // 第二次用一个偏移过的 seed, 避免某些 seed 被 Pollinations 内部短暂卡住
    const altSeed = (seed * 31 + 17) % 1_000_000_000
    try {
      return await tryOnce(altSeed)
    } catch (e2) {
      const msg2 = (e2 as Error)?.message || String(e2)
      throw new Error(`pollinations both attempts failed: 1)${msg1} | 2)${msg2}`)
    }
  }
}

// ========== AI Horde 调用 (免费, 匿名, 多人并发) ==========
async function generateViaHorde(prompt: string, seed: number): Promise<string> {
  const HORDE_BASE = 'https://stablehorde.net/api/v2'
  const CLIENT_AGENT = 'ARiseGallery:1.0:https://arise-echo-gallery-7nz.pages.dev'

  // 1) 提交任务
  const submitResp = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: {
      'apikey': '0000000000',
      'Content-Type': 'application/json',
      'Client-Agent': CLIENT_AGENT,
    },
    body: JSON.stringify({
      prompt,
      params: {
        // 必须 ≤ 616x616 (匿名/低 kudos 用户的硬限制), 且 step ≤ 50
        sampler_name: 'k_euler_a',
        width: 512,
        height: 512,
        steps: 18,
        cfg_scale: 7,
        seed: String(seed),
        n: 1,
        karras: true,
      },
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
      // 不指定模型, 让 Horde 自动调度任意可用 worker, 避免排队过久
      r2: true,
    }),
  })
  if (!submitResp.ok) {
    const t = await submitResp.text().catch(() => '')
    throw new Error(`submit ${submitResp.status} ${t.slice(0, 200)}`)
  }
  const submitData: any = await submitResp.json()
  const jobId = submitData?.id
  if (!jobId) throw new Error(`no job id ${JSON.stringify(submitData).slice(0, 200)}`)

  // 2) 轮询完成 (最多 ~80s, 用 Date.now() 自循环避免某些 runtime 的 setTimeout 限制)
  const startedAt = Date.now()
  const MAX_MS = 80_000
  const INTERVAL_MS = 3500

  while (Date.now() - startedAt < MAX_MS) {
    await new Promise(r => setTimeout(r, INTERVAL_MS))
    const checkResp = await fetch(`${HORDE_BASE}/generate/check/${jobId}`, {
      headers: { 'Client-Agent': CLIENT_AGENT },
    })
    if (!checkResp.ok) continue
    const checkData: any = await checkResp.json()
    if (checkData?.faulted === true) throw new Error(`faulted ${JSON.stringify(checkData).slice(0, 200)}`)
    if (checkData?.done !== true) continue

    // 3) 拿结果
    const resultResp = await fetch(`${HORDE_BASE}/generate/status/${jobId}`, {
      headers: { 'Client-Agent': CLIENT_AGENT },
    })
    if (!resultResp.ok) throw new Error(`status ${resultResp.status}`)
    const resultData: any = await resultResp.json()
    const gen = resultData?.generations?.[0]
    if (!gen) throw new Error('no generations in result')

    const imgField: string = gen.img
    if (!imgField) throw new Error('empty img field')

    if (imgField.startsWith('http')) {
      const imgResp = await fetch(imgField)
      if (!imgResp.ok) throw new Error(`img fetch ${imgResp.status}`)
      const ct = imgResp.headers.get('content-type') || 'image/webp'
      const arrayBuffer = await imgResp.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      if (bytes.length < 1024) throw new Error(`img too small ${bytes.length}b`)
      let binary = ''
      const CHUNK = 0x8000
      for (let j = 0; j < bytes.length; j += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(j, j + CHUNK) as any)
      }
      return `data:${ct};base64,${btoa(binary)}`
    } else {
      return `data:image/webp;base64,${imgField}`
    }
  }
  throw new Error(`timeout ${MAX_MS}ms`)
}

function makePlaceholderArt(palette: string, voiceKey: string, seed: number = Date.now()): string {
  const rand = seededRandom(seed)
  // 给四种风格各一种独特的 SVG 占位艺术, 用 seed 让细节有差异
  let inner = ''

  if (voiceKey === 'sun-bleached') {
    const cx = 320 + Math.floor(rand() * 128)
    const cy = 280 + Math.floor(rand() * 160)
    const r1 = 180 + Math.floor(rand() * 80)
    inner = `<defs><radialGradient id="g" cx="${(cx/768*100).toFixed(1)}%" cy="${(cy/1024*100).toFixed(1)}%" r="70%"><stop offset="0%" stop-color="#F5DEB3"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#3a2818"/></radialGradient></defs><rect width="768" height="1024" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="${r1}" fill="#FFE9C4" opacity="0.18"/><circle cx="${cx}" cy="${cy}" r="${r1*0.6|0}" fill="#FFE9C4" opacity="0.12"/>`
  } else if (voiceKey === 'underwater') {
    const waves = Array.from({length:5}, (_,i) => {
      const y = 200 + i*150 + Math.floor(rand()*60)
      const amp = 30 + Math.floor(rand()*40)
      return `<path d="M 0 ${y} Q 200 ${y-amp} 400 ${y+amp/2} T 800 ${y}" stroke="#fff" stroke-width="1" fill="none" opacity="${(0.15-i*0.02).toFixed(2)}"/>`
    }).join('')
    inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a4d6b"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#0a1a2a"/></linearGradient></defs><rect width="768" height="1024" fill="url(#g)"/>${waves}`
  } else if (voiceKey === 'pressed-flower') {
    const flowers = Array.from({length: 3 + Math.floor(rand()*3)}, () => {
      const cx = 100 + Math.floor(rand()*568)
      const cy = 250 + Math.floor(rand()*500)
      const r = 14 + Math.floor(rand()*20)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#a06870" opacity="0.5"/>`
    }).join('')
    inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8d8c8"/><stop offset="100%" stop-color="${palette}"/></linearGradient></defs><rect width="768" height="1024" fill="url(#g)"/><g stroke="#7a5050" stroke-width="0.8" fill="none" opacity="0.35"><path d="M 384 700 Q 380 500 384 350"/><path d="M 384 450 Q 320 420 280 380"/><path d="M 384 480 Q 450 450 490 410"/>${flowers}</g>`
  } else {
    // velvet-midnight (默认)
    const stars = Array.from({length: 30 + Math.floor(rand()*30)}, () => {
      const cx = Math.floor(rand()*768)
      const cy = Math.floor(rand()*1024)
      const r = (0.4 + rand()*1.2).toFixed(2)
      const op = (0.3 + rand()*0.6).toFixed(2)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" opacity="${op}"/>`
    }).join('')
    inner = `<defs><radialGradient id="g" cx="50%" cy="40%" r="80%"><stop offset="0%" stop-color="#5a3a8a"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#0a0420"/></radialGradient></defs><rect width="768" height="1024" fill="url(#g)"/><g fill="#fff">${stars}</g>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">${inner}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

app.get('/api/echo/:id', async (c) => {
  const id = c.req.param('id')
  const record = await loadEcho(c.env, id)
  if (!record) return c.json({ error: 'Not found' }, 404)
  const voice = VOICES[record.voice] || VOICES['velvet-midnight']
  return c.json({ id, ...record, number: formatEchoNumber(id, record.createdAt), voiceLabel: voice.label, palette: voice.palette })
})

// ========== 列表 API:供 /exhibit 与 /archive 取所有作品 ==========
type EchoListItem = EchoRecord & { id: string; voiceLabel: string; palette: string; number: string }

function decorate(id: string, r: EchoRecord): EchoListItem {
  const voice = VOICES[r.voice] || VOICES['velvet-midnight']
  return {
    ...r,
    id,
    voiceLabel: voice.label,
    palette: voice.palette,
    number: formatEchoNumber(id, r.createdAt),
  }
}

async function listAllEchoes(env: Bindings): Promise<EchoListItem[]> {
  // 并合三层数据源以最大化健壮性 — 任一层失败/同步延迟,其他层兜底
  const byId = new Map<string, EchoRecord>()

  // L1: D1
  if (env.DB) {
    try {
      await ensureD1Schema(env.DB)
      // 顺手回填 createdAt=0 的遗留行 (每个 worker 实例只跑一次)
      if (!d1BackfillDone) {
        await backfillLegacyTimestamps(env.DB)
      }
      const { results } = await env.DB.prepare(
        "SELECT id, art, text, voice, title, curatorNote, createdAt FROM echoes ORDER BY createdAt DESC LIMIT 1000"
      ).all<{ id: string } & EchoRecord>()
      if (results) {
        for (const r of results) {
          byId.set(r.id, { art: r.art, text: r.text, voice: r.voice, title: r.title, curatorNote: r.curatorNote, createdAt: r.createdAt })
        }
      }
    } catch (e) {
      console.warn('[D1 listAll] error:', (e as Error)?.message)
    }
  }

  // L2: KV (作为兜底, 不替换 D1 已有数据)
  if (env.ECHO_KV) {
    try {
      const list = await env.ECHO_KV.list({ prefix: 'echo:', limit: 1000 })
      for (const k of list.keys) {
        const id = k.name.replace(/^echo:/, '')
        if (byId.has(id)) continue
        const raw = await env.ECHO_KV.get(k.name)
        if (!raw) continue
        try { byId.set(id, JSON.parse(raw) as EchoRecord) } catch {}
      }
    } catch (e) {
      console.warn('[KV listAll] error:', (e as Error)?.message)
    }
  }

  // L3: memory (本节点最新, 兜底刚写入但 D1/KV 还没全球同步的数据)
  for (const [id, r] of memoryStore.entries()) {
    if (!byId.has(id)) byId.set(id, r)
  }

  const items: EchoListItem[] = []
  for (const [id, r] of byId.entries()) items.push(decorate(id, r))
  items.sort((a, b) => b.createdAt - a.createdAt)
  return items
}

// 强制 no-cache, 避免 CF 边缘缓存或浏览器缓存让 archive/exhibit 看到旧数据
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

app.get('/api/exhibit', async (c) => {
  const items = await listAllEchoes(c.env)
  for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) c.header(k, v)
  return c.json({ count: items.length, updatedAt: Date.now(), items })
})

app.get('/api/archive', async (c) => {
  const items = await listAllEchoes(c.env)
  for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) c.header(k, v)
  return c.json({ count: items.length, updatedAt: Date.now(), items })
})

// ========== 单条作品的 编辑 / 删除 ==========
app.put('/api/echo/:id', async (c) => {
  const id = c.req.param('id')
  let patch: any = {}
  try { patch = await c.req.json() } catch {}
  const allowed: any = {}
  if (typeof patch.title === 'string') allowed.title = patch.title.trim().slice(0, 120)
  if (typeof patch.curatorNote === 'string') allowed.curatorNote = patch.curatorNote.trim().slice(0, 600)
  if (typeof patch.voice === 'string' && VOICES[patch.voice]) allowed.voice = patch.voice
  if (Object.keys(allowed).length === 0) {
    return c.json({ error: 'No editable fields provided. Allowed: title, curatorNote, voice' }, 400)
  }
  const updated = await updateEcho(c.env, id, allowed)
  if (!updated) return c.json({ error: 'Not found' }, 404)
  const voice = VOICES[updated.voice] || VOICES['velvet-midnight']
  for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) c.header(k, v)
  return c.json({ id, ...updated, number: formatEchoNumber(id, updated.createdAt), voiceLabel: voice.label, palette: voice.palette })
})

app.delete('/api/echo/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await deleteEcho(c.env, id)
  for (const [k, v] of Object.entries(NO_CACHE_HEADERS)) c.header(k, v)
  if (!ok) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
})

// ===================================================================
// 共用 head:字体 + 全站基调样式
// ===================================================================
const sharedHead = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<style>
  :root {
    --bg: #0a0612;
    --bg-deep: #050309;
    --ink: #f5ede0;
    --ink-soft: rgba(245,237,224,0.6);
    --ink-faint: rgba(245,237,224,0.3);
    --violet: #9F7AEA;
    --gold: #D4AF7A;
    --line: rgba(245,237,224,0.12);
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background: var(--bg); color: var(--ink); }
  body { font-family: 'Inter', system-ui, sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .serif { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 300; }
  .serif-italic { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; }
  .uppercase-tracked { text-transform: uppercase; letter-spacing: 0.28em; font-size: 11px; font-weight: 400; }
  a { color: inherit; text-decoration: none; }
  .gold { color: var(--gold); }
  .violet { color: var(--violet); }
  .ink-soft { color: var(--ink-soft); }
  .ink-faint { color: var(--ink-faint); }
  /* 通用细金线分隔 */
  .hairline { display:block; height:1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0.5; }
  .hairline-short { width: 40px; height: 1px; background: var(--gold); opacity: 0.7; }
  /* 滚动条隐藏 */
  ::-webkit-scrollbar { width: 0; height: 0; }
</style>
`

// ===================================================================
// /  · The Threshold 入境页
// ===================================================================
app.get('/', (c) => c.html(indexHtml))

// ===================================================================
// /create  · The Whisper 创作页(三屏 scroll-driven)
// ===================================================================
app.get('/create', (c) => {
  const voicesJson = JSON.stringify(
    Object.entries(VOICES).map(([k, v]) => ({ key: k, label: v.label, palette: v.palette }))
  )
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · The Whisper</title>
<style>
  body { background: var(--bg-deep); overflow-y: scroll; scroll-behavior: smooth; }

  /* 顶部进度 */
  .progress-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 1px;
    background: var(--line); z-index: 100;
  }
  .progress-fill {
    height: 100%; background: var(--gold); width: 0%;
    transition: width .8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .top-nav {
    position: fixed; top: 22px; left: 0; right: 0; z-index: 99;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 28px; pointer-events: none;
  }
  .top-nav a, .top-nav span { pointer-events: auto; font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink-faint); }
  .top-nav a:hover { color: var(--gold); }

  /* 每个 chapter 全屏 */
  .chapter {
    min-height: 100vh; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 80px 24px; position: relative;
  }
  .chapter-inner { width: 100%; max-width: 600px; text-align: center; }
  .chapter-num {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 14px; color: var(--gold); letter-spacing: 0.3em;
    margin-bottom: 14px;
  }
  .chapter-title {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: clamp(32px, 6vw, 48px); margin: 0 0 18px; line-height: 1.2;
  }
  .chapter-sub {
    font-size: 13px; color: var(--ink-soft); line-height: 1.85;
    max-width: 380px; margin: 0 auto 50px;
  }

  /* Chapter I — Fragment 上传 */
  .fragment-zone {
    position: relative; width: 220px; height: 280px; margin: 0 auto;
    border: 1px dashed rgba(212,175,122,0.3);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: all .6s ease; overflow: hidden;
  }
  .fragment-zone:hover { border-color: var(--gold); }
  .fragment-zone .plus {
    font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300;
    color: var(--gold); opacity: 0.8;
  }
  .fragment-zone .hint {
    position: absolute; bottom: 16px; left: 0; right: 0;
    font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-faint);
  }
  .fragment-zone.has-image .plus, .fragment-zone.has-image .hint { display: none; }
  .fragment-orb {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    filter: blur(14px) saturate(1.2);
    transform: scale(1.2);
    opacity: 0;
    transition: opacity 1s ease;
  }
  .fragment-zone.has-image .fragment-orb { opacity: 0.85; }
  .fragment-zone.has-image::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 30%, rgba(10,6,18,0.9) 80%);
  }
  .fragment-status {
    margin-top: 24px; font-size: 11.5px; letter-spacing: 0.2em;
    color: var(--ink-faint); text-transform: uppercase; min-height: 14px;
  }
  .fragment-zone.has-image ~ .fragment-status { color: var(--gold); }
  .skip-link {
    display: inline-block; margin-top: 36px;
    font-size: 10.5px; letter-spacing: 0.3em; color: var(--ink-faint);
    text-transform: uppercase; cursor: pointer;
    border-bottom: 1px solid var(--line); padding-bottom: 4px;
  }
  .skip-link:hover { color: var(--gold); border-color: var(--gold); }

  /* Chapter II — Echo 文字 */
  .echo-input-wrap {
    position: relative; max-width: 480px; margin: 0 auto;
    border-bottom: 1px solid var(--line);
    padding: 16px 0 12px;
    transition: border-color .6s ease;
  }
  .echo-input-wrap:focus-within { border-color: var(--gold); }
  .echo-input {
    width: 100%; background: transparent; border: 0; outline: 0;
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: 22px; color: var(--ink); text-align: center;
    line-height: 1.5; resize: none;
    min-height: 80px;
  }
  .echo-input::placeholder { color: var(--ink-faint); font-style: italic; }
  .echo-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 0 4px; }
  .echo-counter { font-size: 10px; letter-spacing: 0.25em; color: var(--ink-faint); text-transform: uppercase; }

  /* Chapter III — Voice 风格选择 */
  .voices {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
    max-width: 480px; margin: 0 auto 36px;
  }
  .voice {
    position: relative; padding: 22px 16px 20px;
    border: 1px solid var(--line); cursor: pointer;
    transition: all .5s ease; text-align: left;
    background: rgba(255,255,255,0.01);
  }
  .voice:hover { border-color: rgba(212,175,122,0.5); transform: translateY(-2px); }
  .voice.active { border-color: var(--gold); background: rgba(212,175,122,0.05); }
  .voice .swatch {
    width: 28px; height: 28px; border-radius: 50%;
    margin-bottom: 12px; box-shadow: 0 0 16px var(--swatch-color);
  }
  .voice .name {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 17px; color: var(--ink); margin: 0;
  }
  .voice .key {
    font-size: 9px; letter-spacing: 0.3em; color: var(--ink-faint);
    text-transform: uppercase; margin-top: 6px;
  }
  .voice.active .key { color: var(--gold); }

  /* 召唤按钮(沿用入境页风格) */
  .summon-btn {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 16px 38px; border: 1px solid rgba(212,175,122,0.5);
    background: transparent; color: var(--gold);
    font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase;
    cursor: pointer; transition: all .8s cubic-bezier(0.2, 0.8, 0.2, 1);
    font-family: inherit;
  }
  .summon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .summon-btn:not(:disabled):hover { background: rgba(212,175,122,0.08); padding-left: 48px; padding-right: 48px; }

  /* 加载遮罩 */
  .loader-veil {
    position: fixed; inset: 0; background: rgba(5,3,9,0.95);
    z-index: 200; display: none; align-items: center; justify-content: center; flex-direction: column;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .loader-veil.on { display: flex; }
  .loader-orb {
    width: 80px; height: 80px; border-radius: 50%; margin-bottom: 36px;
    background: radial-gradient(circle, var(--violet) 0%, transparent 70%);
    animation: orb-pulse 2.4s ease-in-out infinite;
  }
  @keyframes orb-pulse {
    0%,100% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 1; }
  }
  .loader-text {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 22px; color: var(--ink); transition: opacity 1s ease;
  }
  .loader-sub { margin-top: 16px; font-size: 10px; letter-spacing: 0.4em; color: var(--ink-faint); text-transform: uppercase; }
</style>

<!-- ===== Artistic Layer v6.6: 美术馆级氛围 / 镏金装饰 / 噪点墙面 ===== -->
<style>
  /* === 大氛围: 深紫穹顶 + 金尘 + 织物墙面纹理(对齐 /exhibit 风格) === */
  body {
    background:
      radial-gradient(ellipse 90% 60% at 50% 110%, rgba(60,40,90,0.4) 0%, transparent 60%),
      radial-gradient(ellipse 70% 50% at 50% 0%, rgba(159,122,234,0.18) 0%, transparent 55%),
      radial-gradient(ellipse at 50% 50%, #1a1130 0%, #0a0612 50%, #050309 100%);
    position: relative;
  }
  /* 金尘粒子 (跟随滚动而非固定背景, 否则在长页面上重复明显) */
  body::before {
    content: ''; position: fixed; inset: 0;
    pointer-events: none; z-index: 0; opacity: 0.85;
    background-image:
      radial-gradient(1px 1px at 8% 22%, rgba(212,175,122,0.65), transparent 50%),
      radial-gradient(1.2px 1.2px at 78% 35%, rgba(212,175,122,0.55), transparent 50%),
      radial-gradient(1px 1px at 35% 70%, rgba(212,175,122,0.6), transparent 50%),
      radial-gradient(1.3px 1.3px at 88% 82%, rgba(212,175,122,0.45), transparent 50%),
      radial-gradient(1px 1px at 22% 88%, rgba(212,175,122,0.5), transparent 50%),
      radial-gradient(1px 1px at 60% 12%, rgba(212,175,122,0.5), transparent 50%),
      radial-gradient(0.8px 0.8px at 48% 48%, rgba(245,220,170,0.7), transparent 50%),
      radial-gradient(0.8px 0.8px at 92% 18%, rgba(212,175,122,0.4), transparent 50%),
      radial-gradient(1px 1px at 5% 55%, rgba(212,175,122,0.45), transparent 50%),
      radial-gradient(1px 1px at 70% 92%, rgba(212,175,122,0.5), transparent 50%);
  }
  /* SVG turbulence 噪点墙面材质 */
  body::after {
    content: ''; position: fixed; inset: 0;
    pointer-events: none; z-index: 0; opacity: 0.5;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.83  0 0 0 0 0.68  0 0 0 0 0.48  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    background-size: 240px 240px;
  }
  /* 确保内容浮在 ::before/::after 之上 */
  .progress-bar, .top-nav, .chapter, .loader-veil { position: relative; z-index: 1; }
  .loader-veil { z-index: 200; }
  .top-nav { z-index: 99; }
  .progress-bar { z-index: 100; }

  /* === Chapter 之间的装饰分隔条(每章末尾)=== */
  .chapter + .chapter::before {
    content: '✦';
    position: absolute; top: 0; left: 50%;
    transform: translate(-50%, -50%);
    color: var(--gold); font-size: 14px;
    background: var(--bg-deep);
    padding: 0 16px;
    text-shadow: 0 0 12px rgba(212,175,122,0.5);
  }
  .chapter + .chapter {
    border-top: 1px solid rgba(212,175,122,0.18);
  }

  /* === Chapter 编号: 装饰罗马数字 + 两侧细金线 === */
  .chapter-num {
    display: inline-block !important;
    padding: 0 24px;
    position: relative;
    font-size: 13px !important;
    letter-spacing: 0.45em !important;
  }
  .chapter-num::before, .chapter-num::after {
    content: '';
    position: absolute; top: 50%;
    width: 32px; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold));
    opacity: 0.7;
  }
  .chapter-num::before { right: 100%; transform: translate(0, -50%) scaleX(-1); }
  .chapter-num::after  { left: 100%;  transform: translateY(-50%); }

  /* === Chapter 标题: 装饰首字母下沉(drop cap) === */
  .chapter-title::first-letter {
    font-size: 1.5em;
    color: var(--gold);
    font-style: italic;
    line-height: 0.9;
  }

  /* === Chapter I: Fragment zone 升级为镏金装裱框 + 4 角装饰 === */
  .fragment-zone {
    border: none !important;
    background: rgba(10,6,18,0.4);
    box-shadow:
      0 0 0 1px rgba(212,175,122,0.35),
      0 0 0 4px #0e0a18,
      0 0 0 5px rgba(212,175,122,0.6),
      0 0 0 6px #6e5028,
      0 16px 40px rgba(0,0,0,0.7),
      0 0 60px rgba(159,122,234,0.18) inset;
    width: 240px !important; height: 300px !important;
  }
  .fragment-zone:hover {
    box-shadow:
      0 0 0 1px rgba(245,220,170,0.6),
      0 0 0 4px #0e0a18,
      0 0 0 5px var(--gold),
      0 0 0 6px #8a6534,
      0 22px 60px rgba(0,0,0,0.85),
      0 0 80px rgba(159,122,234,0.3) inset;
  }
  /* 4 角金色 L 形装饰 */
  .fragment-zone::before, .fragment-zone::after {
    content: ''; position: absolute;
    width: 20px; height: 20px;
    border: 1px solid var(--gold);
    pointer-events: none;
  }
  .fragment-zone::before {
    top: 12px; left: 12px;
    border-right: none; border-bottom: none;
  }
  .fragment-zone::after {
    bottom: 12px; right: 12px;
    border-left: none; border-top: none;
  }
  .fragment-zone .plus {
    font-size: 64px !important;
    text-shadow: 0 0 24px rgba(212,175,122,0.5);
    animation: plusBreathe 3s ease-in-out infinite;
  }
  @keyframes plusBreathe {
    0%,100% { opacity: 0.7; transform: scale(1); }
    50%     { opacity: 1.0; transform: scale(1.05); }
  }

  /* === Chapter II: Echo textarea 升级为美术馆铭牌样式 === */
  .echo-input-wrap {
    border-bottom: none !important;
    padding: 32px 30px !important;
    background: rgba(10,6,18,0.35);
    position: relative;
  }
  /* 上下双金线 + 中间宝石点 */
  .echo-input-wrap::before, .echo-input-wrap::after {
    content: ''; position: absolute; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(212,175,122,0.7) 12%, rgba(245,220,170,0.9) 50%, rgba(212,175,122,0.7) 88%, transparent 100%);
  }
  .echo-input-wrap::before { top: 0; }
  .echo-input-wrap::after  { bottom: 0; }
  .echo-input-wrap:focus-within::before,
  .echo-input-wrap:focus-within::after {
    background: linear-gradient(90deg, transparent 0%, rgba(245,220,170,0.95) 12%, #f5dca8 50%, rgba(245,220,170,0.95) 88%, transparent 100%);
    box-shadow: 0 0 12px rgba(245,220,170,0.4);
  }
  /* 左右两侧的小宝石装饰 */
  .echo-input-wrap > .gem-l, .echo-input-wrap > .gem-r {
    position: absolute; top: 50%;
    width: 6px; height: 6px;
    background: radial-gradient(circle, #f5dca8 0%, var(--gold) 60%, #6e5028 100%);
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 8px rgba(245,220,170,0.7);
    pointer-events: none;
  }
  .echo-input-wrap > .gem-l { left: 10px; }
  .echo-input-wrap > .gem-r { right: 10px; }
  /* 输入框首字母 drop cap 当聚焦且有字 */
  .echo-input {
    font-size: 24px !important;
  }

  /* === Chapter III: Voice 卡片升级为美术馆藏品卡 === */
  .voice {
    padding: 24px 18px 22px !important;
    background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.15)) !important;
    border: 1px solid rgba(212,175,122,0.2) !important;
    box-shadow:
      0 4px 16px rgba(0,0,0,0.4),
      0 0 0 1px rgba(0,0,0,0.2) inset;
    transition: all .5s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
  }
  .voice:hover {
    border-color: rgba(212,175,122,0.6) !important;
    transform: translateY(-4px) !important;
    box-shadow:
      0 12px 28px rgba(0,0,0,0.6),
      0 0 30px var(--swatch-color, rgba(212,175,122,0.2)),
      0 0 0 1px rgba(212,175,122,0.3) inset;
  }
  .voice.active {
    border-color: var(--gold) !important;
    background: linear-gradient(180deg, rgba(212,175,122,0.10), rgba(212,175,122,0.04)) !important;
    box-shadow:
      0 8px 24px rgba(0,0,0,0.5),
      0 0 32px var(--swatch-color, rgba(212,175,122,0.35)),
      0 0 0 1px rgba(245,220,170,0.4) inset;
  }
  /* 卡片右上角小角标(藏品编号位) */
  .voice::before {
    content: '✦';
    position: absolute; top: 8px; right: 10px;
    color: rgba(212,175,122,0.3);
    font-size: 10px;
    transition: color .4s ease;
  }
  .voice.active::before { color: var(--gold); }
  .voice .swatch {
    width: 32px !important; height: 32px !important;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.5),
      0 0 0 2px rgba(212,175,122,0.4),
      0 0 20px var(--swatch-color);
  }

  /* === Summon button 升级: 镏金边 + 内呼吸 === */
  .summon-btn {
    position: relative;
    border-width: 1px !important;
    background: linear-gradient(180deg, rgba(212,175,122,0.04), rgba(212,175,122,0.01)) !important;
    box-shadow: 0 0 0 1px rgba(212,175,122,0.2) inset, 0 6px 20px rgba(0,0,0,0.4);
  }
  .summon-btn:not(:disabled)::before, .summon-btn:not(:disabled)::after {
    content: '❋';
    color: var(--gold); opacity: 0.6;
    font-size: 11px;
    transition: opacity .6s ease, transform .6s ease;
  }
  .summon-btn:not(:disabled):hover {
    box-shadow:
      0 0 0 1px var(--gold) inset,
      0 0 30px rgba(212,175,122,0.25),
      0 10px 30px rgba(0,0,0,0.6) !important;
  }
  .summon-btn:not(:disabled):hover::before,
  .summon-btn:not(:disabled):hover::after {
    opacity: 1;
    transform: rotate(180deg);
  }
  .summon-btn:disabled::before, .summon-btn:disabled::after { display: none; }

  /* === Loader 升级: 同心金环 + 中央紫色心跳 === */
  .loader-orb {
    position: relative;
    width: 100px !important; height: 100px !important;
  }
  .loader-orb::before, .loader-orb::after {
    content: '';
    position: absolute; inset: 0;
    border: 1px solid rgba(212,175,122,0.45);
    border-radius: 50%;
    pointer-events: none;
  }
  .loader-orb::before {
    animation: ringSpin 8s linear infinite;
    border-style: dashed;
  }
  .loader-orb::after {
    inset: -16px;
    border-color: rgba(212,175,122,0.25);
    animation: ringSpin 18s linear infinite reverse;
  }
  @keyframes ringSpin { to { transform: rotate(360deg); } }

  /* === Top nav 加点装饰 === */
  .top-nav a, .top-nav span {
    transition: color .4s ease, letter-spacing .4s ease;
  }
  .top-nav a:hover { letter-spacing: 0.4em; }

  /* === Skip link 升级 === */
  .skip-link {
    border-bottom: none !important;
    position: relative; padding: 8px 18px !important;
    transition: color .4s ease, background .4s ease;
  }
  .skip-link::before, .skip-link::after {
    content: ''; position: absolute; top: 50%;
    width: 16px; height: 1px;
    background: rgba(212,175,122,0.4);
    transform: translateY(-50%);
    transition: width .4s ease, background .4s ease;
  }
  .skip-link::before { right: 100%; margin-right: 8px; }
  .skip-link::after  { left:  100%; margin-left:  8px; }
  .skip-link:hover { color: var(--gold) !important; }
  .skip-link:hover::before, .skip-link:hover::after {
    background: var(--gold); width: 24px;
  }
</style>
</head>
<body>

<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

<nav class="top-nav">
  <a href="/">ARise</a>
  <span class="serif-italic" style="text-transform:none; letter-spacing:0.05em;">The Whisper</span>
  <span style="opacity:0.6;">i &middot; ii &middot; iii</span>
</nav>

<!-- Chapter I: Fragment -->
<section class="chapter" id="ch1">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">i. Fragment</div>
    <h2 class="chapter-title">Choose a fragment.</h2>
    <p class="chapter-sub">A photograph — anything. It will not be shown. It will be felt, blurred into color, dissolved into atmosphere.</p>

    <label class="fragment-zone" id="fragmentZone" for="photoInput">
      <div class="fragment-orb" id="fragmentOrb"></div>
      <span class="plus">+</span>
      <span class="hint">Tap to offer</span>
    </label>
    <input type="file" id="photoInput" accept="image/*" style="display:none"/>
    <div class="fragment-status" id="fragmentStatus">&nbsp;</div>

    <div>
      <a class="skip-link" id="skipFragment">Or whisper without one →</a>
    </div>
  </div>
</section>

<!-- Chapter II: Echo -->
<section class="chapter" id="ch2">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">ii. Echo</div>
    <h2 class="chapter-title">Speak its echo.</h2>
    <p class="chapter-sub">One sentence. The shorter, the truer.</p>

    <div class="echo-input-wrap">
      <span class="gem-l"></span>
      <textarea id="echoInput" class="echo-input" rows="2" maxlength="140" placeholder="The summer she taught me to swim…"></textarea>
      <span class="gem-r"></span>
    </div>
    <div class="echo-meta">
      <span class="echo-counter"><span id="echoCount">0</span> / 140</span>
      <span class="echo-counter ink-faint" id="echoState">unwhispered</span>
    </div>
  </div>
</section>

<!-- Chapter III: Voice -->
<section class="chapter" id="ch3">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">iii. Voice</div>
    <h2 class="chapter-title">Choose its voice.</h2>
    <p class="chapter-sub">Every memory has a weather. Pick the one this one wears.</p>

    <div class="voices" id="voices"></div>

    <button id="summonBtn" class="summon-btn" disabled>
      <span>Summon the Echo</span>
      <span>→</span>
    </button>
  </div>
</section>

<div class="loader-veil" id="loaderVeil">
  <div class="loader-orb"></div>
  <div class="loader-text" id="loaderText">A light is descending…</div>
  <div class="loader-sub">Please remain still</div>
</div>

<script>
(() => {
  const VOICES = ${voicesJson};
  const $ = (id) => document.getElementById(id);

  // 状态
  const state = { fragment: null, text: '', voice: null };

  // ---- progress ----
  const progressFill = $('progressFill');
  function updateProgress() {
    const sections = ['ch1','ch2','ch3'].map(id => $(id));
    const winH = window.innerHeight;
    let active = 0;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < winH * 0.5) active = i + 1;
    });
    progressFill.style.width = (active / 3 * 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ---- Chapter I: fragment ----
  const photoInput = $('photoInput');
  const fragmentZone = $('fragmentZone');
  const fragmentOrb = $('fragmentOrb');
  const fragmentStatus = $('fragmentStatus');
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.fragment = ev.target.result;
      fragmentOrb.style.backgroundImage = 'url("' + ev.target.result + '")';
      fragmentZone.classList.add('has-image');
      fragmentStatus.textContent = 'Offered';
      // 自动滚到下一章
      setTimeout(() => $('ch2').scrollIntoView({ behavior: 'smooth' }), 700);
    };
    reader.readAsDataURL(file);
  });
  $('skipFragment').addEventListener('click', (e) => {
    e.preventDefault();
    fragmentStatus.textContent = 'Without form';
    $('ch2').scrollIntoView({ behavior: 'smooth' });
  });

  // ---- Chapter II: echo ----
  const echoInput = $('echoInput');
  const echoCount = $('echoCount');
  const echoState = $('echoState');
  echoInput.addEventListener('input', () => {
    state.text = echoInput.value;
    echoCount.textContent = state.text.length;
    echoState.textContent = state.text.trim() ? 'whispered' : 'unwhispered';
    if (state.text.trim()) echoState.classList.remove('ink-faint'); else echoState.classList.add('ink-faint');
    refreshSummon();
  });

  // ---- Chapter III: voice ----
  const voicesEl = $('voices');
  voicesEl.innerHTML = VOICES.map(v => \`
    <div class="voice" data-key="\${v.key}" style="--swatch-color: \${v.palette}33;">
      <div class="swatch" style="background: \${v.palette};"></div>
      <p class="name">\${v.label}</p>
      <p class="key">\${v.key.replace('-', ' · ')}</p>
    </div>
  \`).join('');
  voicesEl.querySelectorAll('.voice').forEach(el => {
    el.addEventListener('click', () => {
      voicesEl.querySelectorAll('.voice').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      state.voice = el.dataset.key;
      refreshSummon();
    });
  });

  // ---- Summon ----
  const summonBtn = $('summonBtn');
  function refreshSummon() {
    summonBtn.disabled = !(state.text.trim() && state.voice);
  }

  const loaderVeil = $('loaderVeil');
  const loaderText = $('loaderText');
  const LOADER_LINES = [
    'A light is descending…',
    'The wall is warming…',
    'Threads of color are gathering…',
    'A frame is being made…',
    'Almost finished. Stay quiet.',
  ];

  summonBtn.addEventListener('click', async () => {
    if (summonBtn.disabled) return;
    loaderVeil.classList.add('on');
    let li = 0;
    const lt = setInterval(() => {
      li = (li + 1) % LOADER_LINES.length;
      loaderText.style.opacity = '0';
      setTimeout(() => { loaderText.textContent = LOADER_LINES[li]; loaderText.style.opacity = '1'; }, 400);
    }, 3500);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: state.text.trim(), voice: state.voice }),
      });
      const data = await resp.json();
      clearInterval(lt);
      if (!resp.ok) {
        loaderText.textContent = (data.error || 'Something went quiet.') + ' ' + (data.hint || '');
        setTimeout(() => loaderVeil.classList.remove('on'), 3000);
        return;
      }
      // 跳转画廊
      window.location.href = '/gallery/' + data.id;
    } catch (e) {
      clearInterval(lt);
      loaderText.textContent = 'A network silence. Try again.';
      setTimeout(() => loaderVeil.classList.remove('on'), 2500);
    }
  });
})();
</script>

</body>
</html>`)
})

// ===================================================================
// /gallery/:id  · The Reveal 画廊页
// ===================================================================
app.get('/gallery/:id', (c) => {
  const id = c.req.param('id')
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · The Reveal</title>
<style>
  body { background: #050309; }

  /* 揭幕黑场 */
  .curtain {
    position: fixed; inset: 0; background: #050309; z-index: 80;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 1.6s ease 1.6s;
  }
  .curtain.lift { opacity: 0; pointer-events: none; }
  .curtain-text {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 22px; color: var(--ink-soft);
    text-align: center; opacity: 0;
    animation: ct 4s ease forwards;
  }
  @keyframes ct { 0%,100%{opacity:0} 30%,70%{opacity:1} }

  /* 画廊房间 */
  .gallery-room {
    min-height: 100vh; min-height: 100dvh;
    position: relative; overflow: hidden;
    perspective: 1400px;
    display: flex; align-items: center; justify-content: center;
    padding: 120px 24px 60px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(212,175,122,0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(159,122,234,0.12) 0%, transparent 50%),
      #050309;
  }
  /* 顶部射灯光束 */
  .spot {
    position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 800px; max-width: 90vw;
    background: radial-gradient(ellipse at 50% 0%, rgba(245,237,224,0.16) 0%, transparent 60%);
    pointer-events: none; opacity: 0; transition: opacity 2s ease 1.4s;
  }
  .gallery-room.live .spot { opacity: 1; }

  /* 地面反射 */
  .floor {
    position: absolute; bottom: 0; left: 0; right: 0; height: 30vh;
    background: linear-gradient(180deg, transparent, rgba(159,122,234,0.04));
    pointer-events: none;
  }

  /* 粒子尘埃 */
  .dust { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .speck {
    position: absolute; width: 2px; height: 2px; border-radius: 50%;
    background: var(--gold); opacity: 0.5;
    animation: float 18s linear infinite;
  }
  @keyframes float {
    0% { transform: translate(0,0); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.4; }
    100% { transform: translate(40px, -120vh); opacity: 0; }
  }

  /* 顶部状态栏 */
  .top-bar-g {
    position: fixed; top: 22px; left: 0; right: 0; z-index: 50;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 28px; pointer-events: none;
  }
  .top-bar-g a, .top-bar-g span {
    pointer-events: auto;
    font-size: 10.5px; letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--ink-faint);
  }
  .top-bar-g a:hover { color: var(--gold); }

  /* 画框 + 画作 */
  .stage {
    position: relative; z-index: 5;
    display: flex; flex-direction: column; align-items: center;
    transform-style: preserve-3d;
    opacity: 0; transform: translateY(40px);
    transition: opacity 2s ease 2s, transform 2.4s cubic-bezier(0.2,0.8,0.2,1) 2s;
  }
  .gallery-room.live .stage { opacity: 1; transform: translateY(0); }

  .frame-wrap {
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .frame {
    position: relative;
    width: min(360px, 78vw);
    aspect-ratio: 3/4;
    background: #0a0612;
    box-shadow:
      0 0 0 14px #1a1208,
      0 0 0 16px var(--gold),
      0 40px 80px rgba(0,0,0,0.7),
      0 80px 120px rgba(159,122,234,0.18);
    overflow: hidden;
    cursor: zoom-in;
  }
  .frame img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 8s ease;
  }
  .frame:hover img { transform: scale(1.04); }
  /* 内框光泽 */
  .frame::after {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 50% -20%, rgba(245,237,224,0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.4) 0%, transparent 50%);
    pointer-events: none;
  }

  /* 铜质标牌 */
  .plaque {
    margin-top: 56px; max-width: 360px; width: 78vw;
    border: 1px solid rgba(212,175,122,0.4);
    background: linear-gradient(135deg, rgba(212,175,122,0.06), rgba(212,175,122,0.02));
    padding: 22px 24px 24px;
    text-align: left;
    position: relative;
  }
  .plaque::before {
    content: ''; position: absolute; top: -1px; left: 12px; right: 12px; height: 1px;
    background: var(--gold); opacity: 0.7;
  }
  .plaque .num {
    font-size: 9.5px; letter-spacing: 0.32em; text-transform: uppercase;
    color: var(--gold); margin-bottom: 12px;
  }
  .plaque .title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 26px; color: var(--ink); margin: 0 0 8px; line-height: 1.2;
  }
  .plaque .title em { color: var(--gold); font-style: italic; font-weight: 300; }
  .plaque .desc {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 15px; line-height: 1.6; color: var(--ink-soft);
    margin: 0 0 18px;
    overflow: hidden;
    border-bottom: 1px solid var(--line); padding-bottom: 16px;
  }
  .plaque .meta-row { display: flex; justify-content: space-between; align-items: center; }
  .plaque .meta-row .voice-l {
    font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase;
    color: var(--ink-faint);
  }
  .plaque .meta-row .voice-l b { color: var(--ink-soft); font-weight: 400; }
  .plaque .meta-row .swatch-mini {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block;
    margin-right: 8px; vertical-align: middle;
  }

  /* 票券抽屉 */
  .ticket {
    position: fixed; right: 24px; bottom: 24px; z-index: 40;
    width: 280px; max-width: 80vw;
    background: linear-gradient(135deg, #1a0e2c 0%, #0a0612 100%);
    border: 1px solid rgba(212,175,122,0.35);
    padding: 18px 20px;
    transform: translateY(120%); opacity: 0;
    transition: transform 1s cubic-bezier(0.2,0.8,0.2,1) 3.5s, opacity 1s ease 3.5s;
  }
  .gallery-room.live .ticket { transform: translateY(0); opacity: 1; }
  .ticket .tnum { font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); }
  .ticket .ttitle { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 16px; margin: 6px 0 10px; }
  .ticket .tnote { font-size: 11px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed rgba(212,175,122,0.25); }
  .ticket .tactions { display: flex; gap: 8px; }
  .ticket button {
    flex: 1; padding: 9px 8px; background: transparent;
    border: 1px solid rgba(212,175,122,0.4);
    color: var(--gold); font-family: inherit;
    font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase;
    cursor: pointer; transition: all .4s ease;
  }
  .ticket button:hover { background: rgba(212,175,122,0.1); }
  .ticket .copied { color: #b6e3b6 !important; border-color: #b6e3b6 !important; }
  .ticket .close-x {
    position: absolute; top: 6px; right: 10px; font-size: 14px;
    color: var(--ink-faint); cursor: pointer; background: transparent; border: 0; padding: 4px;
  }

  /* 全屏放大 */
  .lightbox {
    position: fixed; inset: 0; background: rgba(5,3,9,0.95);
    backdrop-filter: blur(20px); z-index: 90;
    display: none; align-items: center; justify-content: center; padding: 40px;
  }
  .lightbox.on { display: flex; }
  .lightbox img { max-width: 90%; max-height: 90vh; box-shadow: 0 0 0 12px #1a1208, 0 0 0 14px var(--gold); }
  .lightbox-close {
    position: absolute; top: 24px; right: 28px;
    font-family: 'Cormorant Garamond', serif; font-size: 24px;
    color: var(--ink); cursor: pointer; background: transparent; border: 0;
  }

  /* 错误占位 */
  .error-veil {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 40px; text-align: center;
  }
  .error-veil h2 { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 32px; }
  .error-veil p { color: var(--ink-soft); margin: 12px 0 32px; }
  .error-veil a { color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 4px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; }
</style>
</head>
<body>

<div class="curtain" id="curtain">
  <div class="curtain-text">A light is descending —</div>
</div>

<div class="top-bar-g">
  <a href="/">← ARise</a>
  <span class="serif-italic" style="text-transform:none; letter-spacing:0.05em;">The Reveal</span>
  <a href="/create">+ New Echo</a>
</div>

<main class="gallery-room" id="room">
  <div class="spot"></div>
  <div class="dust" id="dust"></div>
  <div class="floor"></div>

  <div class="stage" id="stage">
    <div class="frame-wrap" id="frameWrap">
      <div class="frame" id="frame">
        <img id="artImg" alt="Echo"/>
      </div>
    </div>

    <div class="plaque">
      <div class="num" id="plaqueNum">№ —</div>
      <h2 class="title" id="plaqueTitle">—</h2>
      <p class="desc" id="plaqueDesc">—</p>
      <div class="meta-row">
        <div class="voice-l">Voice &nbsp; <b id="plaqueVoice">—</b></div>
        <div class="voice-l"><span class="swatch-mini" id="plaqueSwatch"></span><span id="plaqueNote" class="serif-italic" style="text-transform:none; letter-spacing:0.04em; color:var(--ink-soft);">—</span></div>
      </div>
    </div>
  </div>

  <aside class="ticket" id="ticket">
    <button class="close-x" id="ticketClose" aria-label="Close">×</button>
    <div class="tnum">Admit one</div>
    <div class="ttitle" id="ticketTitle">—</div>
    <div class="tnote" id="ticketNote">—</div>
    <div class="tactions">
      <button id="copyBtn">Copy link</button>
      <button id="newBtn">New echo</button>
    </div>
  </aside>
</main>

<div class="lightbox" id="lightbox">
  <button class="lightbox-close" id="lightboxClose">close</button>
  <img id="lightboxImg" alt="Echo full"/>
</div>

<script>
(async () => {
  const $ = (id) => document.getElementById(id);
  const id = ${JSON.stringify(id)};
  const room = $('room');
  const curtain = $('curtain');

  // 粒子尘埃
  const dust = $('dust');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div');
    s.className = 'speck';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = (Math.random() * 50 + 70) + '%';
    s.style.animationDelay = (Math.random() * 18) + 's';
    s.style.animationDuration = (12 + Math.random() * 12) + 's';
    s.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
    dust.appendChild(s);
  }

  // 取数据
  let data = null;
  try {
    const r = await fetch('/api/echo/' + encodeURIComponent(id));
    if (!r.ok) throw new Error('not found');
    data = await r.json();
  } catch (e) {
    document.body.innerHTML = \`
      <div class="error-veil">
        <h2>This echo has dissolved.</h2>
        <p>It may have expired, or the link may be incomplete.</p>
        <a href="/create">Whisper a new one →</a>
      </div>\`;
    return;
  }

  // 注入内容
  $('artImg').src = data.art;
  $('plaqueNum').textContent = data.number;
  $('plaqueTitle').innerHTML = data.title + ' &nbsp; <em>— an Echo</em>';
  $('plaqueDesc').textContent = '"' + data.text + '"';
  $('plaqueVoice').textContent = data.voiceLabel;
  $('plaqueSwatch').style.background = data.palette;
  $('plaqueSwatch').style.boxShadow = '0 0 8px ' + data.palette;
  $('plaqueNote').textContent = data.curatorNote;

  $('ticketTitle').textContent = data.title;
  $('ticketNote').textContent = '— curator’s note: ' + data.curatorNote;

  // 揭幕动画(等图片解码)
  const img = $('artImg');
  const reveal = () => { curtain.classList.add('lift'); room.classList.add('live'); };
  if (img.complete) setTimeout(reveal, 900);
  else { img.addEventListener('load', () => setTimeout(reveal, 900)); img.addEventListener('error', () => setTimeout(reveal, 900)); }

  // 鼠标视差(只对画框)
  const frameWrap = $('frameWrap');
  const onMouse = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    frameWrap.style.transform = \`rotateY(\${x * 6}deg) rotateX(\${-y * 5}deg) translateZ(0)\`;
  };
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', onMouse);
  }
  // 移动端用陀螺仪(可选,不强制)
  window.addEventListener('deviceorientation', (e) => {
    if (!e.beta || !e.gamma) return;
    const x = Math.max(-1, Math.min(1, e.gamma / 30));
    const y = Math.max(-1, Math.min(1, (e.beta - 30) / 30));
    frameWrap.style.transform = \`rotateY(\${x * 6}deg) rotateX(\${-y * 5}deg) translateZ(0)\`;
  });

  // Lightbox
  const lightbox = $('lightbox');
  $('frame').addEventListener('click', () => {
    $('lightboxImg').src = data.art;
    lightbox.classList.add('on');
  });
  $('lightboxClose').addEventListener('click', () => lightbox.classList.remove('on'));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('on'); });

  // Ticket
  $('ticketClose').addEventListener('click', () => $('ticket').style.display = 'none');
  $('newBtn').addEventListener('click', () => location.href = '/create');
  $('copyBtn').addEventListener('click', async () => {
    const url = location.origin + '/echo/' + id;
    try {
      await navigator.clipboard.writeText(url);
      const b = $('copyBtn'); const old = b.textContent;
      b.textContent = '✓ Copied'; b.classList.add('copied');
      setTimeout(() => { b.textContent = old; b.classList.remove('copied'); }, 1800);
    } catch (e) { prompt('Copy this link:', url); }
  });
})();
</script>

</body>
</html>`)
})

// ===================================================================
// /echo/:id  · 分享落地页(走入境光晕,然后跳画廊)
// ===================================================================
app.get('/echo/:id', (c) => {
  const id = c.req.param('id')
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · Someone left you an echo.</title>
<meta http-equiv="refresh" content="3.5;url=/gallery/${id}">
<style>
  body { background: #050309; overflow: hidden; }
  .arrival {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 40px 24px; position: relative;
    background: radial-gradient(circle at 50% 50%, rgba(159,122,234,0.18) 0%, transparent 55%), #050309;
  }
  .halo-s {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at 50% 50%, rgba(212,175,122,0.1) 0%, transparent 35%);
    animation: pulse 4s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
  .arrival h1 {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: clamp(28px, 5vw, 42px);
    margin: 0 0 22px; opacity: 0; animation: fade 1.2s 0.4s forwards;
    max-width: 540px;
  }
  .arrival p {
    color: var(--ink-soft); font-size: 13px; line-height: 1.8; max-width: 420px;
    opacity: 0; animation: fade 1.2s 1.2s forwards; margin: 0 0 36px;
  }
  .arrival .label {
    font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold);
    opacity: 0; animation: fade 1.2s 2s forwards;
  }
  @keyframes fade { to { opacity: 1; } }
  .arrival a { color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 2px; }
</style>
</head>
<body>
<section class="arrival">
  <div class="halo-s"></div>
  <h1>Someone left you an echo.</h1>
  <p>Stand still for a moment.<br/>The wall is being lit on your behalf.</p>
  <div class="label">Entering Gallery №<span style="color:var(--ink-soft);"> ${id}</span> …</div>
  <p style="margin-top:48px; font-size:11px; opacity:0;animation:fade 1.2s 3s forwards;">
    <a href="/gallery/${id}">enter now →</a>
  </p>
</section>
</body>
</html>`)
})

// ===================================================================
// favicon + health
// ===================================================================
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9F7AEA"/><stop offset="100%" stop-color="#D4AF7A"/>
    </linearGradient></defs>
    <rect width="100" height="100" rx="22" fill="#050309"/>
    <path d="M50 18 L82 84 L68 84 L60 66 L40 66 L32 84 L18 84 Z M44 54 L56 54 L50 32 Z" fill="url(#g)"/>
  </svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
})

app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'ARise · Echo Gallery',
  ai_provider: 'cf-workers-ai (L1) → pollinations.ai/flux (L2) → ai-horde (L3) → svg (L4)',
  ai_binding: !!c.env.AI,
  storage: c.env.DB ? 'd1' : (c.env.ECHO_KV ? 'kv' : 'memory'),
  d1_schema_ready: d1SchemaReady,
  d1_backfill_done: d1BackfillDone,
  version: 'v6.8.2-placeholder-cleanup',
}))

// 管理端点: 手动强制回填遗留 createdAt=0 时间戳
//   - 即使 flag 已经是 true 也会再扫一次
//   - 返回扫描/更新行数, 便于诊断
app.post('/api/admin/backfill-ts', async (c) => {
  if (!c.env.DB) return c.json({ error: 'no D1 binding' }, 500)
  await ensureD1Schema(c.env.DB)
  const result = await backfillLegacyTimestamps(c.env.DB, true)
  return c.json({ ok: true, ...result, d1_backfill_done: d1BackfillDone })
})

// 同样支持 GET, 方便浏览器直接打开触发
app.get('/api/admin/backfill-ts', async (c) => {
  if (!c.env.DB) return c.json({ error: 'no D1 binding' }, 500)
  await ensureD1Schema(c.env.DB)
  const result = await backfillLegacyTimestamps(c.env.DB, true)
  return c.json({ ok: true, ...result, d1_backfill_done: d1BackfillDone })
})

// 管理端点: 清理所有 SVG 占位废品 (v6.8 之前 AI Horde 超时产生的)
//   - 判定规则: art 字段以 data:image/svg 开头 = 废品 (真 AI 图都是 JPEG/PNG/WebP)
//   - 默认 dry-run, 不真删, 返回会被删的列表给人工核对
//   - 加 ?execute=1 才真删, 同时清掉 D1 + KV + 内存
//   - 返回各层删除结果, 便于追踪
async function cleanupPlaceholders(env: Bindings, execute: boolean): Promise<any> {
  const out: any = {
    execute,
    scanned: 0,
    placeholder_ids: [] as Array<{ id: string; title: string; art_len: number; art_prefix: string }>,
    d1: { attempted: 0, deleted: 0, errors: [] as string[] },
    kv: { attempted: 0, deleted: 0, errors: [] as string[] },
    mem: { attempted: 0, deleted: 0 },
  }

  if (!env.DB) {
    out.error = 'no D1 binding'
    return out
  }
  await ensureD1Schema(env.DB)

  // 1) 扫描所有 SVG 废品
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, title, art FROM echoes WHERE art LIKE 'data:image/svg%' ORDER BY createdAt DESC"
    ).all<{ id: string; title: string; art: string }>()
    const rows = results ?? []
    out.scanned = rows.length
    out.placeholder_ids = rows.map(r => ({
      id: r.id,
      title: r.title || '',
      art_len: r.art?.length || 0,
      art_prefix: (r.art || '').slice(0, 40),
    }))
  } catch (e) {
    out.error = `scan failed: ${(e as Error)?.message}`
    return out
  }

  if (!execute) {
    out.note = 'dry-run only. Add ?execute=1 to actually delete.'
    return out
  }

  const ids = out.placeholder_ids.map((r: any) => r.id as string)

  // 2) 真删 D1
  for (const id of ids) {
    out.d1.attempted++
    try {
      const res = await env.DB.prepare("DELETE FROM echoes WHERE id = ?").bind(id).run()
      if ((res as any)?.meta?.changes && (res as any).meta.changes > 0) out.d1.deleted++
    } catch (e) {
      out.d1.errors.push(`${id}: ${(e as Error)?.message?.slice(0, 80)}`)
    }
  }

  // 3) 清 KV
  if (env.ECHO_KV) {
    for (const id of ids) {
      out.kv.attempted++
      try {
        await env.ECHO_KV.delete(`echo:${id}`)
        out.kv.deleted++
      } catch (e) {
        out.kv.errors.push(`${id}: ${(e as Error)?.message?.slice(0, 80)}`)
      }
    }
  }

  // 4) 清内存
  for (const id of ids) {
    out.mem.attempted++
    if (memoryStore.delete(id)) out.mem.deleted++
  }

  return out
}

app.get('/api/admin/cleanup-placeholders', async (c) => {
  const execute = c.req.query('execute') === '1'
  const result = await cleanupPlaceholders(c.env, execute)
  c.header('Cache-Control', 'no-store')
  return c.json(result)
})

app.post('/api/admin/cleanup-placeholders', async (c) => {
  const execute = c.req.query('execute') === '1'
  const result = await cleanupPlaceholders(c.env, execute)
  c.header('Cache-Control', 'no-store')
  return c.json(result)
})

// 诊断端点: 测试 D1 真实读写状态 + 自动迁移
app.get('/api/diag/db', async (c) => {
  const out: any = {
    bindings: {
      DB: !!c.env.DB,
      ECHO_KV: !!c.env.ECHO_KV,
      AI: !!c.env.AI,
    },
    memoryStore_size: memoryStore.size,
    memoryStore_keys: Array.from(memoryStore.keys()).slice(0, 5),
  }
  if (c.env.DB) {
    // 强制重跑迁移
    if (new URL(c.req.url).searchParams.get('migrate') === 'force') {
      d1SchemaReady = false
    }
    // 0) 直接读 schema (不依赖 ensureD1Schema 是否成功)
    try {
      const info = await c.env.DB.prepare("PRAGMA table_info(echoes)").all()
      out.d1_schema_before = (info.results ?? []).map((r: any) => `${r.name}:${r.type}`)
    } catch (e: any) {
      out.d1_schema_before_error = e?.message || String(e)
    }
    // 1) 跑迁移
    try {
      await ensureD1Schema(c.env.DB)
      out.d1_schema_ready = d1SchemaReady
    } catch (e: any) {
      out.d1_schema_migration_error = e?.message || String(e)
    }
    // 2) 再读一次 schema
    try {
      const info = await c.env.DB.prepare("PRAGMA table_info(echoes)").all()
      out.d1_schema_after = (info.results ?? []).map((r: any) => `${r.name}:${r.type}`)
    } catch {}
    // 3) 计数
    try {
      const cnt = await c.env.DB.prepare("SELECT COUNT(*) as n FROM echoes").first<{n: number}>()
      out.d1_count = cnt?.n ?? null
    } catch (e: any) {
      out.d1_count_error = e?.message || String(e)
    }
    // 4) 取最近 5 条 (使用 createdAt 排序)
    try {
      const sample = await c.env.DB.prepare("SELECT id, title, voice, createdAt FROM echoes ORDER BY createdAt DESC LIMIT 5").all()
      out.d1_recent = sample.results ?? []
    } catch (e: any) {
      out.d1_recent_error = e?.message || String(e)
    }
    // 5) 活体写读删测试
    try {
      const probeId = 'probe-' + Date.now().toString(36)
      await c.env.DB.prepare("INSERT INTO echoes (id, art, text, voice, title, curatorNote, createdAt) VALUES (?,?,?,?,?,?,?)")
        .bind(probeId, 'data:image/svg+xml,probe', 'probe', 'velvet-midnight', 'probe', 'probe', Date.now()).run()
      const verify = await c.env.DB.prepare("SELECT id FROM echoes WHERE id = ?").bind(probeId).first()
      out.d1_write_test = { id: probeId, readback_ok: !!verify }
      await c.env.DB.prepare("DELETE FROM echoes WHERE id = ?").bind(probeId).run()
    } catch (e: any) {
      out.d1_write_test_error = e?.message || String(e)
    }
  }
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  return c.json(out)
})

// 诊断端点: 把全链路 AI 提供商都打一遍, 报告各自健康状况
//   - 用 ?full=1 才会真的调用 Pollinations (调用一次会消耗 ~5s + 100KB 流量)
//   - 默认只测 L1 (CF Workers AI), 因为它在生产环境本来就常驻
app.get('/api/diag/ai', async (c) => {
  const full = c.req.query('full') === '1'
  const probe = 'a single small red circle on dark background, minimalist'
  const seed = 12345
  const out: any = {
    timestamp: new Date().toISOString(),
    layers: {} as Record<string, any>,
  }

  // === L1: Cloudflare Workers AI ===
  if (c.env.AI) {
    try {
      const t0 = Date.now()
      const aiResp: any = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
        prompt: probe,
        steps: 4,
        seed,
      })
      const ms = Date.now() - t0
      const imgLen = aiResp && typeof aiResp.image === 'string' ? aiResp.image.length : 0
      out.layers.cf_workers_ai = { ok: imgLen > 1000, ms, imgLen, sample: imgLen > 1000 ? aiResp.image.slice(0, 60) + '...' : null }
    } catch (e: any) {
      out.layers.cf_workers_ai = { ok: false, error: (e?.message || String(e)).slice(0, 300) }
    }
  } else {
    out.layers.cf_workers_ai = { ok: false, error: 'AI binding not bound', binding: false }
  }

  // === L2: Pollinations.ai (only if ?full=1) ===
  if (full) {
    try {
      const t0 = Date.now()
      const img = await generateViaPollinations(probe, seed)
      const ms = Date.now() - t0
      out.layers.pollinations = { ok: true, ms, imgLen: img.length, sample: img.slice(0, 60) + '...' }
    } catch (e: any) {
      out.layers.pollinations = { ok: false, error: (e?.message || String(e)).slice(0, 300) }
    }
  } else {
    out.layers.pollinations = { skipped: 'use ?full=1 to test (costs ~5s + 100KB)' }
  }

  // === L3: AI Horde queue depth (lightweight - 只看状态, 不真出图) ===
  try {
    const t0 = Date.now()
    const r = await fetch('https://stablehorde.net/api/v2/status/performance', {
      headers: { 'Client-Agent': 'ARiseGallery:diag:https://arise-echo-gallery-7nz.pages.dev' },
      signal: AbortSignal.timeout(10_000),
    })
    const ms = Date.now() - t0
    if (r.ok) {
      const d: any = await r.json()
      out.layers.ai_horde = {
        ok: true,
        ms,
        queued_requests: d.queued_requests,
        worker_count: d.worker_count,
        queued_megapixelsteps: d.queued_megapixelsteps,
        verdict: d.queued_requests > 100 ? 'overloaded - prefer pollinations' : 'usable',
      }
    } else {
      out.layers.ai_horde = { ok: false, error: `HTTP ${r.status}`, ms }
    }
  } catch (e: any) {
    out.layers.ai_horde = { ok: false, error: (e?.message || String(e)).slice(0, 200) }
  }

  // === L4: SVG fallback - always available ===
  out.layers.svg_placeholder = { ok: true, note: 'always available, last-resort' }

  c.header('Cache-Control', 'no-store')
  return c.json(out)
})

export default app
