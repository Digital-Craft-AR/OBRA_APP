import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft, ChevronRight, RotateCw, Upload as UploadIcon, Trash2,
  Download, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { ObraButton }        from "../../components/obra/button";
import { ObraGlobalStepper } from "../../components/obra/stepper";
import { ObraModal }         from "../../components/obra/modal";
import { ObraTextarea }      from "../../components/obra/input";
import { ProductSidebar, type Product } from "../../components/obra/product-sidebar";
import { PagesSidebar, type Page } from "../../components/obra/pages-sidebar";
import { cn } from "../../components/ui/utils";

/* ── Mock data ──────────────────────────────────────────────────────────── */
type DeliverableStatus = "ready" | "generating" | "error";
type Deliverable = { id: string; label: string; status: DeliverableStatus; chapters?: string[] };

const MOCK_PRODUCTS: Product[] = [
  { id: "ebook",   label: "Ebook principal",            type: "ebook",  status: "ready" },
  { id: "bonus-1", label: "Bonus 1: Recetario aromas",  type: "bonus",  status: "ready" },
  { id: "bonus-2", label: "Bonus 2: Guía de packaging", type: "bonus",  status: "generating" },
  { id: "bonus-3", label: "Bonus 3: Plantilla precios", type: "bonus",  status: "ready" },
  { id: "bump-1",  label: "Order Bump 1: Kit de redes", type: "bump",   status: "error" },
];

const MOCK_PAGES: Record<string, Page[]> = {
  "ebook": Array.from({ length: 24 }, (_, i) => ({ id: `ebook-page-${i + 1}`, number: i + 1 })),
  "bonus-1": Array.from({ length: 8 }, (_, i) => ({ id: `bonus1-page-${i + 1}`, number: i + 1 })),
  "bonus-2": Array.from({ length: 6 }, (_, i) => ({ id: `bonus2-page-${i + 1}`, number: i + 1 })),
  "bonus-3": Array.from({ length: 4 }, (_, i) => ({ id: `bonus3-page-${i + 1}`, number: i + 1 })),
  "bump-1": Array.from({ length: 10 }, (_, i) => ({ id: `bump1-page-${i + 1}`, number: i + 1 })),
};

const DELIVERABLES: Deliverable[] = [
  {
    id:       "ebook",
    label:    "Ebook principal",
    status:   "ready",
    chapters: [
      "Introducción",
      "Tipos de ceras",
      "Aromas y esencias",
      "Equipamiento básico",
      "Tu primera vela",
      "Fotografía de producto",
      "Cómo poner precio",
    ],
  },
  { id: "bonus-1", label: "Bonus 1: Recetario de aromas",     status: "ready" },
  { id: "bonus-2", label: "Bonus 2: Guía de packaging",        status: "generating" },
  { id: "bonus-3", label: "Bonus 3: Plantilla de precios",     status: "ready" },
  { id: "bump-1",  label: "Order Bump 1: Kit de redes",        status: "error" },
];

/* ── Status dot ─────────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: DeliverableStatus }) {
  return (
    <span className={cn(
      "size-2 rounded-full shrink-0",
      status === "ready"      && "bg-obra-green-400",
      status === "generating" && "bg-obra-blue-100 animate-pulse",
      status === "error"      && "bg-red-400",
    )} />
  );
}

/* ── Export panel ───────────────────────────────────────────────────────── */
function ExportPanel() {
  const [zipError, setZipError] = useState(false);

  const statusChip = (status: DeliverableStatus) => (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-body font-medium",
      status === "ready"      && "bg-obra-green-400/20 text-obra-blue-950",
      status === "generating" && "bg-obra-blue-50 text-obra-blue-700",
      status === "error"      && "bg-red-50 text-red-600",
    )}>
      {status === "ready" ? "Listo" : status === "generating" ? "Generando" : "Error"}
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-sm font-semibold font-body text-obra-blue-950">Exportar tu paquete</h3>

      <div className="flex flex-col gap-2">
        {DELIVERABLES.map((d) => (
          <div key={d.id} className="flex items-center gap-3 p-3 bg-obra-blue-50 border border-obra-blue-100 rounded-card">
            <StatusDot status={d.status} />
            <span className="flex-1 text-sm font-body text-obra-blue-950 truncate">{d.label}</span>
            {statusChip(d.status)}
            <ObraButton
              variant="secondary"
              size="sm"
              disabled={d.status !== "ready"}
            >
              <Download className="size-3.5" />
            </ObraButton>
          </div>
        ))}
      </div>

      {zipError && (
        <div className="bg-red-50 border border-red-200 rounded-card px-4 py-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-sm font-body text-red-700">
              Error al generar el ZIP: Order Bump 1 no se pudo exportar.
            </span>
            <button className="block text-xs text-red-600 hover:underline font-body mt-1">
              Reintentar solo Order Bump 1
            </button>
          </div>
        </div>
      )}

      <ObraButton variant="primary" className="w-full" onClick={() => setZipError(true)}>
        <Download className="size-4" /> Descargar todo (ZIP)
      </ObraButton>

      <p className="text-xs text-obra-neutral-400 font-body text-center">
        La exportación no consume créditos.
      </p>
    </div>
  );
}

/* ── Main Preview ───────────────────────────────────────────────────────── */
export function WizardPreview() {
  const navigate       = useNavigate();
  const [selected,     setSelected]     = useState("ebook");
  const [showRegen,    setShowRegen]    = useState(false);
  const [regenNote,    setRegenNote]    = useState("");
  const [panel,        setPanel]        = useState<"preview" | "export">("preview");
  const [selectedPage, setSelectedPage] = useState<string | undefined>(MOCK_PAGES["ebook"][0]?.id);

  const handleSelectProduct = (productId: string) => {
    setSelected(productId);
    const pages = MOCK_PAGES[productId] || [];
    setSelectedPage(pages[0]?.id);
  };

  const productPages = MOCK_PAGES[selected] || [];
  const currentProduct = MOCK_PRODUCTS.find((p) => p.id === selected)!;

  const globalSteps = [
    { id: 1, label: "Estructura",   status: "completed" as const },
    { id: 2, label: "Contenido",    status: "completed" as const },
    { id: 3, label: "Vista previa", status: "active"    as const },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Dark nav bar */}
      <div className="px-6 py-2.5 bg-obra-blue-950 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/proyectos")}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white font-body transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Volver a proyectos
        </button>
      </div>

      {/* Top bar */}
      <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
        <ObraGlobalStepper steps={globalSteps} />
      </div>

      {/* Tabs bar */}
      <div className="px-10 py-3 border-b border-obra-blue-100 flex items-center justify-end">
        <div className="flex gap-0 border border-obra-blue-100 rounded-full p-0.5">
          {[
            { id:"preview", label:"Vista previa" },
            { id:"export",  label:"Exportar" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPanel(t.id as typeof panel)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all",
                panel === t.id ? "bg-obra-blue-700 text-white" : "text-obra-neutral-600 hover:text-obra-blue-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {panel === "export" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-wizard mx-auto px-10 py-8">
            <ExportPanel />
          </div>
        </div>
      ) : (
        /* Preview panel — split layout */
        <div className="flex-1 overflow-hidden flex">
          {/* Product sidebar (mini) */}
          <ProductSidebar
            products={MOCK_PRODUCTS}
            selectedId={selected}
            onSelectProduct={handleSelectProduct}
          />

          {/* Pages sidebar */}
          <PagesSidebar
            pages={productPages}
            currentPage={selectedPage}
            onSelectPage={setSelectedPage}
            productLabel={currentProduct.label}
          />

          {/* Main preview area */}
          <div className="flex-1 overflow-y-auto bg-obra-blue-50">
            <div className="w-[210mm] h-[297mm] mx-auto my-8 bg-white shadow-card-hover rounded-card overflow-hidden">
              {currentProduct.status === "generating" ? (
                <div className="p-12 flex flex-col items-center gap-4">
                  <Loader2 className="size-8 animate-spin text-obra-blue-700" />
                  <span className="text-sm font-body text-obra-neutral-600">Generando {currentProduct.label}...</span>
                </div>
              ) : currentProduct.status === "error" ? (
                <div className="p-12 flex flex-col items-center gap-4 text-center">
                  <AlertCircle className="size-10 text-red-400" />
                  <p className="text-sm font-body text-red-600">Error generando {currentProduct.label}</p>
                  <ObraButton variant="tertiary" size="sm">Reintentar</ObraButton>
                </div>
              ) : (
                <div>
                  {/* If it's the first page (cover), show only the cover image */}
                  {selectedPage === productPages[0]?.id ? (
                    <div className="relative group">
                      <div className="aspect-[3/4] bg-obra-blue-900 flex items-center justify-center overflow-hidden">
                        <div className="text-center text-white p-10">
                          <p className="font-display text-3xl leading-tight mb-4">
                            {currentProduct.id === "ebook"
                              ? "La guía definitiva de velas aromáticas artesanales"
                              : currentProduct.label.replace(/^(Bonus \d+|Order Bump \d+): /, "")}
                          </p>
                          <p className="text-base opacity-70 font-body">Valentina García</p>
                        </div>
                      </div>

                      {/* Hover overlay for cover */}
                      <div className="absolute inset-0 bg-obra-blue-950/0 group-hover:bg-obra-blue-950/60 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => setShowRegen(true)}
                          className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                        >
                          <RotateCw className="size-5" />
                        </button>
                        <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
                          <UploadIcon className="size-5" />
                        </button>
                        <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Regular content pages */}
                      <div className="bg-obra-blue-900 px-10 py-12 text-white">
                        <p className="font-display text-2xl leading-tight mb-2">
                          {currentProduct.id === "ebook"
                            ? "La guía definitiva de velas aromáticas artesanales"
                            : currentProduct.label.replace(/^(Bonus \d+|Order Bump \d+): /, "")}
                        </p>
                        <p className="text-sm opacity-70 font-body">Valentina García</p>
                      </div>

                      {/* Content */}
                      <div className="px-10 py-8 flex flex-col gap-6">
                        {/* Image slot */}
                        <div
                          className="relative group h-48 bg-gradient-to-br from-obra-blue-100 to-obra-blue-200 rounded-card overflow-hidden cursor-pointer"
                          onClick={() => setShowRegen(true)}
                        >
                          <div className="absolute inset-0 bg-obra-blue-950/0 group-hover:bg-obra-blue-950/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                            <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
                              <RotateCw className="size-4" />
                            </button>
                            <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
                              <UploadIcon className="size-4" />
                            </button>
                            <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          <span className="absolute bottom-2 right-3 text-xs text-obra-neutral-400 font-body opacity-0 group-hover:opacity-100 transition-opacity">
                            Clic para regenerar
                          </span>
                        </div>

                        {/* Body text */}
                        <div className="flex flex-col gap-4 font-body text-obra-neutral-900 text-sm leading-relaxed">
                          <h2 className="font-display text-lg text-obra-blue-950">Introducción</h2>
                          <p>Este libro nace de la experiencia de cientos de emprendedoras que transformaron su hobby artesanal en una fuente de ingresos real y sustentable. A lo largo de estas páginas encontrarás el sistema que usamos para crear marcas de velas desde cero.</p>
                          <p>La clave no está en tener el mejor producto: está en saber presentarlo, ponerle precio y venderlo con confianza. Eso es exactamente lo que aprenderás aquí.</p>
                          <h3 className="font-semibold text-obra-blue-950 mt-2">¿Para quién es este ebook?</h3>
                          <p>Para mujeres que ya elaboran velas en casa y quieren dar el salto al mercado. No necesitás experiencia previa en marketing ni en ventas online. Solo necesitás tu producto y las ganas de construir algo tuyo.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regenerate image modal */}
      <ObraModal
        open={showRegen}
        onClose={() => setShowRegen(false)}
        title="Regenerar imagen"
        description="Solo se cobran créditos al confirmar."
        footer={
          <>
            <ObraButton variant="tertiary" onClick={() => setShowRegen(false)}>Cancelar</ObraButton>
            <ObraButton variant="secondary" onClick={() => setShowRegen(false)}>
              Confirmar
            </ObraButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ObraTextarea
            label="Describí cómo querés la nueva imagen (opcional)"
            placeholder="Ej: velas sobre una mesa de madera, iluminación cálida, estilo minimalista..."
            value={regenNote}
            onChange={(e) => setRegenNote(e.target.value)}
          />
          {/* Preview area */}
          <div className="h-40 bg-gradient-to-br from-obra-blue-100 to-obra-blue-200 rounded-card flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="size-8 text-obra-green-400" />
              <span className="text-xs font-body text-obra-neutral-600">Vista previa de la nueva imagen</span>
            </div>
          </div>
        </div>
      </ObraModal>

      {/* Bottom nav */}
      <div className="px-10 py-5 border-t border-obra-blue-100 flex items-center justify-between shrink-0">
        <ObraButton variant="tertiary" onClick={() => navigate("/proyectos/demo/contenido")}>
          ← Anterior
        </ObraButton>
        <ObraButton variant="primary" onClick={() => navigate("/proyectos")}>
          Publicar proyecto →
        </ObraButton>
      </div>
    </div>
  );
}