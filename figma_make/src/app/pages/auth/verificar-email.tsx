import { useNavigate } from "react-router";
import { ObraButton } from "../../components/obra/button";

export function VerificarEmail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obra-blue-50 flex flex-col font-body">
      {/* Sign out link top-right */}
      <div className="p-6 flex justify-end">
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-obra-neutral-600 hover:text-obra-blue-700 font-body transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-auth-card text-center px-6">

          {/* Envelope illustration */}
          <div className="size-20 rounded-full bg-obra-blue-100 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#204970" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-2xl text-obra-blue-950">
              Verificá tu email
            </h1>
            <p className="text-sm text-obra-neutral-600 font-body leading-relaxed">
              Te enviamos un link de confirmación a tu casilla. Revisá tu bandeja de entrada (y el spam, por las dudas) y hacé clic en el enlace para activar tu cuenta.
            </p>
          </div>

          {/* Action */}
          <ObraButton variant="tertiary" onClick={() => {}}>
            Reenviar correo
          </ObraButton>

          <p className="text-xs text-obra-neutral-400 font-body">
            ¿Dirección incorrecta?{" "}
            <button
              onClick={() => navigate("/registro")}
              className="text-obra-blue-700 hover:underline"
            >
              Volver al registro
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}