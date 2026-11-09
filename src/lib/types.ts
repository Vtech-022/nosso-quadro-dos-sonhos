export type DreamStatus = 'planning' | 'achieved'
export type DreamFormat = 'quadrado' | 'retrato' | 'paisagem' | 'destaque'
export type ImageKind = 'cover' | 'gallery' | 'achievement'

export interface Profile {
  id: string
  display_name: string
  email: string | null
  avatar_path: string | null
}

export interface Couple {
  id: string
  name: string
  motto: string | null
  created_at: string
}

export interface Member {
  user_id: string
  role: 'owner' | 'partner'
  joined_at: string
  display_name: string | null
  email: string | null
  avatar_path: string | null
}

export interface Category {
  id: string
  couple_id: string
  name: string
  icon: string
  tone: number
  sort_order: number
  is_default: boolean
}

export interface DreamImage {
  id: string
  couple_id: string
  dream_id: string
  kind: ImageKind
  path: string
  thumb_path: string | null
  width: number | null
  height: number | null
  focus_x: number
  focus_y: number
  created_by: string | null
  created_at: string
}

export interface Dream {
  id: string
  couple_id: string
  title: string
  description: string | null
  category_id: string | null
  status: DreamStatus
  estimated_value: number | null
  saved_value: number | null
  target_date: string | null
  format: DreamFormat
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  achieved_at: string | null
  achieved_by: string | null
  achievement_note: string | null
  images: DreamImage[]
}

export interface Invitation {
  id: string
  couple_id: string
  invited_name: string | null
  invited_email: string | null
  code: string
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired'
  expires_at: string
  created_at: string
}

export interface BoardState {
  me: Profile
  couple: Couple | null
  members: Member[]
  categories: Category[]
  dreams: Dream[]
  invitation: Invitation | null
}

export type ActivityKind =
  | 'board_created' | 'created' | 'updated' | 'value_changed' | 'image_added'
  | 'achieved' | 'reopened' | 'comment' | 'deleted' | 'member_joined' | 'member_left' | 'sync'

export interface Activity {
  id: string
  couple_id: string
  dream_id: string | null
  actor_id: string | null
  kind: ActivityKind
  dream_title: string | null
  body: string | null
  meta: Record<string, unknown>
  created_at: string
}

export interface NotificationItem {
  id: string
  read_at: string | null
  created_at: string
  update: Activity
}

export interface DreamInput {
  title: string
  description: string | null
  category_id: string | null
  status: DreamStatus
  estimated_value: number | null
  saved_value: number | null
  target_date: string | null
  format: DreamFormat
}
