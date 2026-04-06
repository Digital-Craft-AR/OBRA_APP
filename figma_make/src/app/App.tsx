import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Monitor } from "lucide-react";

function MobileGate() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-obra-blue-50 p-10 lg:hidden font-body">
      {/* Icon */}
      <div className="size-16 rounded-full bg-obra-blue-100 flex items-center justify-center mb-6">
        <Monitor className="size-7 text-obra-blue-700" />
      </div>

      {/* Logo */}
      <span className="font-display text-2xl font-bold text-obra-blue-950 mb-4">obra</span>

      {/* Message */}
      <div className="flex flex-col gap-3 text-center max-w-xs">
        <h1 className="font-body font-semibold text-obra-blue-950">
          Optimizada para computadoras
        </h1>
        <p className="text-sm font-body text-obra-neutral-600 leading-relaxed">
          Obra está diseñada para pantallas de escritorio. Abrila desde tu computadora o laptop para acceder a todas las funcionalidades.
        </p>
      </div>

      {/* Divider + footer note */}
      <div className="mt-8 pt-6 border-t border-obra-blue-200 w-full max-w-xs text-center">
        <p className="text-xs font-body text-obra-neutral-400">
          Resolución recomendada: 1280px o más
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* Overlay on mobile & tablet — hidden on lg+ */}
      <MobileGate />

      {/* Full app — always mounted, visually covered on small screens */}
      <RouterProvider router={router} />
    </>
  );
}
