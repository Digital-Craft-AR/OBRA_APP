import { Route, Routes, Navigate } from "react-router-dom";
import { EntitlementLayout } from "@/layouts/EntitlementLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { ActivatingShellPage } from "@/pages/ActivatingShellPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { PendingSubscriptionShellPage } from "@/pages/PendingSubscriptionShellPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SubscriptionErrorShellPage } from "@/pages/SubscriptionErrorShellPage";
import { VerifyEmailShellPage } from "@/pages/VerifyEmailShellPage";
import { CheckoutReturnPage } from "@/pages/CheckoutReturnPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="checkout/return" element={<CheckoutReturnPage />} />
        <Route path="app" element={<EntitlementLayout />}>
          <Route path="verify-email" element={<VerifyEmailShellPage />} />
          <Route path="pending-subscription" element={<PendingSubscriptionShellPage />} />
          <Route path="activating" element={<ActivatingShellPage />} />
          <Route path="subscription-error" element={<SubscriptionErrorShellPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
