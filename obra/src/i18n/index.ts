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
      "home.ctaRegister": "Crear cuenta",
      "auth.email": "Correo",
      "auth.password": "Contraseña",
      "auth.submit": "Entrar",
      "auth.working": "Entrando…",
      "auth.error": "No pudimos iniciar sesión. Revisá tus datos.",
      "auth.continueWithGoogle": "Continuar con Google",
      "auth.orDivider": "o",
      "auth.callbackError": "No pudimos completar el inicio de sesión. Probá de nuevo.",
      "auth.oauthProviderError": "El acceso con Google falló o se canceló.",
      "auth.oauthCancelled": "Cancelaste el inicio con Google. Podés intentar de nuevo cuando quieras.",
      "auth.oauthServerError": "Google no está disponible por un momento. Probá de nuevo en unos minutos.",
      "auth.oauthStartError": "No pudimos abrir Google. Probá de nuevo.",
      "auth.oauthPopupBlocked": "El navegador bloqueó la ventana de Google. Permití ventanas emergentes para este sitio e intentá de nuevo.",
      "auth.backToLogin": "Volver al inicio de sesión",
      "auth.registerTitle": "Crear cuenta",
      "auth.registerSubmit": "Registrarme",
      "auth.registerError": "No pudimos crear la cuenta. Probá de nuevo.",
      "auth.registerAlreadyExists": "Ese correo ya tiene cuenta. Iniciá sesión o usá recuperación de acceso.",
      "auth.registerPasswordWeak": "La contraseña no cumple los requisitos de seguridad. Usá al menos 8 caracteres.",
      "auth.registerCheckEmail":
        "Te enviamos un correo de confirmación. Abrí el enlace para continuar; después podés iniciar sesión.",
      "auth.haveAccount": "¿Ya tenés cuenta? Iniciar sesión",
      "auth.needAccount": "¿No tenés cuenta? Registrate",
      "auth.emailNotConfirmed": "Tu correo aún no está confirmado. Revisá tu bandeja o pedí un nuevo envío desde la cuenta.",
      "auth.resendSent": "Te reenviamos el correo de confirmación.",
      "auth.resendError": "No pudimos reenviar el correo. Probá más tarde.",
      "auth.resendRateLimited": "Demasiados intentos. Esperá unos minutos antes de pedir otro correo.",
      "shell.supportHint":
        "Si necesitás ayuda, usá el canal de contacto indicado en tu correo de bienvenida o en la web de Obra.",
      "shell.verify.title": "Confirmá tu correo",
      "shell.verify.body":
        "Para continuar con el pago y el panel, necesitamos que confirmes tu dirección de correo.",
      "shell.verify.resend": "Reenviar correo",
      "shell.verify.refreshedSession": "Ya confirmé — actualizar",
      "shell.pending.title": "Completá tu suscripción",
      "shell.pending.body":
        "Obra funciona con una suscripción activa. El siguiente paso es abonar el plan con Mercado Pago.",
      "shell.pending.cta": "Ir al pago",
      "shell.pending.checkoutNote":
        "El checkout con Mercado Pago se conectará aquí en una entrega próxima (issue #35).",
      "shell.activating.title": "Activando tu suscripción",
      "shell.activating.body":
        "Estamos confirmando el pago con tu banco y Mercado Pago. Suele tardar solo unos segundos.",
      "shell.activating.refresh": "Actualizar estado",
      "shell.activating.clearReturn": "Salir de esta pantalla",
      "shell.activating.note":
        "Si ya pasaron varios minutos, usá “Actualizar estado” o contactá soporte con el comprobante de pago.",
      "shell.subscriptionError.title": "Suscripción en pausa",
      "shell.subscriptionError.body":
        "Tu suscripción no está activa. Actualizá el medio de pago en Mercado Pago o contactá soporte.",
      "shell.subscriptionError.credits":
        "Los créditos que compraste no se pierden: volverán a estar disponibles cuando la suscripción esté activa.",
      "entitlement.profileError": "No pudimos cargar tu perfil. Recargá la página o probá más tarde.",
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
      "home.ctaRegister": "Criar conta",
      "auth.email": "E-mail",
      "auth.password": "Senha",
      "auth.submit": "Entrar",
      "auth.working": "Entrando…",
      "auth.error": "Não foi possível entrar. Verifique seus dados.",
      "auth.continueWithGoogle": "Continuar com Google",
      "auth.orDivider": "ou",
      "auth.callbackError": "Não foi possível concluir o login. Tente novamente.",
      "auth.oauthProviderError": "O login com Google falhou ou foi cancelado.",
      "auth.oauthCancelled": "Você cancelou o login com Google. Pode tentar de novo quando quiser.",
      "auth.oauthServerError": "O Google não está disponível no momento. Tente novamente em alguns minutos.",
      "auth.oauthStartError": "Não foi possível abrir o Google. Tente novamente.",
      "auth.oauthPopupBlocked": "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.",
      "auth.backToLogin": "Voltar ao login",
      "auth.registerTitle": "Criar conta",
      "auth.registerSubmit": "Cadastrar",
      "auth.registerError": "Não foi possível criar a conta. Tente novamente.",
      "auth.registerAlreadyExists": "Esse e-mail já tem conta. Entre ou use a recuperação de acesso.",
      "auth.registerPasswordWeak": "A senha não atende aos requisitos de segurança. Use pelo menos 8 caracteres.",
      "auth.registerCheckEmail":
        "Enviamos um e-mail de confirmação. Abra o link para continuar; depois você pode entrar.",
      "auth.haveAccount": "Já tem conta? Entrar",
      "auth.needAccount": "Não tem conta? Cadastre-se",
      "auth.emailNotConfirmed":
        "Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada ou solicite um novo envio pela conta.",
      "auth.resendSent": "Reenviamos o e-mail de confirmação.",
      "auth.resendError": "Não foi possível reenviar o e-mail. Tente mais tarde.",
      "auth.resendRateLimited": "Muitas tentativas. Aguarde alguns minutos antes de pedir outro e-mail.",
      "shell.supportHint":
        "Se precisar de ajuda, use o canal de contato indicado no e-mail de boas-vindas ou no site da Obra.",
      "shell.verify.title": "Confirme seu e-mail",
      "shell.verify.body":
        "Para continuar com o pagamento e o painel, precisamos que você confirme seu endereço de e-mail.",
      "shell.verify.resend": "Reenviar e-mail",
      "shell.verify.refreshedSession": "Já confirmei — atualizar",
      "shell.pending.title": "Conclua sua assinatura",
      "shell.pending.body":
        "A Obra funciona com uma assinatura ativa. O próximo passo é pagar o plano com o Mercado Pago.",
      "shell.pending.cta": "Ir para o pagamento",
      "shell.pending.checkoutNote":
        "O checkout com Mercado Pago será conectado aqui em uma próxima entrega (issue #35).",
      "shell.activating.title": "Ativando sua assinatura",
      "shell.activating.body":
        "Estamos confirmando o pagamento com seu banco e o Mercado Pago. Geralmente leva só alguns segundos.",
      "shell.activating.refresh": "Atualizar status",
      "shell.activating.clearReturn": "Sair desta tela",
      "shell.activating.note":
        "Se já passaram vários minutos, use “Atualizar status” ou fale com o suporte com o comprovante.",
      "shell.subscriptionError.title": "Assinatura pausada",
      "shell.subscriptionError.body":
        "Sua assinatura não está ativa. Atualize a forma de pagamento no Mercado Pago ou fale com o suporte.",
      "shell.subscriptionError.credits":
        "Os créditos que você comprou não são perdidos: voltam a ficar disponíveis quando a assinatura estiver ativa.",
      "entitlement.profileError": "Não foi possível carregar seu perfil. Recarregue a página ou tente mais tarde.",
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
