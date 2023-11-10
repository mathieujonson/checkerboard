export type Comment = {
  app_url: string
  entity_type: string
  deleted: boolean
  story_id: number
  mention_ids: string[]
  author_id: string
  member_mention_ids: string[]
  updated_at: string
  group_mention_ids: string[]
  external_id: null | string
  parent_id: null | number
  id: number
  position: number
  reactions: any[]
  created_at: string
  text: null | string
}
