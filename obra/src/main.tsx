import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { ToastProvider } from "@/toast";
import { App } from "./App";
import { MobileBlocker } from "@/components/MobileBlocker";
import { i18n } from "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <MobileBlocker>
              <App />
            </MobileBlocker>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </I18nextProvider>
  </StrictMode>,
);
