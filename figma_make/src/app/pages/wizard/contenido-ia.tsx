import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import {
  GripVertical, Trash2, Plus, Send, X, Lock, ChevronLeft,
  ChevronRight, Save,
} from "lucide-react";
import { ObraButton }        from "../../components/obra/button";
import { ObraGlobalStepper } from "../../components/obra/stepper";
import { ProductSidebar, type Product } from "../../components/obra/product-sidebar";
import { ChaptersSidebar, type Chapter } from "../../components/obra/chapters-sidebar";
import { cn } from "../../components/ui/utils";

/* ── Mock data ──────────────────────────────────────────────────────────── */
const MOCK_PRODUCTS: Product[] = [
  { id: "ebook",   label: "Ebook principal",            type: "ebook",  status: "ready" },
  { id: "bonus-1", label: "Bonus 1: Recetario aromas",  type: "bonus",  status: "ready" },
  { id: "bonus-2", label: "Bonus 2: Guía de packaging", type: "bonus",  status: "generating" },
  { id: "bonus-3", label: "Bonus 3: Plantilla precios", type: "bonus",  status: "ready" },
  { id: "bump-1",  label: "Order Bump 1: Kit de redes", type: "bump",   status: "ready" },
];

const MOCK_CHAPTERS: Record<string, Chapter[]> = {
  "ebook": [
    { id: "ch-1", title: "Introducción: el mundo de las velas artesanales" },
    { id: "ch-2", title: "Tipos de ceras y sus propiedades" },
    { id: "ch-3", title: "Aromas, colorantes y aditivos" },
    { id: "ch-4", title: "Equipamiento básico para empezar" },
    { id: "ch-5", title: "Tu primera vela paso a paso" },
    { id: "ch-6", title: "Fotografía de producto desde cero" },
    { id: "ch-7", title: "Cómo poner precio a tus velas" },
  ],
  "bonus-1": [
    { id: "b1-ch-1", title: "Introducción a los aromas" },
    { id: "b1-ch-2", title: "Combinaciones clásicas" },
    { id: "b1-ch-3", title: "Recetas experimentales" },
  ],
  "bonus-2": [
    { id: "b2-ch-1", title: "Fundamentos del packaging" },
    { id: "b2-ch-2", title: "Materiales recomendados" },
  ],
  "bonus-3": [
    { id: "b3-ch-1", title: "Estructura de costos" },
    { id: "b3-ch-2", title: "Cálculo de precio final" },
  ],
  "bump-1": [
    { id: "bump-ch-1", title: "Estrategias de redes sociales" },
    { id: "bump-ch-2", title: "Plantillas para Instagram" },
    { id: "bump-ch-3", title: "Calendarios de contenido" },
  ],
};

const INITIAL_CHAPTERS = [
  "Introducción: el mundo de las velas artesanales",
  "Tipos de ceras y sus propiedades",
  "Aromas, colorantes y aditivos",
  "Equipamiento básico para empezar",
  "Tu primera vela paso a paso",
  "Fotografía de producto desde cero",
  "Cómo poner precio a tus velas",
];

type ChatMessage = {
  id:   number;
  role: "user" | "assistant";
  text: string;
};

const INITIAL_CHAT: ChatMessage[] = [
  {
    id:   1,
    role: "assistant",
    text: "Hola, soy tu asistente para el índice. ¿Querés agregar algún capítulo, cambiar el orden o ajustar algún título?",
  },
];

/* ── Chat panel ─────────────────────────────────────────────────────────── */
function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend:   (text: string) => void;
}) {
  const [input, setInput]    = useState("");
  const bottomRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-obra-blue-100">
        <span className="text-sm font-semibold font-body text-obra-blue-950">Asistente IA</span>
        <p className="text-xs text-obra-neutral-600 font-body mt-0.5">Scoped al índice del ebook</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-xs rounded-card p-3 text-sm font-body",
              msg.role === "user"
                ? "self-end bg-obra-blue-50 text-obra-blue-950 border border-obra-blue-100"
                : "self-start bg-white text-obra-blue-950 border border-obra-blue-100"
            )}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-obra-blue-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Describí cómo querés ajustar el índice..."
          className="flex-1 text-sm font-body bg-obra-neutral-100 border border-obra-neutral-200 rounded-input px-3 py-2 outline-none focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700 placeholder:text-obra-neutral-400"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="size-10 rounded-full bg-obra-blue-700 text-white flex items-center justify-center hover:bg-obra-blue-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Índice editor ──────────────────────────────────────────────────────── */
export function WizardContenidoIA() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const location    = useLocation();
  const fromUpload  = (location.state as { fromUpload?: boolean } | null)?.fromUpload ?? false;

  const [chapters,  setChapters]  = useState(INITIAL_CHAPTERS);
  const [messages,  setMessages]  = useState<ChatMessage[]>(INITIAL_CHAT);
  const [frozen,    setFrozen]    = useState(fromUpload);
  const [showBanner, setShowBanner] = useState(true);
  const [showEditorBanner, setShowEditorBanner] = useState(true);
  const [view,      setView]      = useState<"index" | "editor">(fromUpload ? "editor" : "index");
  const [currentCh, setCurrentCh] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState("ebook");
  const [selectedChapter, setSelectedChapter] = useState<string | undefined>(MOCK_CHAPTERS["ebook"][0]?.id);

  const addChapter = () => setChapters((c) => [...c, `Capítulo ${c.length + 1}`]);
  const removeChapter = (i: number) => setChapters((c) => c.filter((_, ci) => ci !== i));

  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId);
    const chapters = MOCK_CHAPTERS[productId] || [];
    setSelectedChapter(chapters[0]?.id);
  };

  const productChapters = MOCK_CHAPTERS[selectedProduct] || [];
  const currentProduct = MOCK_PRODUCTS.find((p) => p.id === selectedProduct)!;

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id:   Date.now() + 1,
        role: "assistant",
        text: "Entendido. ¿Querés que aplique ese cambio al índice? Confirmá y actualizo la lista.",
      };
      setMessages((m) => [...m, aiMsg]);
    }, 1000);
  };

  const globalSteps = [
    { id: 1, label: "Estructura",   status: "completed" as const },
    { id: 2, label: "Contenido",    status: "active"    as const },
    { id: 3, label: "Vista previa", status: "upcoming"  as const },
  ];

  if (view === "editor") {
    return (
      <div className="h-screen flex flex-col">
        {/* Dark nav bar */}
        <div className="px-6 py-4 bg-obra-blue-950 flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/proyectos")}
            className="flex items-center gap-1.5 text-xs text-white hover:text-white font-body transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            Volver a proyectos
          </button>
        </div>

        {/* Top bar */}
        <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
          <ObraGlobalStepper steps={globalSteps} />
        </div>

        {/* Soft coherence banner (re-edit after approval) */}
        {showEditorBanner && (
          <div className="mx-10 my-4 bg-obra-blue-50 border border-obra-blue-100 rounded-card px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6499" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <span className="text-sm font-body text-obra-blue-950">
                En este paso solo revisás el contenido del ebook. El diseño se ve en la Vista Previa.
              </span>
            </div>
            <button onClick={() => setShowEditorBanner(false)} className="text-obra-neutral-400 hover:text-obra-neutral-600 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Autosave + back */}
        <div className="px-10 py-3 border-b border-obra-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-body text-obra-blue-950">
              {selectedChapter
                ? productChapters.find((ch) => ch.id === selectedChapter)?.title || "Sin título"
                : `Capítulo ${currentCh + 1} de ${chapters.length}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-obra-neutral-400 font-body">
            <Save className="size-3" />
            Guardado
          </div>
        </div>

        

        {/* Split content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Product sidebar (mini) */}
          <ProductSidebar
            products={MOCK_PRODUCTS}
            selectedId={selectedProduct}
            onSelectProduct={handleSelectProduct}
          />

          {/* Chapters sidebar */}
          <ChaptersSidebar
            chapters={productChapters}
            currentChapter={selectedChapter}
            onSelectChapter={setSelectedChapter}
            productLabel={currentProduct.label}
          />

          {/* Left — editor */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-obra-blue-100">
            <div className="flex items-center justify-between px-8 py-3 border-b border-obra-blue-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentCh((c) => Math.max(0, c - 1))}
                  disabled={currentCh === 0}
                  className="size-7 rounded-full border border-obra-blue-100 flex items-center justify-center text-obra-neutral-600 hover:border-obra-blue-700 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  onClick={() => setCurrentCh((c) => Math.min(chapters.length - 1, c + 1))}
                  disabled={currentCh === chapters.length - 1}
                  className="size-7 rounded-full border border-obra-blue-100 flex items-center justify-center text-obra-neutral-600 hover:border-obra-blue-700 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
              {/* Minimal toolbar */}
              <div className="flex items-center gap-1">
                {[
                  { label: "B",      title: "Negrita" },
                  { label: "I",      title: "Cursiva" },
                  { label: "H2",     title: "Título 2" },
                  { label: "H3",     title: "Título 3" },
                  { label: "• Lista",title: "Lista" },
                ].map(({ label, title }) => (
                  <button
                    key={label}
                    title={title}
                    className="min-w-[28px] h-7 px-2 text-xs font-semibold font-body text-obra-neutral-500 bg-white border border-obra-blue-100 rounded hover:bg-obra-blue-50 hover:text-obra-blue-700 hover:border-obra-blue-300 active:bg-obra-blue-100 active:scale-95 transition-all shadow-sm"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="font-display text-xl text-obra-blue-950 mb-6">
                {selectedChapter
                  ? productChapters.find((ch) => ch.id === selectedChapter)?.title || "Sin título"
                  : chapters[currentCh]}
              </h2>
              <div className="prose prose-sm max-w-none text-obra-neutral-900 font-body">{/* Body text */}
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
                <h2>Subtítulo del capítulo</h2>
                <p>Sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
              </div>
            </div>
          </div>

          {/* Right — AI chat */}
          <div className="w-96 shrink-0">
            <ChatPanel messages={messages} onSend={handleSend} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-10 py-5 border-t border-obra-blue-100 flex items-center justify-between">
          <ObraButton variant="tertiary" onClick={() => fromUpload ? navigate(`/proyectos/${id}/contenido-upload`) : setView("index")}>
            ← Anterior
          </ObraButton>
          <ObraButton variant="primary" onClick={() => navigate(`/proyectos/${id}/preview`)}>
            Aprobar ebook →
          </ObraButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Dark nav bar */}
      <div className="px-6 py-4 bg-obra-blue-950 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/proyectos")}
          className="flex items-center gap-1.5 text-xs text-white hover:text-white font-body transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Volver a proyectos
        </button>
      </div>

      {/* Top bar */}
      <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
        <ObraGlobalStepper steps={globalSteps} />
      </div>

      {/* Info banner */}
      {showBanner && (
        <div className="mx-10 my-4 bg-obra-blue-50 border border-obra-blue-100 rounded-card px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6499" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span className="text-sm font-body text-obra-blue-950">
              En este paso generás el texto. El diseño y la vista previa vienen después.
            </span>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-obra-neutral-400 hover:text-obra-neutral-600 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Split content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Product sidebar (mini) */}
        <ProductSidebar
          products={MOCK_PRODUCTS}
          selectedId={selectedProduct}
          onSelectProduct={handleSelectProduct}
        />

        {/* Left panel — 55% */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-obra-blue-100">
          <div className="flex items-center justify-between px-8 py-4 border-b border-obra-blue-100">
            <div>
              <span className="text-sm font-semibold font-body text-obra-blue-950">Índice del ebook</span>
              <p className="text-xs text-obra-neutral-400 font-body mt-0.5">{currentProduct.label}</p>
            </div>
            {frozen && (
              <button
                onClick={() => setFrozen(false)}
                className="text-sm text-obra-blue-700 hover:underline font-body flex items-center gap-1.5"
              >
                <Lock className="size-3.5" /> Editar índice
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-2">
            {chapters.map((ch, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-card border",
                  frozen ? "border-obra-blue-50 bg-obra-blue-50/40" : "border-obra-blue-100 bg-white"
                )}
              >
                <GripVertical className={cn("size-4 shrink-0", frozen ? "text-obra-neutral-200" : "text-obra-neutral-400 cursor-grab")} />
                <span className="text-sm font-body text-obra-neutral-600 shrink-0 w-6">{i + 1}.</span>
                {frozen ? (
                  <span className="flex-1 text-sm font-body text-obra-neutral-600">{ch}</span>
                ) : (
                  <input
                    value={ch}
                    onChange={(e) => setChapters(chapters.map((c, ci) => ci === i ? e.target.value : c))}
                    className="flex-1 text-sm font-body text-obra-blue-950 bg-transparent outline-none border-b border-transparent focus:border-obra-blue-700"
                  />
                )}
                {!frozen && (
                  <button
                    onClick={() => removeChapter(i)}
                    className="p-1 rounded text-obra-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                {frozen && (
                  <button
                    onClick={() => setView("editor")}
                    className="ml-auto text-xs text-obra-blue-700 hover:underline font-body"
                  >
                    Editar →
                  </button>
                )}
              </div>
            ))}

            {!frozen && (
              <button
                onClick={addChapter}
                className="flex items-center gap-2 text-sm text-obra-blue-700 hover:underline font-body py-2"
              >
                <Plus className="size-4" /> Añadir capítulo
              </button>
            )}
          </div>
        </div>

        {/* Right panel — 45% */}
        <div className="w-96 shrink-0">
          <ChatPanel messages={messages} onSend={handleSend} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-10 py-5 border-t border-obra-blue-100 flex justify-between items-center">
        <ObraButton variant="tertiary" onClick={() => navigate(`/proyectos/${id}/estructura`, { state: { step: 7 } })}>
          ← Anterior
        </ObraButton>
        {frozen ? (
          <ObraButton variant="tertiary" onClick={() => setFrozen(false)}>
            <Lock className="size-4" /> Editar índice
          </ObraButton>
        ) : (
          <ObraButton variant="primary" onClick={() => { setFrozen(true); setView("editor"); }}>
            Confirmar índice →
          </ObraButton>
        )}
      </div>
    </div>
  );
}