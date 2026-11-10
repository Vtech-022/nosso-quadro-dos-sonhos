/**
 * Modo demonstração: um "Supabase" em miniatura que roda inteiro no navegador.
 * Implementa só o que o app usa (auth, tabelas, RPCs, storage, realtime) e guarda
 * tudo no localStorage / IndexedDB do visitante. Nada sai do aparelho.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>
type Db = Record<string, Row[]>

const KEY = 'nqs-demo-db-v1'
const SESSION = 'nqs-demo-session'
const CID = 'demo-couple'
const ME = 'demo-victor'
const PARTNER = 'demo-marina'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const nowIso = () => new Date().toISOString()
const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString()

/* ---------------- Dados de exemplo ---------------- */
function seed(): Db {
  const cats = [
    ['Viagens e experiências', 'plane'], ['Casa e imóveis', 'house'], ['Carros e transportes', 'car'],
    ['Investimentos e finanças', 'trending-up'], ['Móveis e decoração', 'sofa'], ['Casamento e família', 'gem'],
    ['Estudos e carreira', 'graduation-cap'], ['Experiências a dois', 'heart'], ['Estilo de vida', 'globe'], ['Outros sonhos', 'star'],
  ].map(([name, icon], i) => ({ id: 'k' + i, couple_id: CID, name, icon, tone: i % 8, sort_order: i, is_default: true }))
  const img = (dream: string, file: string, w: number, h: number) => ({
    id: 'i-' + dream, couple_id: CID, dream_id: dream, kind: 'cover', path: `demo/${file}.jpg`, thumb_path: `demo/${file}.jpg`,
    width: w, height: h, focus_x: 50, focus_y: 50, created_by: ME, created_at: ago(3),
  })
  const D = (id: string, title: string, o: Row): Row => ({
    id, couple_id: CID, title, description: null, category_id: null, status: 'planning', estimated_value: null, saved_value: null,
    target_date: null, format: 'quadrado', created_by: ME, updated_by: PARTNER, created_at: ago(10), updated_at: ago(2),
    achieved_at: null, achieved_by: null, achievement_note: null, ...o,
  })
  const dreams = [
    D('d1', 'Nossa casa com varanda', { description: 'Perto do parque, com espaço para um escritório e uma varanda para o café da manhã.', category_id: 'k1', estimated_value: 450000, saved_value: 35000, target_date: '2029-06-01', format: 'destaque', created_at: ago(40) }),
    D('d2', 'Paris, só nós dois', { category_id: 'k0', status: 'achieved', estimated_value: 28000, saved_value: 28000, format: 'retrato', achieved_at: ago(20), achieved_by: PARTNER, achievement_note: 'Subimos a torre ao pôr do sol e choramos de rir no metrô.', created_at: ago(90) }),
    D('d3', 'Carro novo', { category_id: 'k2', estimated_value: 90000, saved_value: 12000, target_date: '2027-12-01', format: 'paisagem', created_at: ago(30) }),
    D('d4', 'Nosso casamento', { category_id: 'k5', status: 'achieved', format: 'quadrado', achieved_at: ago(200), achieved_by: ME, achievement_note: 'O melhor dia das nossas vidas.', created_at: ago(300) }),
    D('d5', 'Reserva para imprevistos', { category_id: 'k3', estimated_value: 100000, saved_value: 40000, target_date: '2027-03-01', format: 'paisagem', created_at: ago(25) }),
    D('d6', 'Curso de especialização', { category_id: 'k6', target_date: '2027-08-01', format: 'retrato', created_at: ago(15) }),
    D('d7', 'Japão na primavera', { category_id: 'k0', estimated_value: 42000, saved_value: 9000, target_date: '2028-04-01', format: 'quadrado', created_at: ago(8) }),
    D('d8', 'Semana na praia', { category_id: 'k7', format: 'paisagem', created_at: ago(4) }),
    D('d9', 'Adotar um cachorro', { category_id: 'k8', format: 'quadrado', created_at: ago(2) }),
  ]
  const images = [
    img('d1', 'casa', 1600, 1200), img('d2', 'paris', 1200, 1600), img('d3', 'carro', 1600, 1000), img('d4', 'casamento', 1200, 1200),
    img('d5', 'reserva', 1600, 1000), img('d6', 'curso', 1200, 1500), img('d7', 'japao', 1500, 1500), img('d8', 'praia', 1600, 1100),
  ]
  const act = (id: string, kind: string, o: Row) => ({ id, couple_id: CID, dream_id: null, actor_id: PARTNER, kind, dream_title: null, body: null, meta: {}, created_at: ago(1), ...o })
  const updates = [
    act('a1', 'created', { dream_id: 'd9', dream_title: 'Adotar um cachorro', created_at: ago(0, 1) }),
    act('a2', 'value_changed', { dream_id: 'd7', dream_title: 'Japão na primavera', actor_id: ME, created_at: ago(0, 5) }),
    act('a3', 'comment', { dream_id: 'd1', dream_title: 'Nossa casa com varanda', body: 'Vi um terreno ótimo perto do parque, vamos visitar no sábado?', created_at: ago(1) }),
    act('a4', 'achieved', { dream_id: 'd2', dream_title: 'Paris, só nós dois', body: 'Subimos a torre ao pôr do sol.', created_at: ago(20) }),
  ]
  return {
    profiles: [
      { id: ME, display_name: 'Victor', email: 'victor@exemplo.com', avatar_path: null },
      { id: PARTNER, display_name: 'Marina', email: 'marina@exemplo.com', avatar_path: null },
    ],
    couples: [{ id: CID, name: 'Victor & Marina', motto: null, created_at: ago(300) }],
    couple_members: [
      { couple_id: CID, user_id: ME, role: 'owner', joined_at: ago(300) },
      { couple_id: CID, user_id: PARTNER, role: 'partner', joined_at: ago(299) },
    ],
    dream_categories: cats, dreams, dream_images: images, dream_updates: updates,
    notifications: [
      { id: 'n1', user_id: ME, update_id: 'a1', read_at: null, created_at: updates[0].created_at },
      { id: 'n2', user_id: ME, update_id: 'a3', read_at: null, created_at: updates[2].created_at },
      { id: 'n3', user_id: ME, update_id: 'a4', read_at: ago(3), created_at: updates[3].created_at },
    ],
    invitations: [],
  }
}

let db: Db = load()  // sem armazenamento disponível, a demo roda só em memória
function load(): Db {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) } catch { /* ignora */ }
  return seed()
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* cota cheia */ } }

export function demoReset(mode: 'examples' | 'empty') {
  db = seed()
  if (mode === 'empty') { db.dreams = []; db.dream_images = []; db.dream_updates = []; db.notifications = [] }
  save()
  void idbClear()
  window.location.reload()
}

/* ---------------- Armazenamento de imagens (IndexedDB) ---------------- */
const idb = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  if (typeof indexedDB === 'undefined') return rej(new Error('sem IndexedDB'))
  const r = indexedDB.open('nqs-demo', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('files')
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const idbDo = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const d = await idb()
  return new Promise((res, rej) => { const rq = fn(d.transaction('files', mode).objectStore('files')); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error) })
}
const idbClear = () => idbDo('readwrite', (s) => s.clear()).catch(() => undefined)
const blobUrls = new Map<string, string>()
const memFiles = new Map<string, Blob>()

const storage = {
  from: (_bucket: string) => ({
    async upload(path: string, body: Blob) { memFiles.set(path, body); await idbDo('readwrite', (s) => s.put(body, path)).catch(() => undefined); return { data: { path }, error: null } },
    async remove(paths: string[]) { for (const p of paths) memFiles.delete(p); for (const p of paths) await idbDo('readwrite', (s) => s.delete(p)).catch(() => undefined); return { data: [], error: null } },
    async createSignedUrls(paths: string[]) {
      const data: { path: string; signedUrl: string | null }[] = []
      for (const p of paths) {
        if (p.startsWith('demo/')) { data.push({ path: p, signedUrl: `${import.meta.env.BASE_URL}${p}` }); continue }
        let u = blobUrls.get(p)
        if (!u) {
          const b = memFiles.get(p) ?? ((await idbDo('readonly', (s) => s.get(p)).catch(() => undefined)) as Blob | undefined)
          if (b) { u = URL.createObjectURL(b); blobUrls.set(p, u) }
        }
        data.push({ path: p, signedUrl: u ?? null })
      }
      return { data, error: null }
    },
    async list() { return { data: [], error: null } },
  }),
}

/* ---------------- Consulta tipo PostgREST ---------------- */
const err = (message: string, code?: string) => ({ message, code })
type Filter = (r: Row) => boolean

class Query implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row = {}
  private filters: Filter[] = []
  private ord: { col: string; asc: boolean } | null = null
  private lim = Infinity
  private wantSingle = false
  private returning = false
  constructor(private table: string) {}
  select(_cols?: string) { if (this.op !== 'select') this.returning = true; return this }
  insert(p: Row) { this.op = 'insert'; this.payload = p; return this }
  update(p: Row) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this }
  is(c: string, v: any) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this }
  in(c: string, v: any[]) { this.filters.push((r) => v.includes(r[c])); return this }
  order(col: string, o?: { ascending?: boolean }) { this.ord = { col, asc: o?.ascending !== false }; return this }
  limit(n: number) { this.lim = n; return this }
  single() { this.wantSingle = true; return this }

  then<A, B>(ok?: (v: any) => A | PromiseLike<A>, bad?: (e: any) => B | PromiseLike<B>) {
    return Promise.resolve().then(() => this.run()).then(ok, bad)
  }

  private run() {
    const t = this.table
    const rows = (db[t] ??= [])
    const match = (r: Row) => this.filters.every((f) => f(r))
    try {
      if (this.op === 'select') {
        let out = rows.filter(match)
        if (t === 'notifications') {
          out = out.filter((r) => r.user_id === ME).map((n) => ({ ...n, update: db.dream_updates.find((u) => u.id === n.update_id) })).filter((n) => n.update)
        }
        if (this.ord) { const { col, asc } = this.ord; out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1)) }
        out = out.slice(0, this.lim).map((r) => ({ ...r }))
        return this.wantSingle ? { data: out[0] ?? null, error: out[0] ? null : err('not found') } : { data: out, error: null }
      }
      if (this.op === 'insert') {
        const row: Row = { id: uid(), created_at: nowIso(), ...this.payload }
        if (t === 'dream_categories' && rows.some((c) => c.couple_id === row.couple_id && c.name.toLowerCase() === String(row.name).toLowerCase())) return { data: null, error: err('duplicate', '23505') }
        if (t === 'dreams') { row.updated_at = row.created_at; row.updated_by = ME; row.created_by = ME; row.achieved_at = null; row.achieved_by = null; row.achievement_note = null }
        rows.push(row)
        sideEffects(t, 'insert', row, null)
        save()
        return this.wantSingle ? { data: { ...row }, error: null } : { data: this.returning ? [{ ...row }] : null, error: null }
      }
      if (this.op === 'update') {
        for (const r of rows.filter(match)) {
          const before = { ...r }
          Object.assign(r, this.payload)
          if (t === 'dreams') {
            r.updated_at = nowIso(); r.updated_by = ME
            if (this.payload.status === 'achieved' && before.status !== 'achieved') { r.achieved_at = nowIso(); r.achieved_by = ME }
            if (this.payload.status === 'planning') { r.achieved_at = null; r.achieved_by = null; r.achievement_note = null }
          }
          sideEffects(t, 'update', r, before)
        }
        save()
        return { data: null, error: null }
      }
      const gone = rows.filter(match)
      db[t] = rows.filter((r) => !match(r))
      for (const r of gone) sideEffects(t, 'delete', r, null)
      save()
      return { data: null, error: null }
    } catch (e) { return { data: null, error: err((e as Error).message) } }
  }
}

function log(kind: string, dream: Row | null, extra: Row = {}) {
  db.dream_updates.push({ id: uid(), couple_id: CID, dream_id: dream?.id ?? null, actor_id: ME, kind, dream_title: dream?.title ?? null, body: null, meta: {}, created_at: nowIso(), ...extra })
}
function sideEffects(t: string, op: 'insert' | 'update' | 'delete', row: Row, before: Row | null) {
  if (t === 'dreams') {
    if (op === 'insert') log('created', row)
    if (op === 'update' && before) {
      if (row.status === 'achieved' && before.status !== 'achieved') log('achieved', row, { body: row.achievement_note })
      else if (row.status === 'planning' && before.status === 'achieved') log('reopened', row)
      else if (row.saved_value !== before.saved_value || row.estimated_value !== before.estimated_value) log('value_changed', row)
      else log('updated', row)
    }
    if (op === 'delete') { db.dream_images = db.dream_images.filter((i) => i.dream_id !== row.id); log('deleted', row, { dream_id: null }) }
  }
  if (t === 'dream_images' && op === 'insert') log('image_added', db.dreams.find((d) => d.id === row.dream_id) ?? null)
}

/* ---------------- RPCs ---------------- */
function boardState() {
  const dreams = [...db.dreams].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((d) => ({ ...d, images: db.dream_images.filter((i) => i.dream_id === d.id).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)) }))
  const members = db.couple_members.map((m) => { const p = db.profiles.find((x) => x.id === m.user_id)!; return { user_id: m.user_id, role: m.role, joined_at: m.joined_at, display_name: p.display_name, email: p.email, avatar_path: p.avatar_path } })
  const inv = db.invitations.find((i) => i.status === 'pending') ?? null
  return {
    me: db.profiles.find((p) => p.id === ME), couple: db.couples[0] ?? null, members,
    categories: [...db.dream_categories].sort((a, b) => a.sort_order - b.sort_order), dreams, invitation: inv,
  }
}
const rpcs: Record<string, (a: Row) => { data: any; error: any }> = {
  get_board_state: () => ({ data: boardState(), error: null }),
  my_incoming_invitations: () => ({ data: [], error: null }),
  invitation_preview: () => ({ data: null, error: err('Este é o modo demonstração: convites reais funcionam na versão com Supabase.') }),
  accept_invitation: () => ({ data: null, error: err('Convites reais funcionam na versão com Supabase.') }),
  decline_invitation: () => ({ data: null, error: null }),
  create_couple: () => ({ data: null, error: null }),
  create_invitation: (a) => {
    db.invitations.forEach((i) => { if (i.status === 'pending') i.status = 'canceled' })
    const inv = { id: uid(), couple_id: CID, invited_name: a.p_invited_name, invited_email: a.p_invited_email, code: Math.random().toString(36).slice(2, 10).toUpperCase(), status: 'pending', expires_at: ago(-7), created_at: nowIso() }
    db.invitations.push(inv); save(); return { data: inv, error: null }
  },
  cancel_invitation: (a) => { const i = db.invitations.find((x) => x.id === a.p_id); if (i) i.status = 'canceled'; save(); return { data: null, error: null } },
  leave_couple: () => { demoReset('examples'); return { data: null, error: null } },
  delete_board: () => { demoReset('empty'); return { data: null, error: null } },
}

/* ---------------- Auth ---------------- */
type Cb = (event: string, session: any) => void
const listeners = new Set<Cb>()
const mkSession = () => ({
  access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
  user: { id: ME, aud: 'authenticated', role: 'authenticated', email: 'victor@exemplo.com', app_metadata: {}, user_metadata: { display_name: 'Victor' }, created_at: ago(300) },
})
let memSession = 'in'
const getSess = () => { try { return localStorage.getItem(SESSION) ?? memSession } catch { return memSession } }
const setSess = (v: string) => { memSession = v; try { localStorage.setItem(SESSION, v) } catch { /* sem armazenamento */ } }
const signedIn = () => getSess() !== 'out'
const emit = (e: string) => { const s = signedIn() ? mkSession() : null; listeners.forEach((cb) => cb(e, s)) }
const auth = {
  async getSession() { return { data: { session: signedIn() ? mkSession() : null }, error: null } },
  onAuthStateChange(cb: Cb) {
    listeners.add(cb)
    queueMicrotask(() => cb('INITIAL_SESSION', signedIn() ? mkSession() : null))
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  },
  async signInWithPassword() { setSess('in'); emit('SIGNED_IN'); return { data: { session: mkSession() }, error: null } },
  async signUp() { setSess('in'); emit('SIGNED_IN'); return { data: { session: mkSession() }, error: null } },
  async signOut() { setSess('out'); emit('SIGNED_OUT'); return { error: null } },
  async resetPasswordForEmail() { return { data: {}, error: null } },
  async updateUser() { return { data: {}, error: null } },
}

/* ---------------- Tempo real (não necessário: só um aparelho) ---------------- */
const channel = () => { const c: any = { on: () => c, subscribe: () => c }; return c }

export const demoClient: any = {
  auth, storage,
  from: (t: string) => new Query(t),
  rpc: (name: string, args: Row = {}) => Promise.resolve().then(() => (rpcs[name] ? rpcs[name](args) : { data: null, error: err('rpc desconhecida: ' + name) })),
  channel, removeChannel: () => Promise.resolve('ok'),
}
