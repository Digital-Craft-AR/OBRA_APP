import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthFlowLoading } from "@/components/obra/AuthFlowLoading";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
import { EntitlementProvider, useEntitlement } from "@/entitlement/EntitlementProvider";
import { isPathAllowedForOutcome } from "@/entitlement/resolveEntitlement";

function EntitlementGate() {
  const { t } = useTranslation();
  const location = useLocation();
  const { outcome, targetPath, loading, loadError } = useEntitlement();

  if (loading) {
    return <AuthFlowLoading variant="fullscreen" />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-obra-blue-50 px-6">
        <ObraLogoLink to="/" imgClassName="h-11 w-auto max-w-[220px] object-contain" />
        <p className="max-w-md text-center text-sm text-red-600" role="alert">
          {t("entitlement.profileError")}
        </p>
      </div>
    );
  }

  const path = location.pathname;
  if (!isPathAllowedForOutcome(outcome, path)) {
    return <Navigate to={targetPath} replace state={{ from: path }} />;
  }

  return <Outlet />;
}

/** Session is already enforced by `ProtectedLayout`; this layer maps entitlement → `/app/*` shells. */
export function EntitlementLayout() {
  return (
    <EntitlementProvider>
      <EntitlementGate />
    </EntitlementProvider>
  );
}
