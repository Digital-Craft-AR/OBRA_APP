import { useNavigate } from "react-router";
import { ObraButton } from "../../components/obra/button";

export function ActivandoSuscripcion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obra-blue-50 flex items-center justify-center p-6 font-body">
      <div className="w-full max-w-auth-card flex flex-col items-center gap-8 text-center">

        {/* Pulse indicator — soft animated rings, not a spinner */}
        <div className="relative flex items-center justify-center size-20">
          <span className="absolute inline-flex size-20 rounded-full bg-obra-green-400/20 animate-ping" />
          <span className="absolute inline-flex size-14 rounded-full bg-obra-green-400/30 animate-ping" style={{ animationDelay: "150ms" }} />
          <span className="relative inline-flex size-10 rounded-full bg-obra-green-400 items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F2438" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl text-obra-blue-950">
            Activando tu suscripción...
          </h1>
          <p className="text-sm text-obra-neutral-600 font-body leading-relaxed">
            Recibimos tu pago correctamente. Estamos sincronizando tu cuenta con Mercado Pago — esto solo tarda un momento. No cierres esta página.
          </p>
        </div>

        {/* Progress hint */}
        <div className="w-full bg-obra-blue-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-obra-green-400 rounded-full animate-pulse" style={{ width: "65%" }} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <ObraButton
            variant="tertiary"
            className="w-full"
            onClick={() => navigate("/proyectos")}
          >
            Verificar estado
          </ObraButton>
          <p className="text-xs text-obra-neutral-400 font-body">
            Si esto tarda más de 2 minutos, contactanos a{" "}
            <a href="mailto:hola@obra.app" className="text-obra-blue-700 hover:underline">
              hola@obra.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}