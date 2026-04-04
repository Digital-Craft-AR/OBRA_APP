import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import es from "./es.json"
import ptBR from "./pt-BR.json"

const resources = {
  es: { translation: es },
  "pt-BR": { translation: ptBR },
} as const

i18n.use(initReactI18next).init({
  resources,
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
})

export default i18n
