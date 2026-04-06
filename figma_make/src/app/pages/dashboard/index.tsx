import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, MoreHorizontal, Play, ChevronRight } from "lucide-react";
import { ObraButton } from "../../components/obra/button";
import { ObraInput } from "../../components/obra/input";
import { ObraProjectCard } from "../../components/obra/card";
import { ObraModal } from "../../components/obra/modal";
import { ObraEmptyState } from "../../components/obra/empty-state";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/* ── Mock data ──────────────────────────────────────────────────────────── */
const MOCK_PROJECTS = [
  {
    id: "1",
    name: "Guía completa de velas aromáticas artesanales",
    status: "draft" as const,
    lastModified: "Hace 2 horas",
    palette: ["#204970", "#C8E62B", "#E8F0F7"] as [string,string,string],
    artifactCount: "1 ebook · 3 bonuses",
  },
  {
    id: "2",
    name: "Emprender con repostería desde casa",
    status: "published" as const,
    lastModified: "Ayer",
    palette: ["#C8372D", "#F5A623", "#F8FAFB"] as [string,string,string],
    artifactCount: "1 ebook · 2 bonuses · 1 bump",
  },
  {
    id: "3",
    name: "Marketing digital para coaches",
    status: "modified" as const,
    lastModified: "Hace 5 días",
    palette: ["#6B4EFF", "#FF6B6B", "#F4F8FC"] as [string,string,string],
    artifactCount: "1 ebook · 5 bonuses",
  },
  {
    id: "4",
    name: "Finanzas personales para freelancers",
    status: "draft" as const,
    lastModified: "Hace 1 semana",
    palette: ["#0F2438", "#C8E62B", "#DDE8F0"] as [string,string,string],
    artifactCount: "1 ebook",
  },
  {
    id: "5",
    name: "Yoga en casa: programa completo de 30 días",
    status: "published" as const,
    lastModified: "Hace 2 semanas",
    palette: ["#2D6499", "#A78BFA", "#F4F8FC"] as [string,string,string],
    artifactCount: "1 ebook · 5 bonuses · 2 bumps",
  },
];

/* ── New Project Modal ──────────────────────────────────────────────────── */
const LOCALES = [
  { id: "es",   flag: "🇦🇷", label: "Español",        sub: "Argentina / España" },
  { id: "pt",   flag: "🇧🇷", label: "Português Brasil", sub: "Brasil" },
  { id: "en-us",flag: "🇺🇸", label: "English US",      sub: "United States" },
  { id: "en-uk",flag: "🇬🇧", label: "English UK",      sub: "United Kingdom" },
];

function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate  = useNavigate();
  const [step,    setStep]    = useState(1);
  const [name,    setName]    = useState("");
  const [locale,  setLocale]  = useState("es");

  const handleClose = () => { setStep(1); setName(""); onClose(); };
  const handleBegin = () => {
    handleClose();
    navigate("/proyectos/demo/modo");
  };

  const stepLabels = ["Nombre", "Idioma del contenido"];

  return (
    <ObraModal
      open={open}
      onClose={handleClose}
      title="Nuevo proyecto"
      description={`Paso ${step} de 2 — ${stepLabels[step - 1]}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <ObraButton
            variant="tertiary"
            onClick={step === 1 ? handleClose : () => setStep((s) => s - 1)}
          >
            {step === 1 ? "Cancelar" : "← Anterior"}
          </ObraButton>
          {step < 2 ? (
            <ObraButton variant="secondary" onClick={() => setStep((s) => s + 1)}>
              Siguiente →
            </ObraButton>
          ) : (
            <ObraButton variant="primary" onClick={handleBegin}>
              Crear proyecto →
            </ObraButton>
          )}
        </div>
      }
    >
      {/* Step 1 — Name */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <ObraInput
            label="Nombre del proyecto"
            placeholder="Ej: Guía completa de velas aromáticas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="Podés cambiarlo en cualquier momento."
          />
        </div>
      )}

      {/* Step 2 — Locale */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-obra-neutral-600 font-body">
            El idioma del contenido generado es <strong>permanente</strong>. Si necesitás otro idioma, creá un proyecto separado.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {LOCALES.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setLocale(loc.id)}
                className={`flex items-center gap-3 p-3 rounded-card border text-left transition-all ${
                  locale === loc.id
                    ? "border-obra-blue-700 bg-obra-blue-50"
                    : "border-obra-blue-100 hover:border-obra-blue-700/50"
                }`}
              >
                <span className="text-2xl">{loc.flag}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold font-body text-obra-blue-950">{loc.label}</span>
                  <span className="text-xs text-obra-neutral-600 font-body">{loc.sub}</span>
                </div>
                {locale === loc.id && (
                  <svg className="ml-auto shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6499" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </ObraModal>
  );
}

/* ── Project Action Menu ────────────────────────────────────────────────── */
function ProjectMenu({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Opciones del proyecto"
          className="p-1 rounded-full text-obra-neutral-600 hover:bg-obra-blue-50 hover:text-obra-blue-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-44 bg-white border border-obra-blue-100 rounded-card shadow-card-hover p-1 font-body"
          sideOffset={4}
          align="end"
        >
          {[
            { label: "Abrir proyecto",  action: () => navigate(`/proyectos/${projectId}/estructura`) },
            { label: "Duplicar",        action: () => {} },
            { label: "Archivar",        action: () => {} },
          ].map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.action}
              className="flex items-center px-3 py-2 text-sm text-obra-blue-950 rounded hover:bg-obra-blue-50 outline-none cursor-pointer"
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="h-px bg-obra-blue-100 my-1" />
          <DropdownMenu.Item
            onSelect={() => {}}
            className="flex items-center px-3 py-2 text-sm text-red-500 rounded hover:bg-red-50 outline-none cursor-pointer"
          >
            Eliminar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */
export function Dashboard() {
  const navigate    = useNavigate();
  const [tab,       setTab]       = useState<"activos" | "archivados" | "papelera">("activos");
  const [modalOpen, setModalOpen] = useState(false);
  const [isEmpty,   setIsEmpty]   = useState(false);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "activos",    label: "Activos" },
    { id: "archivados", label: "Archivados" },
    { id: "papelera",   label: "Papelera" },
  ];

  return (
    <div className="h-full flex flex-col">

      {/* Empty state */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-10 py-10">
          {/* Video placeholder */}
          <div className="w-full max-w-2xl aspect-video bg-obra-blue-50 border border-obra-blue-100 rounded-card flex items-center justify-center relative overflow-hidden">
            <button className="size-14 rounded-full bg-obra-blue-900/80 flex items-center justify-center hover:bg-obra-blue-900 transition-colors">
              <Play className="size-6 text-white ml-0.5" />
            </button>
            <span className="absolute bottom-3 left-4 text-xs text-obra-neutral-600 font-body">
              Recorrido guiado — 3 min
            </span>
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="font-display text-2xl text-obra-blue-950">
              Creá tu primer infoproducto
            </h1>
            <p className="text-sm text-obra-neutral-600 font-body max-w-md leading-relaxed">
              Usá la inteligencia artificial de Obra para crear un ebook completo con bonuses y order bumps en minutos.
            </p>
            <div className="flex items-center gap-3">
              <ObraButton variant="primary" onClick={() => setModalOpen(true)}>
                <Plus className="size-4" /> Crear proyecto
              </ObraButton>
              <ObraButton variant="tertiary" onClick={() => setIsEmpty(false)}>
                Ver recorrido guiado
              </ObraButton>
            </div>
          </div>          
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Top bar */}
          <div className="px-10 py-6 flex items-center justify-between border-b border-obra-blue-100">
            <h1 className="font-display text-xl text-obra-blue-950">Mis proyectos</h1>
            <div className="flex items-center gap-3">
              <ObraButton variant="primary" onClick={() => setModalOpen(true)}>
                <Plus className="size-4" /> Nuevo proyecto
              </ObraButton>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-10 flex gap-0 border-b border-obra-blue-100">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-body font-medium border-b-2 -mb-px transition-all ${
                  tab === t.id
                    ? "text-obra-blue-700 border-obra-blue-700"
                    : "text-obra-neutral-600 border-transparent hover:text-obra-blue-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-10 py-8">
            {tab === "activos" ? (
              <div className="grid grid-cols-3 gap-5">
                {MOCK_PROJECTS.map((p) => (
                  <div key={p.id} className="relative group">
                    <ObraProjectCard
                      {...p}
                      onClick={() => navigate(`/proyectos/${p.id}/estructura`)}
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ProjectMenu projectId={p.id} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="text-sm text-obra-neutral-400 font-body">
                  {tab === "archivados" ? "No hay proyectos archivados" : "La papelera está vacía"}
                </span>
                <button
                  onClick={() => setTab("activos")}
                  className="text-sm text-obra-blue-700 hover:underline font-body flex items-center gap-1"
                >
                  Ver proyectos activos <ChevronRight className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Dev toggle — floating */}
      <button
        onClick={() => setIsEmpty(true)}
        className="fixed bottom-6 right-6 z-50 px-3 py-1.5 rounded-full text-xs font-mono bg-black/70 text-white/60 hover:text-white hover:bg-black/90 transition-all shadow-lg backdrop-blur-sm"
      >
        toggle empty
      </button>
    </div>
  );
}