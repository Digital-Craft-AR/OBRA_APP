import { useNavigate } from "react-router";
import { ObraButton } from "../../components/obra/button";

export function SuscripcionPendiente() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obra-blue-50 flex items-center justify-center p-6 font-body">
      <div className="w-full max-w-auth-card flex flex-col items-center gap-8 text-center">

        {/* Icon */}
        <div className="size-16 rounded-full bg-obra-green-400/20 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#204970" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl text-obra-blue-950">
            Activá tu suscripción
          </h1>
          <p className="text-sm text-obra-neutral-600 font-body leading-relaxed">
            Para acceder a Obra necesitás una suscripción activa. Elegí el plan que mejor se adapta a tu negocio y empezá a crear infoproductos con IA.
          </p>
        </div>

        {/* Plan card */}
        <div className="w-full bg-white border border-obra-blue-100 rounded-2xl p-6 flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold font-body text-obra-blue-950">Plan Creador</span>
            <span className="text-xs font-body text-obra-neutral-600 bg-obra-blue-50 px-2 py-1 rounded-full">Más popular</span>
          </div>
          <div>
            <span className="font-display text-3xl text-obra-blue-950">$29</span>
            <span className="text-sm text-obra-neutral-600 font-body"> / mes (ARS ~$29.000)</span>
          </div>
          <ul className="flex flex-col gap-2">
            {["Proyectos ilimitados", "1.000 créditos mensuales", "Exportación en PDF", "Soporte por email"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-body text-obra-neutral-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8E62B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full">
          <ObraButton
            variant="primary"
            className="w-full"
            onClick={() => {}}
          >
            Ir al checkout con Mercado Pago
          </ObraButton>
          <button
            onClick={() => navigate("/activando-suscripcion")}
            className="text-sm text-obra-blue-700 hover:underline font-body"
          >
            ¿Ya realizaste el pago? Verificar estado
          </button>
        </div>

        {/* Help */}
        <p className="text-xs text-obra-neutral-400 font-body">
          ¿Tenés dudas?{" "}
          <a href="mailto:hola@obra.app" className="text-obra-blue-700 hover:underline">
            hola@obra.app
          </a>
        </p>
      </div>
    </div>
  );
}