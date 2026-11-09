import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { BUCKET, friendlyError, supabase } from '../lib/supabase'
import { processImage } from '../lib/images'
import { uuid } from '../lib/format'
import type {
  Activity, BoardState, Category, Dream, DreamImage, DreamInput, Member, NotificationItem,
} from '../lib/types'
import { useAuth } from './auth'
import { useToast } from './toast'

export interface Focus { x: number; y: number }

export interface Celebration { dreamId: string; title: string; byName: string; at: string; note: string | null }

interface BoardCtx {
  loading: boolean
  error: string | null
  state: BoardState | null
  meId: string
  me: Member | undefined
  partner: Member | undefined
  members: Member[]
  categories: Category[]
  dreams: Dream[]
  notifications: NotificationItem[]
  activities: Activity[]
  unread: number
  celebration: Celebration | null
  dismissCelebration: () => void
  showCelebration: (c: Celebration) => void

  url: (path?: string | null) => string | undefined
  ensureUrls: (paths: (string | null | undefined)[]) => Promise<void>
  refresh: () => Promise<void>
  nameOf: (userId: string | null | undefined) => string
  memberOf: (userId: string | null | undefined) => Member | undefined
  category: (id: string | null) => Category | undefined
  coverOf: (d: Dream) => DreamImage | undefined

  createDream: (input: DreamInput, file: File | null, focus: Focus) => Promise<string>
  updateDream: (id: string, patch: Partial<DreamInput>) => Promise<void>
  replaceCover: (dream: Dream, file: File, focus: Focus) => Promise<void>
  setFocus: (imageId: string, focus: Focus) => Promise<void>
  addImage: (dream: Dream, file: File, kind: 'gallery' | 'achievement') => Promise<void>
  removeImage: (img: DreamImage) => Promise<void>
  deleteDream: (dream: Dream) => Promise<void>
  achieve: (dream: Dream, note: string | null, photo: File | null) => Promise<void>
  reopen: (dream: Dream) => Promise<void>
  comment: (dreamId: string, text: string) => Promise<void>

  saveCategory: (c: { id?: string; name: string; icon: string; tone: number }) => Promise<string>
  deleteCategory: (id: string) => Promise<void>

  saveCouple: (patch: { name?: string; motto?: string | null }) => Promise<void>
  saveProfile: (patch: { display_name?: string }) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>

  invite: (name: string | null, email: string | null) => Promise<{ code: string }>
  cancelInvite: (id: string) => Promise<void>
  leave: () => Promise<void>
  deleteBoard: () => Promise<void>

  markRead: (ids?: string[]) => Promise<void>
}

const Ctx = createContext<BoardCtx | null>(null)

export function describeUpdate(u: Activity, actor: string): string {
  const t = u.dream_title ? `“${u.dream_title}”` : 'um sonho'
  switch (u.kind) {
    case 'created': return `${actor} adicionou um novo sonho: ${t}.`
    case 'updated': return `${actor} atualizou ${t}.`
    case 'value_changed': return `${actor} atualizou os valores de ${t}.`
    case 'image_added': return `${actor} adicionou uma nova fotografia em ${t}.`
    case 'achieved': return `${actor} marcou ${t} como conquistado.`
    case 'reopened': return `${actor} voltou ${t} para o planejamento.`
    case 'comment': return `${actor} escreveu uma observação em ${t}.`
    case 'deleted': return `${actor} removeu ${t} do quadro.`
    case 'member_joined': return `${actor} entrou no quadro.`
    case 'member_left': return `${actor} saiu do quadro.`
    case 'board_created': return `${actor} criou o quadro.`
    default: return `${actor} fez uma atualização.`
  }
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const meId = user!.id

  const [state, setState] = useState<BoardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [urlVersion, bump] = useState(0)

  const urlCache = useRef(new Map<string, { url: string; exp: number }>())
  const stateRef = useRef<BoardState | null>(null)
  stateRef.current = state

  // ---------- URLs assinadas (bucket privado) ----------
  const ensureUrls = useCallback(async (paths: (string | null | undefined)[]) => {
    const now = Date.now()
    const need = [...new Set(paths.filter((p): p is string => !!p))].filter((p) => {
      const c = urlCache.current.get(p)
      return !c || c.exp - now < 5 * 60_000
    })
    if (!need.length) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(need, 3600)
    data?.forEach((d) => {
      if (d.path && d.signedUrl) urlCache.current.set(d.path, { url: d.signedUrl, exp: now + 3_600_000 })
    })
    bump((v) => v + 1)
  }, [])

  const url = useCallback((p?: string | null) => (p ? urlCache.current.get(p)?.url : undefined), [])

  // ---------- Carregamento ----------
  const loadFeed = useCallback(async () => {
    const [n, a] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, read_at, created_at, update:dream_updates!inner(id, couple_id, dream_id, actor_id, kind, dream_title, body, meta, created_at)')
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('dream_updates')
        .select('id, couple_id, dream_id, actor_id, kind, dream_title, body, meta, created_at')
        .neq('kind', 'sync')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    if (!n.error && n.data) setNotifications(n.data as unknown as NotificationItem[])
    if (!a.error && a.data) setActivities(a.data as Activity[])
  }, [])

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_board_state')
    if (err) {
      setError(friendlyError(err))
      setLoading(false)
      return
    }
    const s = data as BoardState
    setState(s)
    setError(null)
    setLoading(false)
    const paths: string[] = []
    s.dreams?.forEach((d) => d.images.forEach((i) => paths.push(i.thumb_path ?? i.path)))
    s.members?.forEach((m) => m.avatar_path && paths.push(m.avatar_path))
    if (s.me.avatar_path) paths.push(s.me.avatar_path)
    void ensureUrls(paths)
    void loadFeed()
  }, [ensureUrls, loadFeed])

  const refreshTimer = useRef<number>()
  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => { void refresh() }, 250)
  }, [refresh])

  useEffect(() => { void refresh() }, [refresh])

  // renova URLs e dados ao voltar para a aba
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') scheduleRefresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', scheduleRefresh)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', scheduleRefresh)
    }
  }, [scheduleRefresh])

  const coupleId = state?.couple?.id
  const nameOfRef = useRef<(id: string | null | undefined) => string>(() => 'Seu par')

  // ---------- Tempo real ----------
  useEffect(() => {
    if (!coupleId) return
    const channel = supabase
      .channel(`quadro:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dream_updates', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const u = payload.new as Activity
          scheduleRefresh()
          if (u.actor_id && u.actor_id !== meId && u.kind !== 'sync' && u.kind !== 'board_created') {
            const who = nameOfRef.current(u.actor_id)
            toast(describeUpdate(u, who), { tone: 'info' })
            if (u.kind === 'achieved' && u.dream_id) {
              setCelebration({ dreamId: u.dream_id, title: u.dream_title ?? 'Um sonho', byName: who, at: u.created_at, note: u.body })
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${meId}` },
        () => { void loadFeed() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [coupleId, meId, scheduleRefresh, loadFeed, toast])

  // ---------- Seletores ----------
  const members = state?.members ?? []
  const me = members.find((m) => m.user_id === meId)
  const partner = members.find((m) => m.user_id !== meId)
  const categories = state?.categories ?? []
  const dreams = state?.dreams ?? []

  const memberOf = useCallback((id: string | null | undefined) => members.find((m) => m.user_id === id), [members])
  const nameOf = useCallback((id: string | null | undefined) => {
    if (!id) return 'Alguém'
    if (id === meId) return 'Você'
    return members.find((m) => m.user_id === id)?.display_name ?? 'Seu par'
  }, [members, meId])
  nameOfRef.current = (id) => members.find((m) => m.user_id === id)?.display_name ?? 'Seu par'

  const category = useCallback((id: string | null) => categories.find((c) => c.id === id), [categories])
  const coverOf = useCallback((d: Dream) => d.images.find((i) => i.kind === 'cover'), [])

  // ---------- Upload ----------
  const upload = useCallback(async (dreamId: string, file: File) => {
    const cid = stateRef.current?.couple?.id
    if (!cid) throw new Error('Quadro não encontrado.')
    const p = await processImage(file)
    const base = `${cid}/${dreamId}/${uuid()}`
    const path = `${base}.jpg`
    const thumb = `${base}_t.jpg`
    const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }
    const [a, b] = await Promise.all([
      supabase.storage.from(BUCKET).upload(path, p.full, opts),
      supabase.storage.from(BUCKET).upload(thumb, p.thumb, opts),
    ])
    if (a.error || b.error) {
      await supabase.storage.from(BUCKET).remove([path, thumb])
      throw a.error ?? b.error
    }
    return { path, thumb_path: thumb, width: p.width, height: p.height }
  }, [])

  const removeFiles = useCallback(async (paths: (string | null)[]) => {
    const list = paths.filter((p): p is string => !!p)
    if (list.length) await supabase.storage.from(BUCKET).remove(list)
  }, [])

  // ---------- Sonhos ----------
  const createDream = useCallback<BoardCtx['createDream']>(async (input, file, focus) => {
    const cid = stateRef.current!.couple!.id
    const id = uuid()
    let up: Awaited<ReturnType<typeof upload>> | null = null
    try {
      if (file) up = await upload(id, file)
      const { error: e1 } = await supabase.from('dreams').insert({ id, couple_id: cid, ...input })
      if (e1) throw e1
      if (up) {
        const { error: e2 } = await supabase.from('dream_images').insert({
          couple_id: cid, dream_id: id, kind: 'cover', ...up,
          focus_x: focus.x, focus_y: focus.y, created_by: meId,
        })
        if (e2) {
          await supabase.from('dreams').delete().eq('id', id)
          throw e2
        }
      }
    } catch (e) {
      if (up) await removeFiles([up.path, up.thumb_path])
      throw new Error(friendlyError(e))
    }
    await refresh()
    return id
  }, [upload, removeFiles, refresh, meId])

  const updateDream = useCallback<BoardCtx['updateDream']>(async (id, patch) => {
    const { error: e } = await supabase.from('dreams').update(patch).eq('id', id)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const replaceCover = useCallback<BoardCtx['replaceCover']>(async (dream, file, focus) => {
    const cid = stateRef.current!.couple!.id
    const old = dream.images.find((i) => i.kind === 'cover')
    let up: Awaited<ReturnType<typeof upload>> | null = null
    try {
      up = await upload(dream.id, file)
      if (old) {
        const { error: e } = await supabase.from('dream_images')
          .update({ ...up, focus_x: focus.x, focus_y: focus.y }).eq('id', old.id)
        if (e) throw e
        await removeFiles([old.path, old.thumb_path])
      } else {
        const { error: e } = await supabase.from('dream_images').insert({
          couple_id: cid, dream_id: dream.id, kind: 'cover', ...up,
          focus_x: focus.x, focus_y: focus.y, created_by: meId,
        })
        if (e) throw e
      }
    } catch (e) {
      if (up) await removeFiles([up.path, up.thumb_path])
      throw new Error(friendlyError(e))
    }
    await refresh()
  }, [upload, removeFiles, refresh, meId])

  const setFocus = useCallback<BoardCtx['setFocus']>(async (imageId, focus) => {
    const { error: e } = await supabase.from('dream_images')
      .update({ focus_x: focus.x, focus_y: focus.y }).eq('id', imageId)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const addImage = useCallback<BoardCtx['addImage']>(async (dream, file, kind) => {
    const cid = stateRef.current!.couple!.id
    let up: Awaited<ReturnType<typeof upload>> | null = null
    try {
      up = await upload(dream.id, file)
      const { error: e } = await supabase.from('dream_images').insert({
        couple_id: cid, dream_id: dream.id, kind, ...up, created_by: meId,
      })
      if (e) throw e
    } catch (e) {
      if (up) await removeFiles([up.path, up.thumb_path])
      throw new Error(friendlyError(e))
    }
    await refresh()
  }, [upload, removeFiles, refresh, meId])

  const removeImage = useCallback<BoardCtx['removeImage']>(async (img) => {
    const { error: e } = await supabase.from('dream_images').delete().eq('id', img.id)
    if (e) throw new Error(friendlyError(e))
    await removeFiles([img.path, img.thumb_path])
    await refresh()
  }, [removeFiles, refresh])

  const deleteDream = useCallback<BoardCtx['deleteDream']>(async (dream) => {
    const { error: e } = await supabase.from('dreams').delete().eq('id', dream.id)
    if (e) throw new Error(friendlyError(e))
    await removeFiles(dream.images.flatMap((i) => [i.path, i.thumb_path]))
    await refresh()
  }, [removeFiles, refresh])

  const achieve = useCallback<BoardCtx['achieve']>(async (dream, note, photo) => {
    const { error: e } = await supabase.from('dreams')
      .update({ status: 'achieved', achievement_note: note?.trim() || null }).eq('id', dream.id)
    if (e) throw new Error(friendlyError(e))
    if (photo) await addImage(dream, photo, 'achievement')
    else await refresh()
  }, [addImage, refresh])

  const reopen = useCallback<BoardCtx['reopen']>(async (dream) => {
    const { error: e } = await supabase.from('dreams').update({ status: 'planning' }).eq('id', dream.id)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const comment = useCallback<BoardCtx['comment']>(async (dreamId, text) => {
    const d = stateRef.current!.dreams.find((x) => x.id === dreamId)
    const { error: e } = await supabase.from('dream_updates').insert({
      couple_id: stateRef.current!.couple!.id, dream_id: dreamId, actor_id: meId,
      kind: 'comment', dream_title: d?.title ?? null, body: text.trim(),
    })
    if (e) throw new Error(friendlyError(e))
    await loadFeed()
  }, [loadFeed, meId])

  // ---------- Categorias ----------
  const saveCategory = useCallback<BoardCtx['saveCategory']>(async (c) => {
    const cid = stateRef.current!.couple!.id
    const name = c.name.trim()
    if (!name) throw new Error('Dê um nome à categoria.')
    let id = c.id ?? ''
    let err: { code?: string; message?: string } | null = null
    if (c.id) {
      const r = await supabase.from('dream_categories').update({ name, icon: c.icon, tone: c.tone }).eq('id', c.id)
      err = r.error
    } else {
      const r = await supabase.from('dream_categories').insert({
        couple_id: cid, name, icon: c.icon, tone: c.tone,
        sort_order: (stateRef.current!.categories.at(-1)?.sort_order ?? 0) + 1,
      }).select('id').single()
      err = r.error
      id = (r.data as { id: string } | null)?.id ?? ''
    }
    if (err) {
      if (err.code === '23505') throw new Error('Já existe uma categoria com este nome.')
      throw new Error(friendlyError(err))
    }
    await refresh()
    return id
  }, [refresh])

  const deleteCategory = useCallback<BoardCtx['deleteCategory']>(async (id) => {
    const { error: e } = await supabase.from('dream_categories').delete().eq('id', id)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  // ---------- Casal, perfil, convites ----------
  const saveCouple = useCallback<BoardCtx['saveCouple']>(async (patch) => {
    const { error: e } = await supabase.from('couples').update(patch).eq('id', stateRef.current!.couple!.id)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const saveProfile = useCallback<BoardCtx['saveProfile']>(async (patch) => {
    const { error: e } = await supabase.from('profiles').update(patch).eq('id', meId)
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh, meId])

  const uploadAvatar = useCallback<BoardCtx['uploadAvatar']>(async (file) => {
    const cid = stateRef.current!.couple!.id
    const p = await processImage(file)
    const path = `${cid}/avatars/${meId}-${Date.now()}.jpg`
    const { error: e1 } = await supabase.storage.from(BUCKET).upload(path, p.thumb, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (e1) throw new Error(friendlyError(e1))
    const oldPath = stateRef.current!.me.avatar_path
    const { error: e2 } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', meId)
    if (e2) { await removeFiles([path]); throw new Error(friendlyError(e2)) }
    if (oldPath) await removeFiles([oldPath])
    await refresh()
  }, [meId, refresh, removeFiles])

  const invite = useCallback<BoardCtx['invite']>(async (name, email) => {
    const { data, error: e } = await supabase.rpc('create_invitation', {
      p_invited_name: name, p_invited_email: email,
    })
    if (e) throw new Error(friendlyError(e))
    await refresh()
    return { code: (data as { code: string }).code }
  }, [refresh])

  const cancelInvite = useCallback<BoardCtx['cancelInvite']>(async (id) => {
    const { error: e } = await supabase.rpc('cancel_invitation', { p_id: id })
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const leave = useCallback<BoardCtx['leave']>(async () => {
    const { error: e } = await supabase.rpc('leave_couple')
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [refresh])

  const listAll = useCallback(async (prefix: string): Promise<string[]> => {
    const out: string[] = []
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
    for (const o of data ?? []) {
      if (o.id) out.push(`${prefix}/${o.name}`)
      else out.push(...(await listAll(`${prefix}/${o.name}`)))
    }
    return out
  }, [])

  const deleteBoard = useCallback<BoardCtx['deleteBoard']>(async () => {
    const cid = stateRef.current!.couple!.id
    const files = await listAll(cid)
    for (let i = 0; i < files.length; i += 100) await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100))
    const { error: e } = await supabase.rpc('delete_board')
    if (e) throw new Error(friendlyError(e))
    await refresh()
  }, [listAll, refresh])

  // ---------- Notificações ----------
  const markRead = useCallback<BoardCtx['markRead']>(async (ids) => {
    const now = new Date().toISOString()
    let q = supabase.from('notifications').update({ read_at: now }).is('read_at', null)
    if (ids?.length) q = q.in('id', ids)
    await q
    setNotifications((l) => l.map((n) => (!ids || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)))
  }, [])

  const unread = notifications.filter((n) => !n.read_at).length

  const value: BoardCtx = {
    loading, error, state, meId, me, partner, members, categories, dreams,
    notifications, activities, unread,
    celebration, dismissCelebration: () => setCelebration(null), showCelebration: setCelebration,
    url, ensureUrls, refresh, nameOf, memberOf, category, coverOf,
    createDream, updateDream, replaceCover, setFocus, addImage, removeImage, deleteDream,
    achieve, reopen, comment, saveCategory, deleteCategory,
    saveCouple, saveProfile, uploadAvatar, invite, cancelInvite, leave, deleteBoard, markRead,
  }

  const memo = useMemo(() => value, // eslint-disable-line react-hooks/exhaustive-deps
    [state, loading, error, notifications, activities, celebration, urlVersion, unread])
  return <Ctx.Provider value={memo}>{children}</Ctx.Provider>
}

export function useBoard() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useBoard fora do BoardProvider')
  return c
}
