# Project and ebook data model (UML)

Canonical SQL and field notes: [`backend.md`](backend.md) and [`business_logic.md`](business_logic.md).

**Workspace routing:** how `projects.structure_completed_at` and `project_content_progress.current_phase` map to the global Structure / Content / Preview URL segments is defined in [`business_logic.md`](business_logic.md) §9 (not duplicated here).

`content_locale`, `author`, `topic`, `problem`, and `target_avatar` live only on **Project**. **Ebook** rows do not duplicate them; consumers **join** `ebooks.project_id → projects.id` (or load the project once per request).

**`ProjectContentProgress.current_phase`** is restricted in PostgreSQL to: `upload_alignment` | `main_index` | `main_chapter` | `bonus` | `order_bump` | `complete`. Initial phase: **`upload_alignment`** if `content_source = upload`, else **`main_index`**.

**Main ebook TOC:** stored as **`chapters`** on the main ebook (titles + order); **`project_content_progress.main_index_frozen_at`** marks **main** index freeze (not `ebooks.index_frozen_at` on the main row today).

**Order bump TOC:** same persistence pattern as the main ebook — multiple **`chapters`** rows on each **`ebooks`** row with `type = order_bump` (scoped by `package_ordinal`). **`ebooks.index_frozen_at`** on that row marks when the user **confirmed** that bump’s index in Content.

**Bonus ebooks:** usually **one** chapter row for the single-section deliverable.

**`chapters.approved_at`** applies to **body** approval per chapter, not TOC confirmation, for all types above.

**`chapters.content` (body):** persisted as **rich HTML** (fragment), not Markdown. The Content wizard uses **Tiptap** for editing and **DOMPurify** on the client to sanitize to an allowed tag subset before `UPDATE`; AI stubs and future LLM output should return compatible HTML fragments.

**Contenido chat:** **`content_chat_threads`** — `chapter_id` set = one thread per **chapter / bonus / bump** artifact in MVP. **`chapter_id` null** slot (historically “main index / TOC” chat): **post-MVP** if conversational index refinement is enabled; **MVP** uses explicit generate/regenerate outline actions **without** an index chat transcript. Messages in **`content_chat_messages`**. **MVP:** persist **`user`** server-side with `client_message_id` idempotency (unique per thread) and persist **`assistant`** only when the streamed reply **finishes** (no per-chunk rows).

---

## Mermaid (class diagram)

Renders in GitHub, GitLab, and many Markdown previews.

```mermaid
classDiagram
  direction TB

  class Project {
    +UUID id
    +UUID user_id
    +string name
    +string status
    +string content_locale
    +string content_source
    +string author
    +string topic
    +string problem
    +string target_avatar
    +datetime structure_completed_at
    +datetime archived_at
    +datetime deleted_at
    +datetime created_at
    +datetime updated_at
  }

  class ProjectStructureDraft {
    +UUID project_id
    +JSON payload
    +datetime updated_at
  }

  class DesignSystem {
    +UUID id
    +UUID project_id
    +string color_primary
    +string color_secondary
    +string color_accent
    +string font_display
    +string font_body
    +string page_size
    +string page_orientation
    +string preset_id
    +boolean is_custom_from_preset
    +string style_notes
    +string image_mode
    +string image_style
    +datetime created_at
    +datetime updated_at
  }

  class Ebook {
    +UUID id
    +UUID project_id
    +string type
    +int package_ordinal
    +string title
    +string subtitle
    +string layout_template_html
    +datetime index_frozen_at
    +datetime created_at
    +datetime updated_at
  }

  class ProjectContentProgress {
    +UUID project_id
    +string current_phase
    +datetime main_index_frozen_at
    +UUID current_ebook_id
    +UUID current_chapter_id
    +datetime updated_at
  }

  class ProjectManuscript {
    +UUID id
    +UUID project_id
    +string storage_path
    +string mime
    +int byte_size
    +string checksum_sha256
    +datetime uploaded_at
    +datetime superseded_at
  }

  class Chapter {
    +UUID id
    +UUID ebook_id
    +int order
    +string title
    +string content
    +UUID image_id
    +datetime approved_at
    +datetime created_at
  }

  Project "1" --> "0..1" ProjectStructureDraft : draft while Structure wizard

  note for ProjectStructureDraft "Optimistic lock: PATCH\nmust match updated_at"
  Project "1" --> "0..1" DesignSystem : design after commit
  Project "1" --> "0..1" ProjectContentProgress : Contenido cursor
  Project "1" *-- "0..*" ProjectManuscript : manuscripts history
  Project "1" *-- "1..8" Ebook : package deliverables
  Ebook "1" *-- "*" Chapter : chapters
  ProjectContentProgress ..> Ebook : current_ebook_id
  ProjectContentProgress ..> Chapter : current_chapter_id

  note for ProjectManuscript "At most one row with\nsuperseded_at null per project"

  note for Ebook "Locale, author, persona, problem:\nread via Project (JOIN).\nindex_frozen_at: order_bump TOC confirm.\npackage_ordinal: slot per type."
```

---

## PlantUML (class diagram)

Use in IDE plugins, [plantuml.com](https://www.plantuml.com/plantuml), or CI renderers.

```plantuml
@startuml project_ebook_model
skinparam classAttributeIconSize 0
skinparam shadowing false

class Project {
  id : UUID <<PK>>
  user_id : UUID <<FK>>
  name : string
  status : string
  content_locale : string
  content_source : string
  author : string <<optional>>
  topic : string
  problem : string
  target_avatar : string
  structure_completed_at : timestamptz <<optional>>
  archived_at : timestamptz <<optional>>
  deleted_at : timestamptz <<optional>>
  created_at : timestamptz
  updated_at : timestamptz
}

class ProjectStructureDraft {
  project_id : UUID <<PK,FK>>
  payload : JSON
  updated_at : timestamptz
}

note right of ProjectStructureDraft
  Optimistic locking: UPDATE only if
  updated_at matches client; else 409.
end note

class DesignSystem {
  id : UUID <<PK>>
  project_id : UUID <<FK, unique>>
  color_primary : string
  color_secondary : string
  color_accent : string
  font_display : string
  font_body : string
  page_size : string
  page_orientation : string
  preset_id : string <<optional>>
  is_custom_from_preset : boolean
  style_notes : string <<optional>>
  image_mode : string <<optional>>
  image_style : string <<optional>>
  created_at : timestamptz
  updated_at : timestamptz
}

class Ebook {
  id : UUID <<PK>>
  project_id : UUID <<FK>>
  type : string <<main | bonus | order_bump>>
  package_ordinal : smallint
  title : string <<optional>>
  subtitle : string <<optional>>
  layout_template_html : string <<optional>>
  index_frozen_at : timestamptz <<optional; order_bump TOC confirm>>
  created_at : timestamptz
  updated_at : timestamptz
}

class ProjectContentProgress {
  project_id : UUID <<PK,FK>>
  current_phase : string
  main_index_frozen_at : timestamptz <<optional>>
  current_ebook_id : UUID <<FK optional>>
  current_chapter_id : UUID <<FK optional>>
  updated_at : timestamptz
}

class ProjectManuscript {
  id : UUID <<PK>>
  project_id : UUID <<FK>>
  storage_path : string
  mime : string
  byte_size : long
  checksum_sha256 : string <<optional>>
  uploaded_at : timestamptz
  superseded_at : timestamptz <<optional, null = current>>
}

class Chapter {
  id : UUID <<PK>>
  ebook_id : UUID <<FK>>
  order : int
  title : string
  content : string <<optional>>
  image_id : UUID <<FK optional>>
  approved_at : timestamptz <<optional>>
  created_at : timestamptz
}

Project ||--o| ProjectStructureDraft : "0..1"
Project ||--o| DesignSystem : "0..1"
Project ||--o| ProjectContentProgress : "0..1"
Project ||--o{ ProjectManuscript : "0..* history, 0..1 current"
Project ||--o{ Ebook : "1 main + 0..5 bonus + 0..2 bump"
Ebook ||--o{ Chapter : "0..*"
ProjectContentProgress }o--o| Ebook : current_ebook_id
ProjectContentProgress }o--o| Chapter : current_chapter_id

note right of Ebook
  No duplicate of content_locale,
  author, problem, target_avatar.
  Join Project for IA / export context.
  Unique (project_id, type, package_ordinal).
  index_frozen_at: bump index freeze only (MVP).
end note

@enduml
```
