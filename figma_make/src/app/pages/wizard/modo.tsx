import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Check } from "lucide-react";
import { ObraButton } from "../../components/obra/button";
import { cn } from "../../components/ui/utils";

type Branch = "ai" | "upload";

const BRANCH_OPTIONS: {
  id:      Branch;
  icon:    React.ReactNode;
  label:   string;
  badge:   string;
  desc:    string;
  details: string[];
}[] = [
  {
    id:    "ai",
    icon:  (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
    ),
    label:   "Crear con IA",
    badge:   "Recomendado",
    desc:    "La IA redacta el índice y todo el contenido de tu ebook basándose en tu tema, avatar y estructura.",
    details: [
      "Índice generado y editable antes de escribir",
      "Redacción completa de cada capítulo con IA",
      "Chat de asistencia en cada paso",
    ],
  },
  {
    id:    "upload",
    icon:  (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" x2="12" y1="3" y2="15"/>
      </svg>
    ),
    label:   "Subir mi manuscrito",
    badge:   "Tengo mi texto",
    desc:    "Ya tenés el contenido escrito. Subí tu archivo y la IA lo analiza y organiza en capítulos automáticamente.",
    details: [
      "Acepta .docx y PDF con texto seleccionable",
      "Análisis automático de estructura e índice",
      "Máximo 10 MB · un archivo a la vez",
    ],
  },
];

export function WizardModo() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const [selected, setSelected] = useState<Branch>("ai");

  const handleContinuar = () => {
    localStorage.setItem(`obra_branch_${id}`, selected);
    navigate(`/proyectos/${id}/estructura`);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl px-10 py-12 flex flex-col gap-10">

          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-full bg-obra-blue-700 text-white text-xs font-semibold font-body flex items-center justify-center">1</span>
              <span className="text-xs font-semibold font-body text-obra-blue-700 uppercase tracking-wide">Paso previo al wizard</span>
            </div>
            <h1 className="font-display text-2xl text-obra-blue-950">¿Cómo querés crear tu ebook?</h1>
            <p className="text-sm text-obra-neutral-600 font-body">
              Elegí el punto de partida. Ambos caminos usan la misma configuración de estructura y diseño.
            </p>
          </div>

          {/* Option cards */}
          <div className="flex flex-col gap-4">
            {BRANCH_OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  className={cn(
                    "flex items-start gap-5 p-6 rounded-card border-2 text-left transition-all",
                    isSelected
                      ? "border-obra-blue-700 bg-obra-blue-50"
                      : "border-obra-blue-100 hover:border-obra-blue-700/40 bg-white"
                  )}
                >
                  {/* Icon circle */}
                  <div className={cn(
                    "size-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-obra-blue-700 text-white" : "bg-obra-blue-100 text-obra-blue-700"
                  )}>
                    {opt.icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold font-body text-obra-blue-950">
                        {opt.label}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-body font-medium transition-colors",
                        isSelected
                          ? "bg-obra-blue-700 text-white"
                          : "bg-obra-blue-100 text-obra-blue-700"
                      )}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-sm text-obra-neutral-600 font-body leading-relaxed">
                      {opt.desc}
                    </p>
                    <ul className="flex flex-col gap-1.5 mt-1">
                      {opt.details.map((d) => (
                        <li key={d} className="flex items-center gap-2">
                          <Check className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            isSelected ? "text-obra-blue-700" : "text-obra-neutral-400"
                          )} />
                          <span className="text-xs text-obra-neutral-600 font-body">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Radio indicator */}
                  <div className={cn(
                    "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all",
                    isSelected ? "border-obra-blue-700" : "border-obra-neutral-300"
                  )}>
                    {isSelected && (
                      <span className="size-2.5 rounded-full bg-obra-blue-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Contextual note for upload */}
          {selected === "upload" && (
            <div className="bg-obra-blue-50 border border-obra-blue-100 rounded-card px-4 py-3 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6499" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <span className="text-sm font-body text-obra-blue-950 leading-relaxed">
                Primero configurás la estructura y el diseño. La carga del archivo ocurre al inicio del paso de Contenido, justo antes de definir el índice.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-10 py-5 border-t border-obra-blue-100 flex items-center justify-between">
        <ObraButton variant="tertiary" onClick={() => navigate("/proyectos")}>
          ← Cancelar
        </ObraButton>
        <ObraButton variant="primary" onClick={handleContinuar}>
          Continuar →
        </ObraButton>
      </div>
    </div>
  );
}
