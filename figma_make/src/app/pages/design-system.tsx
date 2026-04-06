import { useState } from "react";
import {
  FolderOpen, Settings, HelpCircle, Plus, BookOpen, Trash2,
} from "lucide-react";
import { ObraButton }          from "../components/obra/button";
import { ObraInput, ObraTextarea } from "../components/obra/input";
import { ObraBadge }           from "../components/obra/badge";
import { ObraCard, ObraCardHeader, ObraCardBody, ObraProjectCard } from "../components/obra/card";
import { ObraSidebar }         from "../components/obra/sidebar";
import { ObraGlobalStepper }   from "../components/obra/stepper";
import { ObraAiAssistField }   from "../components/obra/ai-assist-field";
import { ObraModal }           from "../components/obra/modal";
import { ObraToast, ObraToastContainer, type ObraToastItem } from "../components/obra/toast";
import { ObraEmptyState }      from "../components/obra/empty-state";
import {
  ObraSkeletonCard,
  ObraSkeletonBlock,
  ObraSkeletonImage,
} from "../components/obra/skeleton";
import { ObraUserChip } from "../components/obra/avatar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold font-body text-obra-blue-950 border-b border-obra-blue-100 pb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return <div className={`flex items-start gap-3 ${wrap ? "flex-wrap" : ""}`}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-obra-neutral-600 font-body font-medium uppercase tracking-wide">
      {children}
    </span>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 items-start">{children}</div>;
}
function ColorSwatch({ name, hex, bg }: { name: string; hex: string; bg: string }) {
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div className={`h-14 w-32 rounded-card border border-obra-blue-100 ${bg}`} title={hex} />
      <span className="text-xs font-semibold font-body text-obra-blue-950">{name}</span>
      <span className="text-xs text-obra-neutral-600 font-body">{hex}</span>
    </div>
  );
}

export function DesignSystem() {
  const [modalOpen,   setModalOpen]   = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [aiStatus,    setAiStatus]    = useState<"idle"|"loading"|"success"|"error">("idle");
  const [aiText,      setAiText]      = useState("Mujeres que hacen velas artesanales en casa y quieren venderlas online.");
  const [toasts,      setToasts]      = useState<ObraToastItem[]>([]);

  const addToast = (variant: ObraToastItem["variant"], title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const simulateAi = () => {
    setAiStatus("loading");
    setTimeout(() => {
      setAiText("Mujeres de 28 a 42 años que elaboran velas aromáticas artesanales en casa y desean monetizar su pasión creando una marca propia para vender online.");
      setAiStatus("success");
      setTimeout(() => setAiStatus("idle"), 2000);
    }, 1800);
  };

  const previewNavItems = [
    { id: "projects", label: "Proyectos",    icon: <FolderOpen  className="size-4" />, active: true  },
    { id: "help",     label: "Ayuda",         icon: <HelpCircle  className="size-4" />               },
    { id: "settings", label: "Configuración", icon: <Settings    className="size-4" />               },
  ];

  const steps = [
    { id: 1, label: "Estructura",   status: "completed" as const },
    { id: 2, label: "Contenido",    status: "active"    as const },
    { id: 3, label: "Vista previa", status: "upcoming"  as const },
  ];

  return (
    <div className="bg-obra-blue-50 min-h-full">
      <div className="max-w-content mx-auto px-10 py-10 flex flex-col gap-12">

        <div>
          <h1 className="font-display text-2xl text-obra-blue-950 leading-tight">Sistema de diseño — Obra</h1>
          <p className="text-sm text-obra-neutral-600 font-body mt-1">Tokens, componentes y patrones para obra.app</p>
        </div>

        {/* COLORS */}
        <Section title="Colores">
          <div className="flex flex-wrap gap-5">
            <ColorSwatch name="obra-blue-950"     hex="#0F2438" bg="bg-obra-blue-950" />
            <ColorSwatch name="obra-blue-900"     hex="#204970" bg="bg-obra-blue-900" />
            <ColorSwatch name="obra-blue-700"     hex="#2D6499" bg="bg-obra-blue-700" />
            <ColorSwatch name="obra-blue-100"     hex="#E8F0F7" bg="bg-obra-blue-100" />
            <ColorSwatch name="obra-blue-50"      hex="#F4F8FC" bg="bg-obra-blue-50"  />
            <ColorSwatch name="obra-green-400"    hex="#C8E62B" bg="bg-obra-green-400" />
            <ColorSwatch name="obra-neutral-600"  hex="#5A7A94" bg="bg-obra-neutral-600" />
            <ColorSwatch name="obra-neutral-400"  hex="#9CA3AF" bg="bg-obra-neutral-400" />
            <ColorSwatch name="obra-neutral-200"  hex="#DDE8F0" bg="bg-obra-neutral-200" />
            <ColorSwatch name="obra-neutral-100"  hex="#F8FAFB" bg="bg-obra-neutral-100" />
          </div>
        </Section>

        {/* TYPOGRAPHY */}
        <Section title="Tipografía">
          <div className="flex flex-col gap-5 bg-white rounded-card border border-obra-blue-100 p-6">
            {[
              { lbl:"Page Title — Fraunces Bold 24px",           el:<p className="font-display text-2xl text-obra-blue-950 mt-1">Crea tu infoproducto con IA</p> },
              { lbl:"Section Title — Plus Jakarta Sans Semibold 18px", el:<p className="font-body text-lg font-semibold text-obra-blue-950 mt-1">Configuración del proyecto</p> },
              { lbl:"Body — Plus Jakarta Sans Regular 14px",     el:<p className="font-body text-sm text-obra-neutral-900 mt-1">Define el tema central, el avatar de tu cliente ideal y la estructura del paquete antes de continuar con la generación del contenido.</p> },
              { lbl:"Body Strong — Plus Jakarta Sans Semibold 14px", el:<p className="font-body text-sm font-semibold text-obra-neutral-900 mt-1">Guía completa de velas aromáticas artesanales</p> },
              { lbl:"Caption — Plus Jakarta Sans Regular 12px",  el:<p className="font-body text-xs text-obra-neutral-600 mt-1">Última edición: hace 2 horas · 1 ebook · 3 bonuses</p> },
              { lbl:"Label — Plus Jakarta Sans Medium 13px",     el:<p className="font-body text-label font-medium text-obra-blue-950 mt-1">Avatar del cliente ideal</p> },
            ].map(({ lbl, el }) => (
              <div key={lbl}>
                <Label>{lbl}</Label>
                {el}
              </div>
            ))}
          </div>
        </Section>

        {/* BUTTONS */}
        <Section title="Botones">
          <ObraCard>
            <ObraCardBody className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Label>Variantes</Label>
                <Row>
                  <ObraButton variant="primary">Primary (CTA verde)</ObraButton>
                  <ObraButton variant="secondary">Secondary (azul)</ObraButton>
                  <ObraButton variant="tertiary">Tertiary (outline)</ObraButton>
                  <ObraButton variant="destructive"><Trash2 className="size-4" /> Destructive</ObraButton>
                </Row>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Tamaños</Label>
                <Row>
                  <ObraButton variant="secondary" size="md">Medium (40px)</ObraButton>
                  <ObraButton variant="secondary" size="sm">Small (32px)</ObraButton>
                </Row>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Estados</Label>
                <Row>
                  <ObraButton variant="primary" loading>Generando…</ObraButton>
                  <ObraButton variant="secondary" disabled>Deshabilitado</ObraButton>
                  <ObraButton variant="tertiary" disabled>Deshabilitado</ObraButton>
                </Row>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Sobre fondo oscuro</Label>
                <div className="bg-obra-blue-900 rounded-card p-5 flex gap-3">
                  <ObraButton variant="primary"><Plus className="size-4" /> Crear proyecto</ObraButton>
                  <ObraButton variant="tertiary" className="border-white/30 text-white hover:bg-white/10">Ver más</ObraButton>
                </div>
              </div>
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* INPUTS */}
        <Section title="Inputs">
          <ObraCard>
            <ObraCardBody className="grid grid-cols-2 gap-6">
              <ObraInput label="Tema del ebook" placeholder="Ej: velas aromáticas artesanales" hint="Sé específico para obtener mejores resultados." />
              <ObraInput label="Email" type="email" placeholder="tu@email.com" error="El email no es válido." />
              <ObraInput label="Campo deshabilitado" placeholder="No editable" disabled />
              <ObraInput label="Campo relleno" defaultValue="Plus Jakarta Sans" />
              <div className="col-span-2">
                <ObraTextarea label="Avatar del cliente ideal" placeholder="Describe a tu cliente ideal: edad, situación, dolores, deseos…" hint="Mientras más detallado, mejores serán los resultados de la IA." />
              </div>
              <div className="col-span-2">
                <ObraTextarea label="Con error" defaultValue="Texto muy corto." error="El avatar debe tener al menos 50 caracteres." />
              </div>
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* AI ASSIST */}
        <Section title="AI Assist Field">
          <ObraCard>
            <ObraCardBody>
              <ObraAiAssistField
                label="Avatar del cliente ideal"
                hint="Hace clic en 'Mejorar con IA' para que la IA enriquezca tu descripción."
                value={aiText}
                onChange={setAiText}
                onAiAssist={simulateAi}
                aiStatus={aiStatus}
                placeholder="Describe a tu cliente ideal…"
              />
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* BADGES */}
        <Section title="Badges">
          <ObraCard>
            <ObraCardBody className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Label>Base</Label>
                <Row wrap>
                  <ObraBadge variant="default">Default</ObraBadge>
                  <ObraBadge variant="warning">Warning</ObraBadge>
                  <ObraBadge variant="credits">1.240 créditos</ObraBadge>
                </Row>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Estados de proyecto (con dot)</Label>
                <Row wrap>
                  <ObraBadge variant="draft"     showDot>Borrador</ObraBadge>
                  <ObraBadge variant="published" showDot>Publicado</ObraBadge>
                  <ObraBadge variant="modified"  showDot>Modificado</ObraBadge>
                </Row>
              </div>
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* CARDS */}
        <Section title="Cards">
          <div className="flex flex-col gap-5">
            <ObraCard hoverable>
              <ObraCardHeader>
                <h3 className="text-lg font-semibold font-body text-obra-blue-950">Card base (hoverable)</h3>
              </ObraCardHeader>
              <ObraCardBody>
                <p className="text-sm font-body text-obra-neutral-600">
                  Fondo blanco · borde obra-blue-100 · radio 12px · shadow-card. En hover: borde obra-blue-700, shadow-card-hover, translateY -2px.
                </p>
              </ObraCardBody>
            </ObraCard>
            <div className="flex flex-col gap-3">
              <Label>Project Cards</Label>
              <div className="grid grid-cols-3 gap-4">
                <ObraProjectCard name="Guía completa de velas aromáticas artesanales" status="draft"     lastModified="Hace 2 horas" palette={["#204970","#C8E62B","#E8F0F7"]} artifactCount="1 ebook · 3 bonuses" />
                <ObraProjectCard name="Emprender con repostería desde casa"           status="published" lastModified="Ayer"         palette={["#C8372D","#F5A623","#F8FAFB"]} artifactCount="1 ebook · 2 bonuses · 1 bump" />
                <ObraProjectCard name="Marketing digital para coaches"                status="modified"  lastModified="Hace 5 días"  palette={["#6B4EFF","#FF6B6B","#F4F8FC"]} artifactCount="1 ebook · 5 bonuses" />
              </div>
            </div>
          </div>
        </Section>

        {/* STEPPER */}
        <Section title="Global Stepper">
          <ObraCard>
            <ObraCardBody className="flex flex-col gap-8">
              {[
                { lbl:"Paso activo: Contenido",     s:[{id:1,label:"Estructura",status:"completed"},{id:2,label:"Contenido",status:"active"},{id:3,label:"Vista previa",status:"upcoming"}] },
                { lbl:"Paso activo: Estructura",    s:[{id:1,label:"Estructura",status:"active"},{id:2,label:"Contenido",status:"upcoming"},{id:3,label:"Vista previa",status:"upcoming"}] },
                { lbl:"Todos completados",          s:[{id:1,label:"Estructura",status:"completed"},{id:2,label:"Contenido",status:"completed"},{id:3,label:"Vista previa",status:"active"}] },
              ].map(({ lbl, s }) => (
                <div key={lbl} className="flex flex-col gap-3">
                  <Label>{lbl}</Label>
                  <ObraGlobalStepper steps={s as Parameters<typeof ObraGlobalStepper>[0]["steps"]} />
                </div>
              ))}
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* SIDEBAR */}
        <Section title="Sidebar">
          <div className="h-sidebar-preview rounded-card overflow-hidden border border-obra-blue-100 shadow-card flex">
            <ObraSidebar
              navItems={previewNavItems}
              userName="Valentina García"
              credits={1240}
            />
            <div className="flex-1 bg-white flex items-center justify-center">
              <p className="text-sm text-obra-neutral-600 font-body">Área de contenido principal</p>
            </div>
          </div>
        </Section>

        {/* MODALS */}
        <Section title="Modals">
          <ObraCard>
            <ObraCardBody className="flex gap-3">
              <ObraButton variant="primary" onClick={() => setModalOpen(true)}>Modal estándar</ObraButton>
              <ObraButton variant="destructive" onClick={() => setDestroyOpen(true)}><Trash2 className="size-4" /> Modal destructivo</ObraButton>
            </ObraCardBody>
          </ObraCard>
          <ObraModal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar sistema de diseño" description="Los cambios se aplicarán a todos los entregables del proyecto."
            footer={<><ObraButton variant="tertiary" onClick={() => setModalOpen(false)}>Cancelar</ObraButton><ObraButton variant="secondary" onClick={() => setModalOpen(false)}>Guardar cambios</ObraButton></>}>
            <ObraInput label="Color primario (60%)" defaultValue="#204970" />
          </ObraModal>
          <ObraModal open={destroyOpen} onClose={() => setDestroyOpen(false)} title="Eliminar proyecto" description="Esta acción no se puede deshacer." destructive
            footer={<><ObraButton variant="tertiary" onClick={() => setDestroyOpen(false)}>Cancelar</ObraButton><ObraButton variant="destructive" onClick={() => setDestroyOpen(false)}>Sí, eliminar</ObraButton></>} />
        </Section>

        {/* TOASTS */}
        <Section title="Toast Notifications">
          <ObraCard>
            <ObraCardBody className="flex gap-3 flex-wrap">
              <ObraButton variant="secondary" onClick={() => addToast("success","Proyecto guardado","Los cambios se guardaron correctamente.")}>Toast éxito</ObraButton>
              <ObraButton variant="tertiary"  onClick={() => addToast("error","Error al exportar","Intenta de nuevo en unos segundos.")}>Toast error</ObraButton>
              <ObraButton variant="tertiary"  onClick={() => addToast("info","IA procesando","La generación puede tardar unos momentos.")}>Toast info</ObraButton>
            </ObraCardBody>
          </ObraCard>
          <div className="flex flex-col gap-2">
            <Label>Vista previa</Label>
            <ObraToast variant="success" title="Proyecto exportado"      message="Tu PDF se descargará en breve." />
            <ObraToast variant="error"   title="Error al generar imagen" message="Verifica tus créditos disponibles." />
            <ObraToast variant="info"    title="IA procesando"           message="Esto puede tardar hasta 30 segundos." />
          </div>
        </Section>

        {/* EMPTY STATE */}
        <Section title="Empty State">
          <ObraCard>
            <ObraEmptyState heading="Aún no tenés proyectos" body="Crea tu primer infoproducto en minutos con la ayuda de la IA de Obra." action={{ label:"Crear primer proyecto", onClick:() => {} }} />
          </ObraCard>
        </Section>

        {/* SKELETONS */}
        <Section title="Skeleton Loaders">
          <div className="grid grid-cols-3 gap-4">
            <ObraSkeletonCard /><ObraSkeletonCard /><ObraSkeletonCard />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ObraCard><ObraCardBody><ObraSkeletonBlock /></ObraCardBody></ObraCard>
            <ObraCard><ObraCardBody><ObraSkeletonImage /></ObraCardBody></ObraCard>
          </div>
        </Section>

        {/* USER CHIP */}
        <Section title="Avatar / User Chip">
          <ObraCard>
            <ObraCardBody className="flex gap-6 items-center flex-wrap">
              <Chip><Label>Default (md)</Label><ObraUserChip name="Valentina García" /></Chip>
              <Chip><Label>Small</Label><ObraUserChip name="Valentina García" size="sm" /></Chip>
              <Chip><Label>Sin nombre</Label><ObraUserChip name="Valentina García" showName={false} /></Chip>
              <Chip><Label>Con avatar</Label><ObraUserChip name="Valentina García" avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=valentina" /></Chip>
            </ObraCardBody>
          </ObraCard>
        </Section>

        {/* APP SHELL DEMO */}
        <Section title="Foundations — App Shell">
          <div className="flex flex-col gap-4">
            <Label>1440px · Sidebar 280px · Main blanco puro</Label>
            <div className="rounded-card overflow-hidden border border-obra-blue-100 shadow-card">
              <div className="flex h-preview">
                <div className="w-35 bg-obra-blue-900 flex flex-col p-3 gap-2">
                  <span className="font-display text-base text-white font-bold px-2 pt-1">obra</span>
                  {[
                    { icon:<FolderOpen className="size-3.5" />, label:"Proyectos", active:true  },
                    { icon:<BookOpen   className="size-3.5" />, label:"Ayuda",     active:false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded text-2xs font-body border-l-2 ${item.active ? "text-white border-obra-blue-700 bg-obra-blue-950/40" : "text-white/40 border-transparent"}`}>
                      <span className={item.active ? "text-white" : "text-white/40"}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-white p-5 flex flex-col gap-3">
                  <ObraGlobalStepper steps={steps} className="mb-2" />
                  <div className="flex gap-3">
                    <ObraSkeletonCard className="flex-1" />
                    <ObraSkeletonCard className="flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <div className="h-10" />
      </div>

      <ObraToastContainer toasts={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}