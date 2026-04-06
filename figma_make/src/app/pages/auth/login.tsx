import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ObraButton } from "../../components/obra/button";
import { ObraInput } from "../../components/obra/input";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-obra-blue-50 flex flex-col items-center justify-center p-6 font-body">
      <div className="w-full max-w-auth-card bg-white border border-obra-blue-100 rounded-2xl p-10 flex flex-col gap-6">

        {/* Logo */}
        <div className="text-center">
          <span className="font-display text-2xl font-bold text-obra-blue-950">obra</span>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="font-display text-xl text-obra-blue-950">Iniciar sesión</h1>
          <p className="text-sm text-obra-neutral-600 font-body mt-1">Bienvenido de vuelta</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <ObraInput
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <ObraInput
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <Link
                to="/olvide-contrasena"
                className="text-xs text-obra-blue-700 hover:underline font-body"
              >
                Olvidé mi contraseña
              </Link>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <ObraButton
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/proyectos")}
          >
            Iniciar sesión
          </ObraButton>
          <ObraButton
            variant="tertiary"
            className="w-full gap-2"
            onClick={() => navigate("/proyectos")}
          >
            <GoogleIcon />
            Continuar con Google
          </ObraButton>
        </div>

        {/* Register link */}
        <p className="text-center text-sm font-body text-obra-neutral-600">
          ¿No tenés cuenta?{" "}
          <Link to="/registro" className="text-obra-blue-700 hover:underline font-medium">
            Registrate
          </Link>
        </p>

        {/* Footer */}
        <div className="border-t border-obra-blue-100 pt-4 flex justify-center gap-5">
          <Link to="#" className="text-xs text-obra-neutral-400 hover:text-obra-neutral-600 font-body">
            Términos
          </Link>
          <Link to="#" className="text-xs text-obra-neutral-400 hover:text-obra-neutral-600 font-body">
            Privacidad
          </Link>
        </div>
      </div>
    </div>
  );
}