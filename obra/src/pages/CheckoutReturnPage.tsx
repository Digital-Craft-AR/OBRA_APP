import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  consumeCheckoutReturnMessageKey,
  setCheckoutReturnMessageKey,
  setCheckoutReturnPending,
} from "@/entitlement/checkoutReturn";
import { AuthFlowLoading } from "@/components/obra/AuthFlowLoading";

/**
 * Mercado Pago `back_urls` target. Sets session flags then hands off to `/app` entitlement routing.
 */
export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get("status");

    if (status === "success") {
      setCheckoutReturnPending();
      consumeCheckoutReturnMessageKey();
      void navigate("/app", { replace: true });
      return;
    }

    if (status === "failure") {
      setCheckoutReturnMessageKey("shell.pending.checkoutReturnedFailure");
      void navigate("/app", { replace: true });
      return;
    }

    if (status === "pending") {
      setCheckoutReturnMessageKey("shell.pending.checkoutReturnedPending");
      void navigate("/app", { replace: true });
      return;
    }

    void navigate("/app", { replace: true });
  }, [navigate, searchParams]);

  return <AuthFlowLoading variant="fullscreen" />;
}
