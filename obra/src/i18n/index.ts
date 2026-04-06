import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: {
    translation: {
      "app.name": "Obra",
      "nav.home": "Inicio",
      "nav.login": "Iniciar sesión",
      "nav.app": "Aplicación",
      "nav.logout": "Cerrar sesión",
      "home.lead": "Paquete digital con IA para infoproductos.",
      "home.ctaLogin": "Ir al inicio de sesión",
      "auth.email": "Correo",
      "auth.password": "Contraseña",
      "auth.submit": "Entrar",
      "auth.working": "Entrando…",
      "auth.error": "No pudimos iniciar sesión. Revisá tus datos.",
      "auth.continueWithGoogle": "Continuar con Google",
      "auth.orDivider": "o",
      "auth.callbackError": "No pudimos completar el inicio de sesión. Probá de nuevo.",
      "auth.oauthProviderError": "El acceso con Google falló o se canceló.",
      "auth.oauthStartError": "No pudimos abrir Google. Probá de nuevo.",
      "auth.backToLogin": "Volver al inicio de sesión",
      "dashboard.title": "Panel",
      "dashboard.profileLoading": "Cargando perfil…",
      "dashboard.profileEmpty": "Sin fila de perfil todavía. Aplicá la migración RLS o registrate de nuevo.",
      "dashboard.welcome": "Sesión activa.",
      "dashboard.field.id": "Identificador",
      "dashboard.field.displayName": "Nombre para mostrar",
      "common.loading": "Cargando…",
    },
  },
  "pt-BR": {
    translation: {
      "app.name": "Obra",
      "nav.home": "Início",
      "nav.login": "Entrar",
      "nav.app": "Aplicativo",
      "nav.logout": "Sair",
      "home.lead": "Pacote digital com IA para infoprodutos.",
      "home.ctaLogin": "Ir para o login",
      "auth.email": "E-mail",
      "auth.password": "Senha",
      "auth.submit": "Entrar",
      "auth.working": "Entrando…",
      "auth.error": "Não foi possível entrar. Verifique seus dados.",
      "auth.continueWithGoogle": "Continuar com Google",
      "auth.orDivider": "ou",
      "auth.callbackError": "Não foi possível concluir o login. Tente novamente.",
      "auth.oauthProviderError": "O login com Google falhou ou foi cancelado.",
      "auth.oauthStartError": "Não foi possível abrir o Google. Tente novamente.",
      "auth.backToLogin": "Voltar ao login",
      "dashboard.title": "Painel",
      "dashboard.profileLoading": "Carregando perfil…",
      "dashboard.profileEmpty": "Sem linha de perfil ainda. Aplique a migração RLS ou cadastre-se de novo.",
      "dashboard.welcome": "Sessão ativa.",
      "dashboard.field.id": "Identificador",
      "dashboard.field.displayName": "Nome de exibição",
      "common.loading": "Carregando…",
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export { i18n };
