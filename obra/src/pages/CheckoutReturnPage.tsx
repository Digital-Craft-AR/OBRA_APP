import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  consumeCheckoutReturnMessageKey,
  setCheckoutReturnMessageKey,
  setCheckoutReturnPending,
} from "@/entitlement/checkoutReturn";
import { AuthFlowLoading } from "@/components/obra/AuthFlowLoading";
import { parsePaymentReturnOutcome } from "@/lib/paymentReturnParams";

/**
 * Payment return URL (`/checkout/return`). Sets session flags then navigates to a concrete
 * `/app/*` shell — `/app` alone is not allowed by `EntitlementGate` (only specific outcomes).
 */
export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const outcome = parsePaymentReturnOutcome(searchParams);

    if (outcome === "success") {
      setCheckoutReturnPending();
      consumeCheckoutReturnMessageKey();
      void navigate("/app/activating", { replace: true });
      return;
    }

    if (outcome === "failure") {
      setCheckoutReturnMessageKey("shell.pending.checkoutReturnedFailure");
      void navigate("/app/pending-subscription", { replace: true });
      return;
    }

    if (outcome === "pending") {
      setCheckoutReturnMessageKey("shell.pending.checkoutReturnedPending");
      void navigate("/app/pending-subscription", { replace: true });
      return;
    }

    void navigate("/app/pending-subscription", { replace: true });
  }, [navigate, searchParams]);

  return <AuthFlowLoading variant="fullscreen" />;
}
