import { createBrowserRouter, Navigate } from "react-router";

import { AppLayout }             from "./components/obra/app-layout";

import { Login }                 from "./pages/auth/login";
import { Registro }              from "./pages/auth/registro";
import { VerificarEmail }        from "./pages/auth/verificar-email";
import { SuscripcionPendiente }  from "./pages/auth/suscripcion-pendiente";
import { ActivandoSuscripcion }  from "./pages/auth/activando-suscripcion";
import { ErrorSuscripcion }      from "./pages/auth/error-suscripcion";

import { Dashboard }             from "./pages/dashboard/index";
import { WizardEstructura }      from "./pages/wizard/estructura";
import { WizardContenidoIA }     from "./pages/wizard/contenido-ia";
import { WizardContenidoUpload } from "./pages/wizard/contenido-upload";
import { WizardPreview }         from "./pages/wizard/preview";
import { WizardModo }            from "./pages/wizard/modo";
import { Configuracion }         from "./pages/configuracion/index";
import { Ayuda }                 from "./pages/ayuda/index";
import { DesignSystem }          from "./pages/design-system";

function RedirectHome() {
  return <Navigate to="/proyectos" replace />;
}

export const router = createBrowserRouter([
  /* ── Auth routes — no sidebar ──────��─────────────────────────────────── */
  { path: "/login",                  Component: Login                },
  { path: "/registro",               Component: Registro             },
  { path: "/verificar-email",        Component: VerificarEmail       },
  { path: "/suscripcion-pendiente",  Component: SuscripcionPendiente },
  { path: "/activando-suscripcion",  Component: ActivandoSuscripcion },
  { path: "/error-suscripcion",      Component: ErrorSuscripcion     },

  /* ── Wizard routes — full screen, no sidebar ──────────────────────────── */
  { path: "proyectos/:id/modo",             Component: WizardModo            },
  { path: "proyectos/:id/estructura",       Component: WizardEstructura      },
  { path: "proyectos/:id/contenido",        Component: WizardContenidoIA     },
  { path: "proyectos/:id/contenido-upload", Component: WizardContenidoUpload },
  { path: "proyectos/:id/preview",          Component: WizardPreview         },

  /* ── App routes — with sidebar ────────────────────────────────────────── */
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true,           Component: RedirectHome  },
      { path: "proyectos",     Component: Dashboard     },
      { path: "configuracion", Component: Configuracion },
      { path: "ayuda",         Component: Ayuda         },
      { path: "design-system", Component: DesignSystem  },
    ],
  },
]);