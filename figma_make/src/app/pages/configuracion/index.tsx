import { useState } from "react";
import type { ReactNode } from "react";
import { User, Shield, CreditCard, Coins, Lock, Eye, EyeOff } from "lucide-react";
import { ObraButton } from "../../components/obra/button";
import { ObraInput }  from "../../components/obra/input";
import { ObraModal }  from "../../components/obra/modal";
import { ObraBadge }  from "../../components/obra/badge";
import { cn } from "../../components/ui/utils";

type Tab = "perfil" | "seguridad" | "facturacion" | "creditos" | "privacidad";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "perfil",      label: "Perfil",          icon: <User    className="size-4" /> },
  { id: "seguridad",   label: "Seguridad",        icon: <Shield  className="size-4" /> },
  { id: "facturacion", label: "Facturación",      icon: <CreditCard className="size-4" /> },
  { id: "creditos",    label: "Créditos",         icon: <Coins   className="size-4" /> },
  { id: "privacidad",  label: "Privacidad y datos", icon: <Lock  className="size-4" /> },
];

const TRANSACTIONS = [
  { id: 1, date: "06/04/2026", op: "Compra de créditos",          credits: "+1000", project: "—"                         },
  { id: 2, date: "05/04/2026", op: "Generación de contenido IA",  credits: "−45",   project: "Velas aromáticas"          },
  { id: 3, date: "04/04/2026", op: "Generación de imágenes",      credits: "−30",   project: "Repostería en casa"        },
  { id: 4, date: "01/04/2026", op: "Exportación de ebook",        credits: "0",     project: "Velas aromáticas"          },
  { id: 5, date: "28/03/2026", op: "Compra de créditos",          credits: "+500",  project: "—"                         },
  { id: 6, date: "25/03/2026", op: "Generación de portada",       credits: "−20",   project: "Marketing para coaches"    },
];

/* ── Perfil ─────────────────────────────────────────────────────────────── */
function Perfil() {
  const [name,   setName]   = useState("Valentina García");
  const [locale, setLocale] = useState<"es" | "pt-br">("es");
  const [saved,  setSaved]  = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-lg text-obra-blue-950">Perfil</h2>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">Gestioná tu información personal.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="size-16 rounded-full bg-obra-blue-700 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-white font-body">VG</span>
        </div>
      </div>

      {/* Name */}
      <ObraInput
        label="Nombre de display"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Locale */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium font-body text-obra-blue-950">Idioma de la interfaz</label>
        <div className="flex gap-2">
          {(["es","pt-br"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={cn(
                "px-4 py-2 rounded-full border text-sm font-body font-medium transition-all",
                locale === l
                  ? "border-obra-blue-700 bg-obra-blue-700 text-white"
                  : "border-obra-blue-100 text-obra-neutral-600 hover:border-obra-blue-700/50"
              )}
            >
              {l === "es" ? "Español" : "Português Brasil"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <ObraButton variant="secondary" onClick={save}>
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </ObraButton>
      </div>
    </div>
  );
}

/* ── Seguridad ──────────────────────────────────────────────────────────── */
function Seguridad() {
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew,     setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [current,     setCurrent]       = useState("");
  const [newPass,     setNewPass]       = useState("");
  const [confirm,     setConfirm]       = useState("");
  const mismatch = newPass && confirm && newPass !== confirm;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-lg text-obra-blue-950">Seguridad</h2>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">Cambiá tu contraseña y administrá tus métodos de acceso.</p>
      </div>

      {/* Password section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold font-body text-obra-blue-950">Cambiar contraseña</h3>

        {[
          { label:"Contraseña actual",         value:current,  set:setCurrent,  show:showCurrent, toggle:() => setShowCurrent(!showCurrent) },
          { label:"Nueva contraseña",          value:newPass,  set:setNewPass,  show:showNew,     toggle:() => setShowNew(!showNew) },
          { label:"Confirmar nueva contraseña",value:confirm,  set:setConfirm,  show:showConfirm, toggle:() => setShowConfirm(!showConfirm) },
        ].map((f) => (
          <div key={f.label} className="relative">
            <ObraInput
              label={f.label}
              type={f.show ? "text" : "password"}
              placeholder="••••••••"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              error={f.label.includes("Confirmar") && mismatch ? "Las contraseñas no coinciden." : undefined}
            />
            <button
              onClick={f.toggle}
              className="absolute right-3 top-8 text-obra-neutral-400 hover:text-obra-neutral-600 transition-colors"
            >
              {f.show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        ))}

        <ObraButton
          variant="secondary"
          disabled={!current || !newPass || !confirm || !!mismatch}
        >
          Actualizar contraseña
        </ObraButton>
      </div>

      {/* Linked providers */}
      <div className="flex flex-col gap-3 pt-4 border-t border-obra-blue-100">
        <h3 className="text-sm font-semibold font-body text-obra-blue-950">Proveedores vinculados</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-4 bg-obra-blue-50 border border-obra-blue-100 rounded-card">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div className="flex-1">
              <span className="text-sm font-semibold font-body text-obra-blue-950">Google</span>
              <span className="text-xs text-obra-neutral-600 font-body block">valentina@gmail.com</span>
            </div>
            <ObraBadge variant="published">Conectado</ObraBadge>
            <div className="relative group">
              <ObraButton variant="tertiary" size="sm" disabled>
                Desconectar
              </ObraButton>
              <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
                <div className="bg-obra-blue-950 text-white text-xs rounded-card px-3 py-2 max-w-48 text-center leading-relaxed font-body">
                  Agregá otro método primero para no perder el acceso.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-obra-blue-100 rounded-card">
            <div className="size-5 flex items-center justify-center text-obra-neutral-400">✉</div>
            <div className="flex-1">
              <span className="text-sm font-semibold font-body text-obra-blue-950">Email y contraseña</span>
              <span className="text-xs text-obra-neutral-400 font-body block">No configurado</span>
            </div>
            <ObraButton variant="secondary" size="sm">Configurar</ObraButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Facturación ────────────────────────────────────────────────────────── */
function Facturacion() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-lg text-obra-blue-950">Facturación</h2>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">Estado de tu suscripción y opciones de pago.</p>
      </div>

      {/* Subscription card */}
      <div className="bg-white border border-obra-blue-100 rounded-card p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold font-body text-obra-blue-950">Plan Creador</span>
            <span className="text-xs text-obra-neutral-600 font-body">Renovación: 6 de mayo de 2026</span>
          </div>
          <ObraBadge variant="published" showDot>Activa</ObraBadge>
        </div>

        <div className="border-t border-obra-blue-100 pt-4 flex flex-col gap-3">
          <ObraButton variant="secondary" className="self-start" onClick={() => {}}>
            Gestionar suscripción en Mercado Pago
          </ObraButton>
          <div>
            <ObraButton variant="tertiary" size="sm" onClick={() => {}}>
              Verificar estado
            </ObraButton>
            <p className="text-xs text-obra-neutral-400 font-body mt-1">
              La actualización puede tardar unos minutos si acabás de realizar un pago.
            </p>
          </div>
        </div>

        <div className="bg-obra-blue-50 border border-obra-blue-100 rounded-card px-4 py-3">
          <p className="text-xs text-obra-neutral-600 font-body">
            Obra actualiza el estado de la suscripción únicamente cuando Mercado Pago envía una confirmación. No mostramos "cancelada" hasta recibir esa notificación.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Créditos ───────────────────────────────────────────────────────────── */
function Creditos() {
  const [page, setPage] = useState(1);
  const perPage = 4;
  const totalPages = Math.ceil(TRANSACTIONS.length / perPage);
  const visible = TRANSACTIONS.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-lg text-obra-blue-950">Créditos</h2>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">Tu saldo y el historial de movimientos.</p>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between bg-obra-blue-50 border border-obra-blue-100 rounded-card p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide">Saldo actual</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl text-obra-blue-950">1.240</span>
            <span className="text-sm font-body text-obra-neutral-600">créditos</span>
          </div>
        </div>
        <ObraButton variant="primary" onClick={() => {}}>
          Comprar créditos
        </ObraButton>
      </div>

      {/* Transaction table */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold font-body text-obra-blue-950">Historial</h3>
        <div className="border border-obra-blue-100 rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obra-blue-100 bg-obra-blue-50">
                {["Fecha","Operación","Créditos","Proyecto"].map((col) => (
                  <th key={col} className="text-left text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((tx) => (
                <tr key={tx.id} className="border-b border-obra-blue-100 last:border-b-0 hover:bg-obra-blue-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-body text-obra-neutral-600">{tx.date}</td>
                  <td className="px-4 py-3 text-sm font-body text-obra-blue-950">{tx.op}</td>
                  <td className={cn(
                    "px-4 py-3 text-sm font-semibold font-body",
                    tx.credits.startsWith("+") ? "text-obra-blue-700" : tx.credits === "0" ? "text-obra-neutral-400" : "text-red-500"
                  )}>
                    {tx.credits}
                  </td>
                  <td className="px-4 py-3 text-xs font-body text-obra-neutral-600">{tx.project}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-obra-neutral-400 font-body">
            Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, TRANSACTIONS.length)} de {TRANSACTIONS.length}
          </span>
          <div className="flex gap-1">
            <ObraButton
              variant="tertiary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </ObraButton>
            <ObraButton
              variant="tertiary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </ObraButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Privacidad ─────────────────────────────────────────────────────────── */
function Privacidad() {
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep,  setDeleteStep]  = useState<1 | 2>(1);
  const [confirmEmail, setConfirmEmail] = useState("");
  const MY_EMAIL = "valentina@gmail.com";
  const emailMatches = confirmEmail === MY_EMAIL;

  const closeDeleteModal = () => { setDeleteModal(false); setDeleteStep(1); setConfirmEmail(""); };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-lg text-obra-blue-950">Privacidad y datos</h2>
        <p className="text-sm text-obra-neutral-600 font-body mt-1">Controlá tu información y tu cuenta.</p>
      </div>

      {/* Export */}
      <div className="flex flex-col gap-3 pb-6 border-b border-obra-blue-100">
        <h3 className="text-sm font-semibold font-body text-obra-blue-950">Exportar mis datos</h3>
        <p className="text-sm text-obra-neutral-600 font-body">
          Descargá un archivo ZIP con todos tus proyectos, textos generados, configuración de cuenta y el historial de créditos.
        </p>
        <ObraButton variant="tertiary" className="self-start" onClick={() => {}}>
          Exportar mis datos
        </ObraButton>
      </div>

      {/* Delete — visually separated with warning context */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold font-body text-red-600">Eliminar cuenta</h3>
          <span className="text-xs font-body text-red-400 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            Acción irreversible
          </span>
        </div>
        <p className="text-sm text-obra-neutral-600 font-body">
          Se eliminarán permanentemente todos tus proyectos, contenido generado y datos de cuenta. Tu suscripción será cancelada en Mercado Pago.
        </p>
        <ObraButton variant="destructive" className="self-start" onClick={() => setDeleteModal(true)}>
          Eliminar cuenta
        </ObraButton>
      </div>

      {/* Delete modal */}
      <ObraModal
        open={deleteModal}
        onClose={closeDeleteModal}
        title="Eliminar cuenta"
        destructive
        description={deleteStep === 1 ? "Revisá qué se eliminará antes de continuar." : "Confirmá escribiendo tu email."}
        footer={
          deleteStep === 1 ? (
            <>
              <ObraButton variant="tertiary" onClick={closeDeleteModal}>Cancelar</ObraButton>
              <ObraButton variant="secondary" onClick={() => setDeleteStep(2)}>
                Entiendo, continuar
              </ObraButton>
            </>
          ) : (
            <>
              <ObraButton variant="tertiary" onClick={() => setDeleteStep(1)}>← Volver</ObraButton>
              <ObraButton variant="destructive" disabled={!emailMatches}>
                Eliminar mi cuenta
              </ObraButton>
            </>
          )
        }
      >
        {deleteStep === 1 ? (
          <div className="flex flex-col gap-3">
            {[
              "Todos tus proyectos e infoproductos",
              "El contenido generado con IA",
              "Tu historial de créditos",
              "Tu información de perfil",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-body text-obra-neutral-900">
                <span className="size-1.5 rounded-full bg-red-400 shrink-0" />
                {item}
              </div>
            ))}
            <div className="bg-yellow-50 border border-yellow-200 rounded-card px-4 py-3 mt-2">
              <p className="text-xs text-yellow-800 font-body">
                Si tenés una suscripción activa, se solicitará la cancelación a Mercado Pago. Si el proceso falla, la cuenta no se eliminará.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ObraInput
              label={`Escribí tu email (${MY_EMAIL}) para confirmar`}
              placeholder="tu@email.com"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              error={confirmEmail && !emailMatches ? "El email no coincide." : undefined}
            />
          </div>
        )}
      </ObraModal>
    </div>
  );
}

/* ── Configuración ──────────────────────────────────────────────────────── */
export function Configuracion() {
  const [tab, setTab] = useState<Tab>("perfil");

  const CONTENT: Record<Tab, ReactNode> = {
    perfil:      <Perfil />,
    seguridad:   <Seguridad />,
    facturacion: <Facturacion />,
    creditos:    <Creditos />,
    privacidad:  <Privacidad />,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-10 py-6 border-b border-obra-blue-100">
        <h1 className="font-display text-xl text-obra-blue-950">Configuración</h1>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Secondary left nav */}
        <nav className="w-52 shrink-0 border-r border-obra-blue-100 overflow-y-auto py-4 px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-all text-left",
                tab === t.id
                  ? "bg-obra-blue-100 text-obra-blue-900"
                  : "text-obra-neutral-600 hover:bg-obra-blue-50 hover:text-obra-blue-900"
              )}
            >
              <span className={tab === t.id ? "text-obra-blue-700" : "text-obra-neutral-400"}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-10 py-8 max-w-2xl">
          {CONTENT[tab]}
        </div>
      </div>
    </div>
  );
}