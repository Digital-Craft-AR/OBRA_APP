import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Upload, GripVertical, Trash2, Plus, RotateCw, ChevronLeft } from "lucide-react";
import { ObraButton }        from "../../components/obra/button";
import { ObraGlobalStepper } from "../../components/obra/stepper";
import { cn } from "../../components/ui/utils";

type UploadState = "idle" | "dragover" | "uploading" | "error-format" | "error-size" | "error-password" | "error-empty" | "done";
type AlignChapter = { id: number; title: string };

const EXTRACTED_TEXT = `INTRODUCCIÓN

Este libro nace de mi experiencia personal como emprendedora artesanal.
Durante más de cinco años elaboré velas aromáticas en mi cocina antes
de convertirlo en mi principal fuente de ingresos.

CAPÍTULO 1 — TIPOS DE CERAS

La elección de la cera es la decisión más importante que tomarás...
La cera de soja es la favorita de los artesanos modernos por su...

CAPÍTULO 2 — AROMAS Y ESENCIAS

Las esencias fragantes definen la identidad de tu marca...
El porcentaje de fragancia varía según el tipo de cera...`;

export function WizardContenidoUpload() {
  const navigate      = useNavigate();
  const { id }        = useParams();
  const fileRef       = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress,    setProgress]    = useState(0);
  const [view,        setView]        = useState<"upload" | "alignment">("upload");
  const [chapters,    setChapters]    = useState<AlignChapter[]>([
    { id: 1, title: "Introducción: el mundo de las velas artesanales" },
    { id: 2, title: "Tipos de ceras y sus propiedades" },
    { id: 3, title: "Aromas, colorantes y aditivos" },
    { id: 4, title: "Equipamiento básico para empezar" },
    { id: 5, title: "Tu primera vela paso a paso" },
  ]);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.name.match(/\.(docx|pdf)$/i)) { setUploadState("error-format"); return; }
    if (file.size > 10 * 1024 * 1024)       { setUploadState("error-size");   return; }

    setUploadState("uploading");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); setUploadState("done"); return 100; }
        return p + 8;
      });
    }, 150);
  };

  const globalSteps = [
    { id: 1, label: "Estructura",   status: "completed" as const },
    { id: 2, label: "Contenido",    status: "active"    as const },
    { id: 3, label: "Vista previa", status: "upcoming"  as const },
  ];

  const ERROR_MESSAGES: Partial<Record<UploadState, string>> = {
    "error-format":   "Formato incorrecto. Solo se aceptan .docx o PDF con texto seleccionable.",
    "error-size":     "El archivo es muy grande. El límite es 10 MB.",
    "error-password": "El PDF está protegido con contraseña. Desbloquéalo antes de subir.",
    "error-empty":    "No se pudo extraer texto del archivo. Verificá que tenga texto seleccionable.",
  };

  if (view === "alignment") {
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

        <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
          <ObraGlobalStepper steps={globalSteps} />
        </div>

        <div className="px-10 py-4 border-b border-obra-blue-100 flex items-center justify-between">
          <span className="text-sm font-semibold font-body text-obra-blue-950">Alineación de capítulos</span>
        </div>

        {/* Split */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-obra-blue-100">
            <div className="flex items-center justify-between px-8 py-4 border-b border-obra-blue-100">
              <span className="text-sm font-medium font-body text-obra-blue-950">Propuesta de capítulos</span>
              <button className="flex items-center gap-1.5 text-sm text-obra-blue-700 hover:underline font-body">
                <RotateCw className="size-3.5" /> Regenerar propuesta
                <span className="ml-1 text-xs text-obra-neutral-400">(2 créditos)</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-2">
              {chapters.map((ch, i) => (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 p-3 rounded-card border border-obra-blue-100 bg-white"
                >
                  <GripVertical className="size-4 text-obra-neutral-400 shrink-0 cursor-grab" />
                  <span className="text-sm font-body text-obra-neutral-600 shrink-0 w-6">{i + 1}.</span>
                  <input
                    value={ch.title}
                    onChange={(e) =>
                      setChapters(chapters.map((c) => c.id === ch.id ? { ...c, title: e.target.value } : c))
                    }
                    className="flex-1 text-sm font-body text-obra-blue-950 bg-transparent outline-none border-b border-transparent focus:border-obra-blue-700"
                  />
                  <button
                    onClick={() => setChapters(chapters.filter((c) => c.id !== ch.id))}
                    className="p-1 rounded text-obra-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setChapters((c) => [...c, { id: Date.now(), title: `Capítulo ${c.length + 1}` }])}
                className="flex items-center gap-2 text-sm text-obra-blue-700 hover:underline font-body py-2"
              >
                <Plus className="size-4" /> Añadir capítulo
              </button>
            </div>
          </div>

          {/* Right — raw text */}
          <div className="w-96 shrink-0 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-obra-blue-100">
              <span className="text-sm font-semibold font-body text-obra-blue-950">Tu documento original</span>
              <p className="text-xs text-obra-neutral-600 font-body mt-0.5">Solo lectura · texto extraído</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs font-body text-obra-neutral-600 whitespace-pre-wrap leading-relaxed">
                {EXTRACTED_TEXT}
              </pre>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="px-10 py-5 border-t border-obra-blue-100 flex items-center justify-between">
          <ObraButton variant="tertiary" onClick={() => setView("upload")}>
            ← Anterior
          </ObraButton>
          <ObraButton variant="primary" onClick={() => navigate(`/proyectos/${id}/contenido`, { state: { fromUpload: true } })}>
            Aprobar alineación →
          </ObraButton>
        </div>
      </div>
    );
  }

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

      <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
        <ObraGlobalStepper steps={globalSteps} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-wizard mx-auto px-10 py-10 flex flex-col gap-8">

          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl text-obra-blue-950">Subí tu manuscrito</h2>
            <p className="text-sm text-obra-neutral-600 font-body">
              Cargá tu archivo y la IA lo analizará para proponer la estructura del ebook.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setUploadState("dragover"); }}
            onDragLeave={() => setUploadState("idle")}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => uploadState === "idle" && fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-card p-12 flex flex-col items-center gap-4 transition-all cursor-pointer",
              uploadState === "dragover"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : uploadState === "done"
                ? "border-obra-green-400/60 bg-obra-green-400/5 cursor-default"
                : uploadState.startsWith("error")
                ? "border-red-300 bg-red-50 cursor-default"
                : "border-obra-blue-100 hover:border-obra-blue-700/50 hover:bg-obra-blue-50/50"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {uploadState === "done" ? (
              <>
                <div className="size-14 rounded-full bg-obra-green-400/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#204970" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold font-body text-obra-blue-950">Archivo cargado correctamente</span>
              </>
            ) : uploadState.startsWith("error") ? (
              <>
                <div className="size-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold font-body text-red-600">
                  {ERROR_MESSAGES[uploadState]}
                </span>
                <ObraButton variant="tertiary" size="sm" onClick={() => setUploadState("idle")}>
                  Intentar de nuevo
                </ObraButton>
              </>
            ) : (
              <>
                <div className="size-14 rounded-full bg-obra-blue-100 flex items-center justify-center">
                  <Upload className="size-6 text-obra-blue-700" />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-sm font-semibold font-body text-obra-blue-950">
                    Arrastrá tu archivo acá
                  </span>
                  <span className="text-sm text-obra-neutral-600 font-body">
                    o{" "}
                    <span className="text-obra-blue-700 underline">hacé clic para elegir</span>
                  </span>
                </div>
                <span className="text-xs text-obra-neutral-400 font-body text-center">
                  .docx o PDF con texto seleccionable · Máx. 10 MB · Un archivo a la vez
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {uploadState === "uploading" && (
            <div className="flex flex-col gap-3">
              <div className="w-full bg-obra-blue-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-obra-blue-700 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-obra-neutral-600 font-body text-center">
                Analizando tu documento...
              </span>
            </div>
          )}

          {/* Error state annotations */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Formato incorrecto",   action: () => setUploadState("error-format") },
              { label: "Archivo muy grande",    action: () => setUploadState("error-size") },
              { label: "PDF con contraseña",    action: () => setUploadState("error-password") },
              { label: "Extracción vacía",      action: () => setUploadState("error-empty") },
            ].map((e) => (
              <button
                key={e.label}
                onClick={e.action}
                className="p-3 border border-obra-blue-100 rounded-card text-xs font-body text-obra-neutral-600 hover:border-obra-blue-700/50 hover:text-obra-blue-700 transition-all text-left"
              >
                Simular: {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-10 py-4 border-t border-obra-blue-100 flex items-center justify-between">
        <ObraButton variant="tertiary" onClick={() => navigate(`/proyectos/${id}/estructura`, { state: { step: 7 } })}>
          ← Anterior
        </ObraButton>
        <ObraButton
          variant="primary"
          disabled={uploadState !== "done"}
          onClick={() => setView("alignment")}
        >
          Siguiente →
        </ObraButton>
      </div>
    </div>
  );
}