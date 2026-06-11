import { create } from "zustand";

export type GateModalType =
  | null
  | "pro-gate"
  | "biz-gate"
  | "limit-reached"
  | "file-too-large"
  | "pages-exceeded"
  | "batch-limit-exceeded"
  | "pro-trial-info"
  | "pro-trial-limit";

interface UsageState {
  activeGate: GateModalType;
  toolName: string;
  limitDetails: {
    currentVal?: number | string;
    maxVal?: number | string;
  };
  isLoadingCheckout: boolean;
  targetHref: string;

  openGate: (
    type: GateModalType,
    toolName?: string,
    details?: { currentVal?: number | string; maxVal?: number | string }
  ) => void;
  closeGate: () => void;
  setTargetHref: (href: string) => void;
  triggerCheckout: (
    plan: "pro" | "business",
    billingCycle: "monthly" | "yearly"
  ) => Promise<void>;
}

export const useUsageStore = create<UsageState>((set) => ({
  activeGate: null,
  toolName: "",
  limitDetails: {},
  isLoadingCheckout: false,
  targetHref: "",

  openGate: (type, toolName = "", details = {}) =>
    set({ activeGate: type, toolName, limitDetails: details }),
  closeGate: () => set({ activeGate: null, toolName: "", limitDetails: {}, targetHref: "" }),
  setTargetHref: (href) => set({ targetHref: href }),
  triggerCheckout: async (plan, billingCycle) => {
    set({ isLoadingCheckout: true });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });
      if (!res.ok) {
        throw new Error("Checkout session request failed");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (err) {
      console.error("Failed to start LemonSqueezy checkout:", err);
      alert("Failed to initialize checkout session. Please check your credentials or try again.");
    } finally {
      set({ isLoadingCheckout: false });
    }
  },
}));
