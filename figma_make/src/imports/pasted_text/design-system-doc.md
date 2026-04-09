This is a design documentation file, not a navigable prototype. Organize everything as labeled frames grouped by section on a single Figma page or     
  across named pages. Each frame represents one screen or state, laid out side by side with clear section labels above each group. The goal is a complete
   developer reference: every screen, every relevant state, annotated with component names and behavior notes where needed.                              
                                                                  
  ---
  GENERAL STYLE
               
  All screens use the same app shell: a flat sidebar (280px, #204970, no gradient) on the left and a pure white main content area on the right. Sidebar
  contains logo at top, three navigation items (Proyectos, Ayuda, Configuración) with icons, and at the bottom a user avatar with name and a pill-shaped 
  credits badge (#C8E62B background, dark text). Language toggle (ES / PT-BR) at the very bottom of the sidebar. Main content has 40px padding. No
  gradients anywhere in the UI. No decorative elements.                                                                                                  
                                                                  
  Typography: Fraunces for display and page titles, Plus Jakarta Sans for all UI and body. Minimum 14px for body text. Captions at 12px only.            
   
  Colors: obra-blue-950 #0F2438, obra-blue-900 #204970, obra-blue-700 #2D6499, obra-blue-100 #E8F0F7, obra-blue-50 #F4F8FC, obra-green-400 #C8E62B,      
  obra-neutral-900 #0F2438, obra-neutral-600 #5A7A94, obra-neutral-400 #9CA3AF, obra-neutral-200 #DDE8F0, obra-neutral-100 #F8FAFB.
                                                                                                                                                         
  Buttons are always pill-shaped (border-radius 9999px). Four variants: primary (obra-blue-700 fill, white text), cta (obra-green-400 fill, obra-blue-950
   text), ghost (transparent, obra-blue-700 border and text), destructive (red-500 fill, white text).
                                                                                                                                                         
  All frames at 1440px wide desktop.                                                                                                                     
   
  ---                                                                                                                                                    
  SECTION 1 — DESIGN SYSTEM                                       
                           
  Create a dedicated section with the following documented as component showcases, not as app screens.
                                                                                                                                                         
  Color palette: all tokens displayed as labeled swatches with token name, hex value, and usage description below each.                                  
                                                                                                                                                         
  Typography scale: each text style shown as a live example line with the style name, font, size, weight, and color annotated beside it.                 
                                                                  
  Button variants: all four variants (primary, cta, ghost, destructive) shown in default, hover, focused, disabled, and loading states. All pill-shaped. 
                                                                  
  Input states: single-line input and textarea shown in default, focused, error, disabled, and filled states. Each with a visible label above the field. 
  Error state includes red border, error icon, and error message below.
                                                                                                                                                         
  Badge variants: default (obra-blue-100 / obra-blue-700) and warning (yellow-50 / yellow-700). Plus the three project status badges: Borrador,          
  Publicado, Modificado.
                                                                                                                                                         
  Card: base card and project card variant. Project card shows name, status badge, last modified date, three color dot swatches representing the palette,
   artifact count (e.g. 1 ebook · 3 bonuses · 1 bump), and a three-dot action menu.
                                                                                                                                                         
  Modal: base modal structure with header, body, footer with action buttons, and dark overlay behind. Plus a destructive confirmation variant where the  
  user must type their email to confirm.
                                                                                                                                                         
  Toast notifications: success, error, and info variants. Bottom-right position. Each with icon, message, and close button.                              
   
  Sidebar: full sidebar component showing default nav item, active nav item (left border obra-blue-700), and hover state. Credits badge and user chip at 
  bottom.                                                         
                                                                                                                                                         
  Global stepper: the three-step Estructura / Contenido / Vista previa component. Show all three possible states per step: upcoming (empty circle,       
  muted), active (filled obra-blue-700 circle with number, bold label), completed (checkmark circle).
                                                                                                                                                         
  Empty state: centered layout with placeholder illustration area, heading, supporting text, and CTA button.                                             
   
  Skeleton loader: shimmer blocks in the shapes of a card, a title line, a body text line, and an image block.                                           
                                                                  
  AI Assist Field: textarea with the embedded "Mejorar con IA" button with sparkle icon. Show default state and loading state.                           
                                                                  
  ---                                                                                                                                                    
  SECTION 2 — AUTH                                                
                  
  No sidebar on these screens. Centered card (max-width 420px) on an obra-blue-50 background. Card is white with obra-blue-100 border, 16px
  border-radius, 40px padding.                                                                                                                           
   
  Login: Obra logo at top of card. Email and password fields with visible labels. Primary button "Iniciar sesión". Ghost button "Continuar con Google"   
  with Google icon. Links for "¿No tenés cuenta? Registrate" and "Olvidé mi contraseña". Footer links to Términos and Privacidad.
                                                                                                                                                         
  Registro: Same card. Fields: nombre completo, email, contraseña. CTA button (cta variant) "Crear mi cuenta". Google option. Note about accepting terms 
  below the button.
                                                                                                                                                         
  Shell — Verificación de email: Full-screen centered layout, no card, no sidebar. Email/envelope illustration. Heading "Verificá tu email". Body copy   
  explaining to check inbox. Ghost button "Reenviar correo". Sign out link in top-right corner. No access to anything else.
                                                                                                                                                         
  Shell — Suscripción pendiente: Full-screen centered. Heading "Activá tu suscripción". Brief plan description and local pricing context. CTA button "Ir 
  al checkout con Mercado Pago". Help link.
                                                                                                                                                         
  Shell — Activando suscripción: Full-screen centered. Soft animated pulse indicator (not a spinner). Heading "Activando tu suscripción...". Reassuring  
  copy that payment was received and this takes a moment. Ghost button "Verificar estado". Visually distinct from pending — this implies success is on
  the way.                                                                                                                                               
                                                                  
  Shell — Error de suscripción: Full-screen centered. Heading "Tu suscripción no está activa". Masked email (e.g. j***@dominio.com). Linked providers    
  listed read-only. Credit balance with note that credits are retained but not usable until subscription is reactivated. Buttons: "Ir a Mercado Pago"
  (primary), "Verificar estado" (ghost). Links to Exportar mis datos and Eliminar cuenta. Support email visible.                                         
                                                                  
  ---
  SECTION 3 — DASHBOARD
                       
  All dashboard screens use the full app shell with sidebar.
                                                                                                                                                         
  Estado vacío (primer acceso): Main content shows a 16:9 video placeholder block with play button and obra-blue-50 background. Below it: heading "Creá  
  tu primer infoproducto" in Fraunces. CTA button (cta, large) "Crear proyecto". Secondary ghost button "Ver recorrido guiado".                          
                                                                                                                                                         
  Estado con proyectos: Top bar with "Mis proyectos" heading and "Nuevo proyecto" CTA button top-right. Filter tabs below: Activos / Archivados /        
  Papelera (ghost tab style, active tab has obra-blue-700 underline). Grid of project cards (3 columns). Show at least 5 cards in varied states: one
  Borrador, one Publicado, one Modificado, one with 0 bonuses, one with max bonuses and bumps. Three-dot menu on hover visible on one card.              
                                                                  
  Modal nuevo proyecto: Overlay on top of the dashboard. Modal with three sequential inputs shown as steps within the modal: project name input, content 
  locale selector (4 option cards: Español, Português Brasil, English US, English UK — each as a selectable card, not a dropdown), content source
  selector (two cards: "Generar con IA" with icon and description, "Subir mi manuscrito" with icon and description and note that upload happens after    
  design). Primary CTA "Comenzar" at bottom.                      

  ---
  SECTION 4 — WIZARD ESTRUCTURA
                               
  All wizard screens use the app shell. Below the top bar, the global stepper shows Estructura as active, Contenido and Vista previa as upcoming. Below
  the stepper, an inner progress indicator shows the current micro-step (e.g. "Paso 2 de 7"). Content area max-width 720px, centered. Bottom of each     
  screen has "Siguiente →" (cta) right-aligned and "← Anterior" (ghost) left-aligned.
                                                                                                                                                         
  Tema del proyecto: Single large textarea with label "¿Sobre qué es tu infoproducto?". Helper text below in obra-neutral-600. AI Assist Field component 
  — "Mejorar con IA" button embedded below the textarea. Show a validation error state annotation: inline error message if the field is too short.
                                                                                                                                                         
  Avatar y problema: Two separate textareas stacked with 24px gap. First: "¿Quién es tu cliente ideal?". Second: "¿Qué problema resuelve tu              
  infoproducto?". Each with its own "Mejorar con IA" button. Independent — improving one does not affect the other.
                                                                                                                                                         
  Cantidades del paquete: Section heading "¿Cuántas piezas tiene tu paquete?". Two counter components: "Bonuses" (range 0–5) and "Order bumps" (range    
  0–2). Each counter: minus button, number display (large, prominent), plus button. Below the counters: a small visual diagram updating in real time — 1
  book icon + N bonus icons + N bump icons. Helper text explaining that the main ebook is always included.                                               
                                                                  
  Título principal y autor: Heading "Elegí el título de tu ebook principal". Grid of 5 title chips (2+3 layout). Each chip is a selectable card showing a
   suggested title. Selected state: obra-blue-700 border and checkmark. Below the chips: text input "O escribí el tuyo propio". Below that: "Regenerar
  sugerencias" ghost link. Annotation note: regenerating clears chip selection but preserves the custom input. Separate optional field "Autor / marca    
  (opcional)" with helper text "Aparece en la portada cuando lo completás." Show a loading skeleton state for the 5 chips.

  Títulos de bonuses: List of N rows (show 3 as example). Each row: drag handle icon, bonus number, editable title input, individual regenerate icon     
  button, lock icon. Show one row in locked state (lock icon filled, slightly different background), one in default, one with a custom-edited value.
  "Regenerar todos" ghost button at top-right of the list. Grayed out with tooltip when all rows are locked.                                             
                                                                  
  Títulos de order bumps: Same layout as bonuses. Show 2 rows.                                                                                           
   
  Diseño: Four sub-sections separated by dividers.                                                                                                       
                                                                  
  Sub-section "Página": Page size as two selectable cards (A4 / Letter, each showing a tiny page silhouette). Orientation as two radio cards (Vertical / 
  Horizontal).                                                    
                                                                                                                                                         
  Sub-section "Preset": Horizontally scrollable row of preset cards (show 5). Each card: palette swatch (3 color circles) + font name pair + preset name.
   Selected preset has obra-blue-700 border. "Personalizado" state shown as a chip when user has manually edited after selecting a preset.
                                                                                                                                                         
  Sub-section "Paleta 60/30/10": Three color pickers side by side labeled "60% Principal", "30% Secundario", "10% Acento". Each: large color circle + hex
   value input below.
                                                                                                                                                         
  Sub-section "Tipografía": Two font selectors — "Títulos" and "Cuerpo". Each shows current font name and a live preview line in that font.              
   
  Sub-section "Imágenes": Two option cards — "Generadas con IA" (default, selected) and "Voy a subir las mías". Below: style chips grid (Ilustración     
  plana, Fotografía, Isométrico, Minimalista, Acuarela — one selected). Optional textarea "Notas de estilo" with AI Assist. Small note: "Las imágenes se
  generan en Vista previa. Sin costo de créditos en este paso."                                                                                          
                                                                  
  Primary CTA for this screen: "Finalizar diseño →" (cta).                                                                                               
   
  ---                                                                                                                                                    
  SECTION 5 — WIZARD CONTENIDO IA                                 
                                 
  Global stepper shows Estructura completed, Contenido active, Vista previa upcoming. Dismissible info banner below stepper: "En este paso generás el
  texto. El diseño y la vista previa vienen después." with an X to dismiss.                                                                              
   
  Índice del ebook: Split layout. Left panel (55%): editable ordered list of chapter titles. Each row: drag handle, chapter number, title input, delete  
  icon. "Añadir capítulo" link at bottom of list. Right panel (45%): TOC editor + explicit "Regenerar esquema" actions; **index chatbot is post-MVP** (see `features/wizard-ai-generation/wizard-ai-generation.md`). Legacy note: chat thread scoped to the index was considered; MVP uses no chat here.
   assistant left-aligned, white with obra-blue-100 border). Message input at bottom with send button. Empty state in chat: placeholder text "Describí   
  cómo querés ajustar el índice". Bottom action bar: "Confirmar índice →" (cta). Show a second state where the index is frozen (titles become read-only,
  lock icon appears, "Editar índice" ghost link replaces the confirm button).

  Editor de capítulo: Split layout. Left (60%): chapter title read-only in Fraunces above the editor. Rich text editor area with minimal toolbar (bold,  
  italic, H2, H3, lists). Above editor: inner header "Capítulo 3 de 7 · Estrategias de precio" with previous/next arrow navigation. Right (40%):
  per-chapter AI chat, same pattern as index chat. Bottom bar: "Aprobar capítulo ✓" (cta). Autosave indicator top-right: "Guardado" with subtle dot. Show
   a second state with "Guardando..." and spinner. Show a soft coherence notice banner when the chapter was already approved and is being re-edited.

  Editor de bonus y bump: Same layout as chapter editor. Inner header reads "Bonus 2 de 3 · Guía de precios". Annotate that this is the same component   
  reused.
                                                                                                                                                         
  ---                                                             
  SECTION 6 — WIZARD CONTENIDO UPLOAD
                                                                                                                                                         
  Global stepper same as Contenido IA.
                                                                                                                                                         
  Subida de archivo: Centered drop zone with dashed obra-blue-100 border, upload icon, "Arrastrá tu archivo acá" heading, "o hacé clic para elegir" link.
   Below: accepted formats note ".docx o PDF con texto seleccionable · Máx. 10 MB · Un archivo a la vez". Show four error state annotations beside the
  main frame: formato incorrecto, archivo muy grande, PDF con contraseña, extracción vacía. Show processing state: full-width progress bar below the drop
   zone + "Analizando tu documento..." + upload button disabled.  

  Alineación de capítulos: Split layout. Left (55%): proposed chapter list (same list component as the index editor — editable, reorderable). "Regenerar 
  propuesta" ghost button with small credit cost note. "Aprobar alineación →" CTA. Right (45%): raw extracted text in a scrollable read-only panel for
  reference, labeled "Tu documento original".                                                                                                            
                                                                  
  ---
  SECTION 7 — WIZARD VISTA PREVIA Y EXPORT
                                                                                                                                                         
  Global stepper shows Estructura and Contenido completed, Vista previa active.
                                                                                                                                                         
  Preview principal: App shell. Left panel within main area (220px): deliverable navigator list. Items: "Ebook principal" (expandable with chapter list),
   "Bonus 1: [título]", "Bonus 2: [título]", "Order bump 1: [título]". Each item has a status dot (verde = listo, gris = generando, rojo = error). Main
  area: HTML-rendered preview of the selected deliverable with the project's design tokens applied — show actual typography, colors, and layout, not a   
  wireframe. This is the most important frame in this section. Top of main: "← Volver a Contenido para editar texto" ghost link.

  Slot de imagen: Zoom-in frame showing a single image slot in the preview in four states side by side: vacío (placeholder with dashed border and image  
  icon), generando (animated skeleton with shimmer), listo (image rendered cleanly), error (red-tinted placeholder with retry link). On the "listo"
  state, show the hover overlay with three icon buttons: Regenerar, Subir imagen, Eliminar.                                                              
                                                                  
  Regenerar imagen: Modal overlay. Optional instruction textarea "Describí cómo querés la nueva imagen (opcional)". Preview area showing the newly       
  generated image. Two buttons: "Confirmar" (primary) and "Cancelar" (ghost). Annotation: credits are only charged on confirm.
                                                                                                                                                         
  Portada: Dedicated frame. State 1 — no cover exists: prominent card with "Generá la portada con IA" heading and "Generar portada" CTA. State 2 —       
  generating: full-cover animated skeleton. State 3 — cover ready: displays the cover image with "Regenerar portada" ghost button and "Subir portada"
  ghost button below. State 4 — generation failed: design-consistent placeholder block with title text, retry and upload options, and a warning message. 
                                                                  
  Panel de exportación: Right-side panel or bottom drawer. Section heading "Exportar tu paquete". Per-deliverable rows: each shows deliverable name +    
  status chip (Listo / Generando / Error) + individual download button (primary). Bottom: "Descargar todo (ZIP)" large CTA (cta variant). If ZIP fails:
  error message naming which PDF failed + Reintentar button. Small note: "La exportación no consume créditos."                                           
                                                                  
  ---
  SECTION 8 — CONFIGURACIÓN
                                                                                                                                                         
  All screens use the app shell. Within the main content area, a secondary left nav (not the sidebar) shows the five tabs: Perfil, Seguridad,
  Facturación, Créditos, Privacidad y datos.                                                                                                             
                                                                  
  Perfil: Display name input, ui_locale toggle (ES / PT-BR as two selectable pills), avatar placeholder with upload option.                              
                                                                  
  Seguridad: Change password section (current password + new password + confirm fields). Below: "Proveedores vinculados" section listing connected       
  sign-in methods (e.g. Google with connected checkmark). Connect/unlink buttons. Unlink button shown in disabled state with tooltip: "Agregá otro método
   primero para no perder el acceso."                                                                                                                    
                                                                  
  Facturación: Active subscription status badge (green, "Activa"). Plan name, renewal date. Primary button "Gestionar suscripción en Mercado Pago". Ghost
   button "Verificar estado" with helper text about webhook delay. Annotation: Obra never shows "cancelled" until the backend confirms it via webhook.
                                                                                                                                                         
  Créditos: Large balance display (number prominent, obra-green-400 accent). CTA "Comprar créditos" (cta, shown enabled and also shown disabled with     
  explanation for when subscription is inactive). Below: paginated table — columns: Fecha, Operación, Créditos, Proyecto. Show a few example rows mixing
  positive (purchase) and negative (AI usage) deltas.                                                                                                    
                                                                  
  Privacidad y datos: Two sections clearly separated. "Exportar mis datos" — ghost button with explanation of what's included. "Eliminar cuenta" —       
  destructive button with warning copy explaining what gets deleted. Visual separation between these two actions to make it clear they are different.
                                                                                                                                                         
  Modal eliminación de cuenta: Show as a standalone frame. Two-step modal. Step 1: list of what will be deleted, subscription cancellation note,         
  "Entiendo, continuar" primary button. Step 2: input "Escribí tu email para confirmar", "Eliminar mi cuenta" destructive button (disabled until email
  matches). If Mercado Pago cancellation fails: error state shown in the modal, account unchanged, clear message.                                        
                                                                  
  ---
  SECTION 9 — AYUDA
                   
  App shell. No secondary navigation needed.
                                                                                                                                                         
  Single screen. Page title "Ayuda y soporte" in Fraunces. Ten accordion items in logical order: ¿Qué es Obra?, Idiomas, Cómo pagar, Qué son los         
  créditos, Cuántos proyectos, Cómo descargar, Subir un archivo, Eliminar un proyecto, ¿Vende Obra mi producto?, Contacto. Show three states: all        
  collapsed, one item expanded (showing the answer in regular Plus Jakarta Sans, comfortable line height). Contact block at the bottom: support email in 
  plain visible text + copy icon + "Abrir correo" primary button. Short tip about what to include in the message. No SLA or response time promises.

  ---
  ANNOTATION GUIDELINES
                       
  On each frame, add Figma annotations or sticky notes for the following where relevant: component name used, any behavior rule that is not visually
  obvious (e.g. "regenerating clears chip selection but not the custom input field"), accessibility note (e.g. "focus trap active", "aria-live region",  
  "error uses icon + text, not color alone"), and credit cost if the action triggers AI usage.