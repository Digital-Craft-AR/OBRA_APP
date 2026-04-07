import { Button } from "@/components/ui/Button";
import { ObraBadge } from "@/components/obra/ObraBadge";
import { ObraInput } from "@/components/obra/ObraInput";
import { ObraTextarea } from "@/components/obra/ObraTextarea";

const colorTokens = [
  { name: "obra-blue-950", hex: "#0F2438", className: "bg-obra-blue-950" },
  { name: "obra-blue-900", hex: "#204970", className: "bg-obra-blue-900" },
  { name: "obra-blue-700", hex: "#2D6499", className: "bg-obra-blue-700" },
  { name: "obra-blue-100", hex: "#E8F0F7", className: "bg-obra-blue-100" },
  { name: "obra-blue-50", hex: "#F4F8FC", className: "bg-obra-blue-50" },
  { name: "obra-green-400", hex: "#C8E62B", className: "bg-obra-green-400" },
  { name: "obra-neutral-600", hex: "#5A7A94", className: "bg-obra-neutral-600" },
  { name: "obra-neutral-400", hex: "#9CA3AF", className: "bg-obra-neutral-400" },
  { name: "obra-neutral-200", hex: "#DDE8F0", className: "bg-obra-neutral-200" },
  { name: "obra-neutral-100", hex: "#F8FAFB", className: "bg-obra-neutral-100" },
] as const;

const variants = ["primary", "secondary", "tertiary", "destructive", "ghost", "link"] as const;

export function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-obra-blue-50">
      <div className="mx-auto flex w-full max-w-content flex-col gap-12 px-10 py-10">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-obra-blue-950">Obra Design System</h1>
          <p className="text-sm text-obra-neutral-600">Colors, typography and button variants.</p>
        </header>

        <section className="flex flex-col gap-5">
          <h2 className="border-b border-obra-blue-100 pb-3 text-lg font-semibold text-obra-blue-950">
            Colors
          </h2>
          <div className="flex flex-wrap gap-5">
            {colorTokens.map((color) => (
              <article key={color.name} className="flex flex-col items-start gap-1.5">
                <div
                  className={`h-14 w-32 rounded-card border border-obra-blue-100 ${color.className}`}
                  title={color.hex}
                />
                <p className="text-xs font-semibold text-obra-blue-950">{color.name}</p>
                <p className="text-xs text-obra-neutral-600">{color.hex}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="border-b border-obra-blue-100 pb-3 text-lg font-semibold text-obra-blue-950">
            Typography
          </h2>
          <div className="flex flex-col gap-5 rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
            {[
              {
                label: "Page Title - Fraunces Bold 24px",
                sample: (
                  <p className="mt-1 font-display text-2xl text-obra-blue-950">
                    Crea tu infoproducto con IA
                  </p>
                ),
              },
              {
                label: "Section Title - Plus Jakarta Sans Semibold 18px",
                sample: (
                  <p className="mt-1 font-body text-lg font-semibold text-obra-blue-950">
                    Configuracion del proyecto
                  </p>
                ),
              },
              {
                label: "Body - Plus Jakarta Sans Regular 14px",
                sample: (
                  <p className="mt-1 font-body text-sm text-obra-neutral-900">
                    Define el tema central, el avatar de tu cliente ideal y la estructura del
                    paquete antes de continuar con la generacion del contenido.
                  </p>
                ),
              },
              {
                label: "Body Strong - Plus Jakarta Sans Semibold 14px",
                sample: (
                  <p className="mt-1 font-body text-sm font-semibold text-obra-neutral-900">
                    Guia completa de velas aromaticas artesanales
                  </p>
                ),
              },
              {
                label: "Caption - Plus Jakarta Sans Regular 12px",
                sample: (
                  <p className="mt-1 font-body text-xs text-obra-neutral-600">
                    Ultima edicion: hace 2 horas - 1 ebook - 3 bonuses
                  </p>
                ),
              },
              {
                label: "Label - Plus Jakarta Sans Medium 13px",
                sample: (
                  <p className="mt-1 font-body text-label font-medium text-obra-blue-950">
                    Avatar del cliente ideal
                  </p>
                ),
              },
            ].map((item) => (
              <article key={item.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                  {item.label}
                </p>
                {item.sample}
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-obra-blue-950">Buttons</h2>
          <article className="rounded-card border border-obra-blue-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-xs uppercase tracking-wide text-obra-neutral-600">Light mode</p>
            <div className="flex flex-wrap items-center gap-3">
              {variants.map((variant) => (
                <Button key={`light-${variant}`} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
          </article>
          <article className="rounded-card border border-obra-blue-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-xs uppercase tracking-wide text-obra-neutral-600">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="medium">
                Medium (40px)
              </Button>
              <Button variant="primary" size="small">
                Small (32px)
              </Button>
            </div>
          </article>

          <article className="rounded-card border border-obra-blue-100 bg-obra-blue-900 p-5 shadow-card">
            <p className="mb-4 text-xs uppercase tracking-wide text-white/80">Dark mode</p>
            <div className="flex flex-wrap items-center gap-3">
              {variants.map((variant) => (
                <Button key={`dark-${variant}`} variant={variant} mode="dark">
                  {variant}
                </Button>
              ))}
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="border-b border-obra-blue-100 pb-3 text-lg font-semibold text-obra-blue-950">
            Form
          </h2>
          <article className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
            <div className="grid gap-6 md:grid-cols-2">
              <ObraInput
                label="Ebook topic"
                placeholder="Ex: homemade aromatic candles"
                hint="Be specific to get better AI results."
              />
              <ObraInput
                label="Email"
                type="email"
                placeholder="you@email.com"
                error="Email format is not valid."
              />
              <ObraInput label="Disabled field" placeholder="Not editable" disabled />
              <ObraInput label="Filled field" defaultValue="Plus Jakarta Sans" />
              <ObraTextarea
                className="md:col-span-2"
                label="Ideal customer avatar"
                placeholder="Describe your ideal customer: age, context, pains, and goals..."
                hint="The more context you provide, the better the generated output."
                assisted
                onAssist={() => {}}
              />
              <ObraTextarea
                className="md:col-span-2"
                label="Avatar with error"
                defaultValue="Very short description."
                error="The avatar must contain at least 50 characters."
              />
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="border-b border-obra-blue-100 pb-3 text-lg font-semibold text-obra-blue-950">
            Badges
          </h2>
          <article className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-obra-neutral-600">Base</p>
                <div className="flex flex-wrap items-center gap-3">
                  <ObraBadge variant="default">Default</ObraBadge>
                  <ObraBadge variant="warning">Warning</ObraBadge>
                  <ObraBadge variant="credits">1,240 credits</ObraBadge>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                  Project states (with dot)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ObraBadge variant="draft" showDot>
                    Draft
                  </ObraBadge>
                  <ObraBadge variant="published" showDot>
                    Published
                  </ObraBadge>
                  <ObraBadge variant="modified" showDot>
                    Modified
                  </ObraBadge>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
