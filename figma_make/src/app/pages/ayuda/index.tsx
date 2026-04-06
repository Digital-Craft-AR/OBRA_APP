import { useState } from "react";
import { ChevronDown, Copy, Mail } from "lucide-react";
import { ObraButton } from "../../components/obra/button";
import { cn } from "../../components/ui/utils";

const FAQ_ITEMS = [
  {
    q: "¿Qué es Obra?",
    a: "Obra es una plataforma que usa inteligencia artificial para ayudarte a crear infoproductos completos: ebooks, bonuses y order bumps. Desde la estructura hasta el diseño y la exportación en PDF.",
  },
  {
    q: "¿En qué idiomas puedo crear mi infoproducto?",
    a: "Podés crear contenido en Español (Argentina/España), Português Brasil, English US e English UK. El idioma afecta tanto el texto generado por la IA como ciertos aspectos de formato.",
  },
  {
    q: "¿Cómo funciona el pago y la suscripción?",
    a: "Los pagos se procesan a través de Mercado Pago. La suscripción se renueva mensualmente de forma automática. Podés cancelarla en cualquier momento desde la sección de Facturación.",
  },
  {
    q: "¿Qué son los créditos y para qué se usan?",
    a: "Los créditos se consumen al generar contenido con IA: textos de capítulos, mejoras de avatar, generación de imágenes y portadas. La exportación en PDF no consume créditos. Cada plan incluye un número de créditos mensuales.",
  },
  {
    q: "¿Cuántos proyectos puedo tener activos?",
    a: "Con el Plan Creador podés tener proyectos ilimitados activos simultáneamente. Los proyectos archivados no cuentan para ningún límite.",
  },
  {
    q: "¿Cómo descargo mi ebook o paquete?",
    a: "Desde la sección Vista previa, usá el panel de Exportación para descargar cada entregable en PDF de forma individual o todo el paquete como un archivo ZIP. La descarga no consume créditos.",
  },
  {
    q: "¿Puedo subir mi propio manuscrito en lugar de generar el contenido con IA?",
    a: "Sí. Al crear un nuevo proyecto podés elegir 'Subir mi manuscrito' para cargar un archivo .docx o PDF con texto seleccionable. La IA lo analizará y propondrá la estructura de capítulos.",
  },
  {
    q: "¿Cómo elimino un proyecto?",
    a: "Desde la pantalla de Proyectos hacé clic en los tres puntos del proyecto y seleccioná 'Eliminar'. El proyecto pasará a la Papelera y se eliminará definitivamente en 30 días. Podés restaurarlo desde la Papelera antes de ese plazo.",
  },
  {
    q: "¿Obra vende o comercializa mi producto?",
    a: "No. Obra es una herramienta de creación. Vos sos el único dueño de todo el contenido generado y tenés el control absoluto sobre cómo, dónde y a qué precio lo vendés.",
  },
  {
    q: "¿Cómo me contacto con el soporte?",
    a: "Podés escribirnos a hola@obra.app. Incluí en el mensaje: tu email registrado, una descripción del problema y, si aplica, el nombre del proyecto afectado. Respondemos en orden de llegada.",
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: typeof FAQ_ITEMS[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-obra-blue-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left py-4 px-0 group"
        aria-expanded={isOpen}
      >
        <span className={cn(
          "text-sm font-semibold font-body transition-colors",
          isOpen ? "text-obra-blue-700" : "text-obra-blue-950 group-hover:text-obra-blue-700"
        )}>
          {item.q}
        </span>
        <ChevronDown className={cn(
          "size-4 shrink-0 text-obra-neutral-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="pb-5 pr-6">
          <p className="text-sm font-body text-obra-neutral-600 leading-relaxed">
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

export function Ayuda() {
  const [openIndex, setOpenIndex] = useState<number | null>(9);
  const [copied,    setCopied]    = useState(false);

  const SUPPORT_EMAIL = "hola@obra.app";

  const copyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-10 py-10 max-w-content mx-auto flex flex-col gap-10">

      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl text-obra-blue-950">Ayuda y soporte</h1>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">
          Respuestas a las preguntas más frecuentes sobre Obra.
        </p>
      </div>

      {/* Accordion */}
      <div className="bg-white border border-obra-blue-100 rounded-card px-6 py-2">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>

      {/* Contact block */}
      <div className="bg-obra-blue-50 border border-obra-blue-100 rounded-card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-obra-blue-100 flex items-center justify-center shrink-0">
            <Mail className="size-5 text-obra-blue-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-body text-obra-blue-950">Contacto</h3>
            <p className="text-xs text-obra-neutral-600 font-body">¿No encontraste respuesta? Escribinos directamente.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-body bg-white border border-obra-blue-100 rounded-input px-3 py-2 text-obra-blue-950">
            {SUPPORT_EMAIL}
          </code>
          <button
            onClick={copyEmail}
            className="p-2.5 rounded-input border border-obra-blue-100 bg-white text-obra-neutral-600 hover:text-obra-blue-700 hover:border-obra-blue-700/50 transition-all"
            aria-label="Copiar email"
          >
            <Copy className="size-4" />
          </button>
        </div>

        {copied && (
          <span className="text-xs text-obra-blue-700 font-body">¡Email copiado!</span>
        )}

        <ObraButton variant="secondary" className="self-start" onClick={() => {
          window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Consulta desde Obra`;
        }}>
          Abrir correo
        </ObraButton>

        <p className="text-xs text-obra-neutral-400 font-body leading-relaxed">
          Incluí en tu mensaje: tu email registrado, descripción del problema y, si aplica, el nombre del proyecto. Respondemos en orden de llegada.
        </p>
      </div>

      <div className="h-6" />
    </div>
  );
}