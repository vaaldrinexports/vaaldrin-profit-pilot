import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

export interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  orgId: string;
  userId: string;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = async (options: CheckoutOptions) => {
    setLoading(true);
    setError(null);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: { orgId: options.orgId, userId: options.userId },
        settings: {
          displayMode: "overlay",
          successUrl:
            options.successUrl ||
            `${window.location.origin}/app/billing/success?plan=${options.priceId}`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e: any) {
      console.error("openCheckout", e);
      setError(e?.message ?? "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading, error };
}
