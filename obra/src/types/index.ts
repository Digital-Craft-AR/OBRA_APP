export interface Project {
  id: string
  user_id: string
  name: string
  status: "draft" | "published" | "modified"
  content_locale: "es" | "pt-BR" | "en-US" | "en-GB"
  author?: string
  archived_at?: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface DesignSystem {
  id: string
  project_id: string
  color_primary: string
  color_secondary: string
  color_accent: string
  font_display: string
  font_body: string
  image_mode?: "ai_assisted" | "placeholders_first"
  image_style?: string
}

export interface Ebook {
  id: string
  project_id: string
  type: "main" | "bonus" | "order_bump"
  title?: string
  subtitle?: string
  html_content?: string
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  ebook_id: string
  order: number
  title: string
  content?: string
  image_id?: string
  created_at: string
}
