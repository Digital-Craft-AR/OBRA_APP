import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { EntitlementProvider, useEntitlement } from "@/entitlement/EntitlementProvider";

function EntitlementGate() {
  const { t } = useTranslation();
  const location = useLocation();
  const { targetPath, loading, loadError } = useEntitlement();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obra-blue-50 text-obra-neutral-600">
        {t("common.loading")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-obra-blue-50 px-6">
        <p className="max-w-md text-center text-sm text-red-600" role="alert">
          {t("entitlement.profileError")}
        </p>
      </div>
    );
  }

  const path = location.pathname;
  if (path !== targetPath) {
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
