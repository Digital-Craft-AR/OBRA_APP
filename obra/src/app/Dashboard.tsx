import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useProjectStore } from "@/store/projectStore"

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const wizardStep = useProjectStore((s) => s.wizardStep)
  const setWizardStep = useProjectStore((s) => s.setWizardStep)
  const [locale, setLocale] = useState(i18n.language)

  const toggleLocale = () => {
    const next = locale === "es" ? "pt-BR" : "es"
    i18n.changeLanguage(next)
    setLocale(next)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-sidebar bg-obra-blue-900 text-white flex flex-col p-6">
        <h1 className="font-display text-2xl font-bold mb-8">
          {t("app.name")}
        </h1>
        <nav className="flex flex-col gap-2">
          <span className="text-sm text-white/70">{t("nav.dashboard")}</span>
          <span className="text-sm text-white/70">{t("nav.settings")}</span>
          <span className="text-sm text-white/70">{t("nav.help")}</span>
        </nav>
        <div className="mt-auto">
          <button
            onClick={toggleLocale}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            {locale === "es" ? "Português" : "Español"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white p-8">
        <h2 className="text-2xl font-display font-bold text-obra-blue-950 mb-2">
          {t("dashboard.title")}
        </h2>
        <p className="text-sm text-obra-neutral-600 mb-6">
          {t("app.tagline")}
        </p>

        {/* Empty state card */}
        <div className="bg-white border border-obra-blue-100 rounded-card shadow-card p-8 max-w-lg hover:border-obra-blue-700 hover:shadow-card-hover hover:-translate-y-1 transition-all">
          <p className="text-sm text-obra-neutral-600 mb-4">
            {t("dashboard.empty")}
          </p>
          <Button
            className="bg-obra-green-400 text-obra-blue-950 rounded-pill px-6 hover:brightness-105"
            onClick={() => setWizardStep(wizardStep + 1)}
          >
            {t("dashboard.createFirst")}
          </Button>
          <p className="text-xs text-obra-neutral-400 mt-3">
            Wizard step: {wizardStep}
          </p>
        </div>
      </main>
    </div>
  )
}
