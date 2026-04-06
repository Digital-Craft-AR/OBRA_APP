import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import {
  Plus, Minus, RotateCw, Lock, Unlock,
  Check, ChevronLeft,
} from "lucide-react";
import { ObraButton }       from "../../components/obra/button";
import { ObraInput }        from "../../components/obra/input";
import { ObraAiAssistField } from "../../components/obra/ai-assist-field";
import { ObraGlobalStepper } from "../../components/obra/stepper";
import { ObraSkeletonBlock } from "../../components/obra/skeleton";
import { cn } from "../../components/ui/utils";

const TOTAL_STEPS = 7;
const STEP_LABELS = [
  "Tema del proyecto",
  "Avatar y problema",
  "Cantidades del paquete",
  "Título principal y autor",
  "Títulos de bonuses",
  "Títulos de order bumps",
  "Diseño",
];

const SUGGESTED_TITLES = [
  "La guía definitiva de velas aromáticas: de cero a negocio",
  "Velas artesanales que venden: sistema paso a paso",
  "De hobbysta a emprendedora: crea tu marca de velas",
  "El método de las velas: ingresos desde casa",
  "Velas con alma: la guía para emprendedoras creativas",
];

const PRESET_DESIGNS = [
  { name: "Oceánico",  fonts: "Fraunces + DM Sans",   palette: ["#EEF5FF", "#1B3B6F", "#0891B2"] },
  { name: "Terroso",   fonts: "Playfair + Lato",       palette: ["#FDF8F2", "#3B2314", "#C2410C"] },
  { name: "Minimal",   fonts: "Inter + Inter",         palette: ["#FFFFFF",  "#18181B", "#DC2626"] },
  { name: "Vibrante",  fonts: "Nunito + Open Sans",    palette: ["#FFF9FB",  "#1E1035", "#9333EA"] },
  { name: "Elegante",  fonts: "Cormorant + Jost",      palette: ["#F9F6F0",  "#2C2C2C", "#B45309"] },
];

const TYPO_PRESETS = [
  { name: "Clásico",   titleFont: "Fraunces",           bodyFont: "DM Sans"           },
  { name: "Terroso",   titleFont: "Playfair Display",   bodyFont: "Lato"              },
  { name: "Minimal",   titleFont: "Inter",              bodyFont: "Inter"             },
  { name: "Vibrante",  titleFont: "Nunito",             bodyFont: "Open Sans"         },
  { name: "Elegante",  titleFont: "Cormorant Garamond", bodyFont: "Jost"              },
];

/* ── Step components ───────────────────────────────────────────────────── */

function StepTema() {
  const [text, setText] = useState("Mujeres que hacen velas artesanales en casa y quieren venderlas online.");
  const [status, setStatus] = useState<"idle"|"loading"|"success">("idle");
  const [error, setError]   = useState("");

  const simulate = () => {
    if (text.length < 20) { setError("El tema debe tener al menos 20 caracteres."); return; }
    setError("");
    setStatus("loading");
    setTimeout(() => {
      setText("Mujeres de 28 a 42 años que elaboran velas aromáticas artesanales en casa y desean monetizar su pasión creando una marca propia para vender online.");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    }, 1800);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">¿Sobre qué es tu infoproducto?</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Describí el tema central de tu ebook con el mayor detalle posible. Cuanto más específico, mejores resultados obtendrás de la IA.
        </p>
      </div>
      <ObraAiAssistField
        label="Tema del proyecto"
        value={text}
        onChange={setText}
        onAiAssist={simulate}
        aiStatus={status}
        error={error}
        placeholder="Ej: Mujeres que hacen velas artesanales en casa..."
      />
    </div>
  );
}

function StepAvatar() {
  const [avatar, setAvatar]     = useState("Mujeres de 28 a 42 años, madres, buscan ingresos extras desde casa.");
  const [problema, setProblema] = useState("No saben cómo presentar su producto de forma profesional para venderlo online.");
  const [statusA, setStatusA]   = useState<"idle"|"loading"|"success">("idle");
  const [statusP, setStatusP]   = useState<"idle"|"loading"|"success">("idle");

  const simulate = (field: "a"|"p") => {
    if (field === "a") {
      setStatusA("loading");
      setTimeout(() => {
        setAvatar("Mujeres de 28 a 42 años, madres de familia o profesionales independientes, que elaboran velas aromáticas artesanales como hobby y quieren convertirlo en su fuente principal de ingresos trabajando desde casa.");
        setStatusA("success");
        setTimeout(() => setStatusA("idle"), 2000);
      }, 1800);
    } else {
      setStatusP("loading");
      setTimeout(() => {
        setProblema("Tienen un producto artesanal de calidad pero no cuentan con las herramientas ni el conocimiento para posicionarlo, ponerle precio y venderlo online de forma consistente y escalable.");
        setStatusP("success");
        setTimeout(() => setStatusP("idle"), 2000);
      }, 1800);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">Avatar y problema</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Definí a quién le hablás y qué problema resuelve tu infoproducto.
        </p>
      </div>
      <ObraAiAssistField
        label="¿Quién es tu cliente ideal?"
        value={avatar}
        onChange={setAvatar}
        onAiAssist={() => simulate("a")}
        aiStatus={statusA}
        placeholder="Describí a tu cliente ideal: edad, situación, deseos..."
      />
      <ObraAiAssistField
        label="¿Qué problema resuelve tu infoproducto?"
        value={problema}
        onChange={setProblema}
        onAiAssist={() => simulate("p")}
        aiStatus={statusP}
        placeholder="Describí el dolor o desafío que tu ebook ayuda a resolver..."
      />
    </div>
  );
}

function StepCantidades() {
  const [bonuses, setBonuses] = useState(3);
  const [bumps,   setBumps]   = useState(1);

  const BookIcon = () => (
    <div className="flex flex-col items-center gap-1">
      <div className="w-7 h-9 bg-obra-blue-900 rounded border border-obra-blue-700 flex items-center justify-center">
        <span className="text-2xs text-white font-body font-bold">E</span>
      </div>
      <span className="text-2xs text-obra-neutral-600 font-body">Ebook</span>
    </div>
  );

  const BonusIcon = ({ n }: { n: number }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="w-6 h-8 bg-obra-blue-100 rounded flex items-center justify-center">
        <span className="text-2xs text-obra-blue-700 font-body font-bold">{n}</span>
      </div>
      <span className="text-2xs text-obra-neutral-400 font-body">Bonus</span>
    </div>
  );

  const BumpIcon = ({ n }: { n: number }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="w-6 h-8 bg-obra-green-400/20 rounded flex items-center justify-center">
        <span className="text-2xs text-obra-blue-900 font-body font-bold">{n}</span>
      </div>
      <span className="text-2xs text-obra-neutral-400 font-body">Order Bump</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">¿Cuántas piezas tiene tu paquete?</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          El ebook principal siempre está incluido. Podés agregar bonuses y order bumps opcionales.
        </p>
      </div>

      <div className="flex gap-12">
        {[
          { label: "Bonuses", value: bonuses, min: 0, max: 5, set: setBonuses },
          { label: "Order Bumps", value: bumps, min: 0, max: 2, set: setBumps },
        ].map((counter) => (
          <div key={counter.label} className="flex flex-col gap-3">
            <span className="text-sm font-semibold font-body text-obra-blue-950">{counter.label}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => counter.set(Math.max(counter.min, counter.value - 1))}
                disabled={counter.value === counter.min}
                className="size-9 rounded-full border border-obra-blue-100 flex items-center justify-center text-obra-blue-700 hover:border-obra-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-3xl font-bold font-body text-obra-blue-950 w-8 text-center">
                {counter.value}
              </span>
              <button
                onClick={() => counter.set(Math.min(counter.max, counter.value + 1))}
                disabled={counter.value === counter.max}
                className="size-9 rounded-full border border-obra-blue-100 flex items-center justify-center text-obra-blue-700 hover:border-obra-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <span className="text-xs text-obra-neutral-400 font-body">Máx. {counter.max}</span>
          </div>
        ))}
      </div>

      {/* Visual diagram */}
      <div className="bg-obra-blue-50 border border-obra-blue-100 rounded-card p-5 flex flex-col gap-3">
        <span className="text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide">Tu paquete</span>
        <div className="flex items-end gap-3">
          <BookIcon />
          {Array.from({ length: bonuses }).map((_, i) => <BonusIcon key={i} n={i + 1} />)}
          {Array.from({ length: bumps }).map((_, i) => <BumpIcon key={i} n={i + 1} />)}
        </div>
        <span className="text-xs text-obra-neutral-600 font-body">
          1 ebook principal
          {bonuses > 0 ? ` · ${bonuses} bonus${bonuses !== 1 ? "es" : ""}` : ""}
          {bumps > 0 ? ` · ${bumps} order bump${bumps !== 1 ? "s" : ""}` : ""}
        </span>
      </div>
    </div>
  );
}

function StepTitulo() {
  const [selected, setSelected] = useState<number | null>(0);
  const [custom,   setCustom]   = useState("");
  const [author,   setAuthor]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const regenerate = () => {
    setLoading(true);
    setSelected(null);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">Elegí el título de tu ebook principal</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Seleccioná una sugerencia o escribí tu propio título abajo.
        </p>
      </div>

      {/* Title chips — 2+3 layout */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ObraSkeletonBlock key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {SUGGESTED_TITLES.slice(0, 2).map((title, i) => (
              <button
                key={i}
                onClick={() => { setSelected(i); setCustom(""); }}
                className={cn(
                  "p-4 rounded-card border text-left text-sm font-body text-obra-blue-950 transition-all",
                  selected === i
                    ? "border-obra-blue-700 bg-obra-blue-50"
                    : "border-obra-blue-100 hover:border-obra-blue-700/50"
                )}
              >
                <div className="flex items-start gap-2">
                  {selected === i && <Check className="size-6 text-obra-blue-700 shrink-0 mt-0.5" />}
                  <span>{title}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SUGGESTED_TITLES.slice(2).map((title, i) => (
              <button
                key={i + 2}
                onClick={() => { setSelected(i + 2); setCustom(""); }}
                className={cn(
                  "p-4 rounded-card border text-left text-sm font-body text-obra-blue-950 transition-all",
                  selected === i + 2
                    ? "border-obra-blue-700 bg-obra-blue-50"
                    : "border-obra-blue-100 hover:border-obra-blue-700/50"
                )}
              >
                <div className="flex items-start gap-2">
                  {selected === i + 2 && <Check className="size-4 text-obra-blue-700 shrink-0 mt-0.5" />}
                  <span>{title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={regenerate}
        className="text-sm text-obra-blue-700 hover:underline font-body self-start flex items-center gap-1.5"
      >
        <RotateCw className="size-3.5" />
        Regenerar sugerencias
      </button>
      <p className="text-xs text-obra-neutral-400 font-body -mt-3">
        Regenerar limpia la selección pero conserva tu título personalizado.
      </p>

      <ObraInput
        label="O escribí el tuyo propio"
        placeholder="Tu título personalizado..."
        value={custom}
        onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
      />

      <ObraInput
        label="Autor / marca (opcional)"
        placeholder="Ej: Valentina García"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        hint="Aparece en la portada cuando lo completás."
      />
    </div>
  );
}

type BonusRow = { id: number; title: string; locked: boolean; selected: boolean };

function TitleList({ label, rows, setRows }: {
  label:   string;
  rows:    BonusRow[];
  setRows: (r: BonusRow[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-body text-obra-blue-950">{label}</h3>
        <button className="text-sm text-obra-blue-700 hover:underline font-body flex items-center gap-1.5">
          <RotateCw className="size-3.5" />
          Regenerar todos
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-card border transition-all",
              row.selected
                ? row.locked
                  ? "border-obra-blue-300 bg-obra-blue-50/80"
                  : "border-obra-blue-200 bg-obra-blue-50/40"
                : "border-obra-blue-100 bg-white opacity-50"
            )}
          >
            {/* Checkbox */}
            <button
              onClick={() => setRows(rows.map((r) => r.id === row.id ? { ...r, selected: !r.selected } : r))}
              className={cn(
                "size-5 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                row.selected
                  ? "bg-obra-blue-700 border-obra-blue-700"
                  : "border-obra-blue-200 bg-white hover:border-obra-blue-400"
              )}
            >
              {row.selected && <Check className="size-3 text-white" strokeWidth={3} />}
            </button>

            <span className="text-xs font-medium font-body text-obra-neutral-600 shrink-0 w-16">
              {label.includes("Bonus") ? `Bonus ${idx + 1}` : `Bump ${idx + 1}`}
            </span>
            <input
              value={row.title}
              readOnly={row.locked || !row.selected}
              onChange={(e) => setRows(rows.map((r) => r.id === row.id ? { ...r, title: e.target.value } : r))}
              className={cn(
                "flex-1 text-sm font-body text-obra-blue-950 bg-transparent outline-none border-b",
                row.locked || !row.selected
                  ? "border-transparent text-obra-neutral-600 cursor-not-allowed"
                  : "border-obra-neutral-200 focus:border-obra-blue-700"
              )}
            />
            <button
              disabled={row.locked || !row.selected}
              className="p-1 rounded text-obra-neutral-400 hover:text-obra-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <RotateCw className="size-3.5" />
            </button>
            <button
              disabled={!row.selected}
              onClick={() => setRows(rows.map((r) => r.id === row.id ? { ...r, locked: !r.locked } : r))}
              className={cn(
                "p-1 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none",
                row.locked ? "text-obra-blue-700 hover:text-obra-blue-900" : "text-obra-neutral-400 hover:text-obra-blue-700"
              )}
            >
              {row.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-obra-neutral-400 font-body">
        Destildá los que no querés incluir en el paquete.
      </p>
    </div>
  );
}

function StepBonuses() {
  const [rows, setRows] = useState<BonusRow[]>([
    { id: 1, title: "Recetario de aromas para cada estación", locked: false, selected: true  },
    { id: 2, title: "Guía de packaging sin presupuesto",      locked: true,  selected: true  },
    { id: 3, title: "Plantilla de precios y margen de ganancia", locked: false, selected: true },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">Títulos de bonuses</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Editá los títulos sugeridos. Bloqueá los que ya están perfectos para protegerlos al regenerar.
        </p>
      </div>
      <TitleList label="Bonus" rows={rows} setRows={setRows} />
    </div>
  );
}

function StepBumps() {
  const [rows, setRows] = useState<BonusRow[]>([
    { id: 1, title: "Kit de redes sociales para tu marca de velas", locked: false, selected: true },
    { id: 2, title: "Mini curso: fotografía de producto en casa",   locked: false, selected: true },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">Títulos de order bumps</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Los order bumps son ofertas adicionales que aparecen durante la compra.
        </p>
      </div>
      <TitleList label="Order Bump" rows={rows} setRows={setRows} />
    </div>
  );
}

function StepDiseno() {
  const [pageSize,   setPageSize]   = useState("a4");
  const [orient,     setOrient]     = useState("vertical");
  const [preset,     setPreset]     = useState<number | null>(0);
  const [colorMode,  setColorMode]  = useState<"preset" | "custom">("preset");
  const [typoPreset, setTypoPreset] = useState<number>(0);
  const [imgSource,  setImgSource]  = useState("ai");
  const [imgStyle,   setImgStyle]   = useState("flat");
  const [color60,    setColor60]    = useState("#F9F6F0");
  const [color30,    setColor30]    = useState("#1B3B6F");
  const [color10,    setColor10]    = useState("#0891B2");

  const IMG_STYLES = ["Ilustración plana","Fotografía","Isométrico","Minimalista","Acuarela"];

  const Divider = () => <div className="border-t border-obra-blue-100" />;

  const handlePresetClick = (i: number) => {
    setPreset(i);
    setColorMode("preset");
  };

  const handleCustomColorChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setColorMode("custom");
    setPreset(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-obra-blue-950">Diseño</h2>
        <p className="text-sm text-obra-neutral-600 font-body">
          Configurá la apariencia visual de tu infoproducto.
        </p>
      </div>

      {/* Página */}
      <div className="flex flex-col gap-4">
        <span className="text-sm font-semibold font-body text-obra-blue-950">Página</span>
        <div className="flex gap-3">
          {[{ id:"a4", label:"A4", sub:"210 × 297 mm" },{ id:"letter", label:"Letter", sub:"8.5 × 11 in" }].map((s) => (
            <button
              key={s.id}
              onClick={() => setPageSize(s.id)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 rounded-card border transition-all",
                pageSize === s.id ? "border-obra-blue-700 bg-obra-blue-50" : "border-obra-blue-100 hover:border-obra-blue-700/50"
              )}
            >
              <div className={cn("border-2 rounded-sm shrink-0", pageSize === s.id ? "border-obra-blue-700" : "border-obra-neutral-400", s.id === "a4" ? "w-6 h-8" : "w-7 h-9")} />
              <div className="text-left">
                <div className="text-sm font-semibold font-body text-obra-blue-950">{s.label}</div>
                <div className="text-xs text-obra-neutral-600 font-body">{s.sub}</div>
              </div>
              {pageSize === s.id && <Check className="size-4 text-obra-blue-700 ml-auto" />}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {[{ id:"vertical", label:"Vertical" },{ id:"horizontal", label:"Horizontal" }].map((o) => (
            <button
              key={o.id}
              onClick={() => setOrient(o.id)}
              className={cn(
                "flex-1 p-3 rounded-card border text-sm font-body font-medium transition-all",
                orient === o.id ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700" : "border-obra-blue-100 text-obra-neutral-600 hover:border-obra-blue-700/50"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Paleta de colores */}
      <div className="flex flex-col gap-6">
        <span className="text-sm font-semibold font-body text-obra-blue-950">Paleta de colores</span>

        {/* Opción A: Paletas armadas */}
        <div className={cn("flex flex-col gap-3 transition-opacity duration-150", colorMode === "custom" && "opacity-40")}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold font-body text-obra-blue-950">Podés elegir de estas paletas armadas</span>
            <span className="text-xs text-obra-neutral-400 font-body">Paletas diseñadas y listas para usar.</span>
          </div>
          <div className="flex gap-3 pb-2">
            {PRESET_DESIGNS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => handlePresetClick(i)}
                className={cn(
                  "shrink-0 flex flex-col items-center gap-2 p-3 rounded-card border transition-all",
                  colorMode === "preset" && preset === i
                    ? "border-obra-blue-700 bg-obra-blue-50"
                    : "border-obra-blue-100 hover:border-obra-blue-700/50"
                )}
              >
                <div className="flex gap-1">
                  {p.palette.map((c, ci) => (
                    <span key={ci} className="size-5 rounded-full border border-obra-blue-100" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-xs font-semibold font-body text-obra-blue-950">{p.name}</span>
                <span className="text-2xs text-obra-neutral-400 font-body text-center leading-tight">{p.fonts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divisor — contextual */}
        {colorMode === "preset" ? (
          <button
            onClick={() => { setColorMode("custom"); setPreset(null); }}
            className="flex items-center gap-3 group"
          >
            <div className="flex-1 border-t border-obra-blue-100" />
            <span className="text-xs font-semibold font-body text-obra-blue-700 group-hover:underline whitespace-nowrap">
              o crea tu propia paleta →
            </span>
            <div className="flex-1 border-t border-obra-blue-100" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-obra-blue-100" />
            <span className="text-xs font-semibold font-body text-obra-neutral-400 uppercase tracking-wide">o</span>
            <div className="flex-1 border-t border-obra-blue-100" />
          </div>
        )}

        {/* Opción B: Paleta custom */}
        <div className={cn("flex flex-col gap-4 transition-opacity duration-150", colorMode === "preset" && "opacity-40")}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold font-body text-obra-blue-950">Podés armar tu propia paleta</span>
            <span className="text-xs text-obra-neutral-400 font-body">Elegí los colores exactos de tu marca.</span>
          </div>

          <div className="flex gap-6">
            {[
              { label: "Principal",   sublabel: "60%", value: color60, set: setColor60 },
              { label: "Secundario",  sublabel: "30%", value: color30, set: setColor30 },
              { label: "Acento",      sublabel: "10%", value: color10, set: setColor10 },
            ].map((c, idx) => (
              <div key={c.label} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <label
                    className="size-14 rounded-full border-2 cursor-pointer hover:border-obra-blue-700 transition-colors overflow-hidden block"
                    style={{
                      backgroundColor: c.value,
                      borderColor: colorMode === "custom" ? "#2D4EA2" : "#CBD8E3",
                    }}
                    title={c.value}
                  >
                    <input
                      type="color"
                      value={c.value}
                      onChange={(e) => handleCustomColorChange(c.set, e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  <span className="absolute -top-1 -right-1 size-5 rounded-full bg-obra-blue-100 border border-white flex items-center justify-center">
                    <span className="text-2xs font-bold font-body text-obra-blue-700">{idx + 1}</span>
                  </span>
                </div>
                <span className="text-xs font-body text-obra-blue-950 font-medium">{c.label}</span>
                <span className="text-2xs font-mono text-obra-neutral-400">{c.value.toUpperCase()}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer jerarquía */}
          <div className="bg-obra-blue-50 border border-obra-blue-100 rounded-card p-3 flex flex-col gap-2">
            {[
              { n: "1", text: "El primer color es el fondo de la hoja: ocupa la mayor parte del espacio visual de la página." },
              { n: "2", text: "El segundo color es el estructural oscuro: títulos, texto principal y elementos de soporte." },
              { n: "3", text: "El tercer color es el acento vibrante: botones, highlights y detalles que resaltan sobre el fondo claro." },
            ].map((item) => (
              <div key={item.n} className="flex items-start gap-2">
                <span className="size-4 rounded-full bg-obra-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-2xs font-bold font-body text-obra-blue-700">{item.n}</span>
                </span>
                <span className="text-xs font-body text-obra-neutral-600 leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Divider />

      {/* Tipografía */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold font-body text-obra-blue-950">Tipografía</span>
          <span className="text-xs text-obra-neutral-400 font-body">Combinaciones de fuentes para títulos y cuerpo de texto.</span>
        </div>
        <div className="flex gap-3 pb-2 flex-wrap">
          {TYPO_PRESETS.map((tp, i) => (
            <button
              key={tp.name}
              onClick={() => setTypoPreset(i)}
              className={cn(
                "shrink-0 flex flex-col gap-3 p-4 rounded-card border text-left transition-all w-48",
                typoPreset === i
                  ? "border-obra-blue-700 bg-obra-blue-50"
                  : "border-obra-blue-100 hover:border-obra-blue-700/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-body text-obra-blue-950">{tp.name}</span>
                {typoPreset === i && <Check className="size-3.5 text-obra-blue-700 shrink-0" />}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs text-obra-neutral-400 font-body uppercase tracking-wide">Títulos</span>
                  <span
                    className="text-base text-obra-blue-950 leading-tight truncate"
                    style={{ fontFamily: tp.titleFont }}
                  >
                    El arte de crear
                  </span>
                  <span className="text-2xs text-obra-neutral-500 font-body">{tp.titleFont}</span>
                </div>
                <div className="border-t border-obra-blue-100" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs text-obra-neutral-400 font-body uppercase tracking-wide">Cuerpo</span>
                  <span
                    className="text-xs text-obra-blue-950 leading-snug line-clamp-2"
                    style={{ fontFamily: tp.bodyFont }}
                  >
                    Texto de ejemplo legible
                  </span>
                  <span className="text-2xs text-obra-neutral-500 font-body">{tp.bodyFont}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Imágenes */}
      <div className="flex flex-col gap-4">
        <span className="text-sm font-semibold font-body text-obra-blue-950">Imágenes</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id:"ai",     label:"Generadas con IA",     desc:"La IA crea las imágenes durante la Vista previa." },
            { id:"upload", label:"Voy a subir las mías", desc:"Cargá tus propias imágenes en el paso de Vista previa." },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setImgSource(s.id)}
              className={cn(
                "flex flex-col gap-1.5 p-4 rounded-card border text-left transition-all",
                imgSource === s.id ? "border-obra-blue-700 bg-obra-blue-50" : "border-obra-blue-100 hover:border-obra-blue-700/50"
              )}
            >
              <span className="text-sm font-semibold font-body text-obra-blue-950">{s.label}</span>
              <span className="text-xs text-obra-neutral-600 font-body">{s.desc}</span>
            </button>
          ))}
        </div>

        {imgSource === "ai" && (
          <>
            <span className="text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide">Estilo visual</span>
            <div className="flex flex-wrap gap-2">
              {IMG_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setImgStyle(style)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm font-body font-medium transition-all",
                    imgStyle === style
                      ? "border-obra-blue-700 bg-obra-blue-700 text-white"
                      : "border-obra-blue-100 text-obra-neutral-600 hover:border-obra-blue-700/50"
                  )}
                >
                  {style}
                </button>
              ))}
            </div>

            <div className="p-3 bg-obra-blue-50 border border-obra-blue-100 rounded-card flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7A94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <span className="text-xs text-obra-neutral-600 font-body">
                Las imágenes se generan en Vista previa. Sin costo de créditos en este paso.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [
  StepTema,
  StepAvatar,
  StepCantidades,
  StepTitulo,
  StepBonuses,
  StepBumps,
  StepDiseno,
];

/* ── Main Wizard ────────────────────────────────────────────────────────── */
export function WizardEstructura() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();
  const initialStep = (location.state as { step?: number } | null)?.step ?? 1;
  const [step, setStep] = useState(initialStep);
  const StepContent = STEP_COMPONENTS[step - 1];
  const isLast = step === TOTAL_STEPS;

  const globalSteps = [
    { id: 1, label: "Estructura",   status: "active"    as const },
    { id: 2, label: "Contenido",    status: "upcoming"  as const },
    { id: 3, label: "Vista previa", status: "upcoming"  as const },
  ];

  const handleNext = () => {
    if (isLast) {
      const branch = localStorage.getItem(`obra_branch_${id}`) ?? "ai";
      if (branch === "upload") {
        navigate(`/proyectos/${id}/contenido-upload`);
      } else {
        navigate(`/proyectos/${id}/contenido`);
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step === 1) {
      navigate(`/proyectos/${id}/modo`);
    } else {
      setStep((s) => s - 1);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
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

      {/* Top bar — stepper only */}
      <div className="px-10 py-5 border-b border-obra-blue-100 flex flex-col gap-4">
        <ObraGlobalStepper steps={globalSteps} />
      </div>

      {/* Inner progress */}
      <div className="px-10 py-3 border-b border-obra-blue-100 flex items-center justify-between">
        <span className="text-sm font-medium font-body text-obra-neutral-600">
          Paso {step} de {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 w-6 rounded-full transition-all",
                i < step ? "bg-obra-blue-700" : "bg-obra-blue-100"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-wizard mx-auto px-10 py-10">
          <StepContent />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-10 py-5 border-t border-obra-blue-100 flex items-center justify-between">
        <ObraButton variant="tertiary" onClick={handlePrev}>
          ← Anterior
        </ObraButton>
        <ObraButton variant="primary" onClick={handleNext}>
          {isLast ? "Finalizar diseño →" : "Siguiente →"}
        </ObraButton>
      </div>
    </div>
  );
}