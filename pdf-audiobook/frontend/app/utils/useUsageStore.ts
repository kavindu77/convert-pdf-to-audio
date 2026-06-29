import { create } from "zustand";

// Minimal stub — all tools are free in the ad-supported model.
// Gate types retained for type compatibility but are never triggered.
export type GateModalType = null;

interface UsageState {
  activeGate: GateModalType;
  toolName: string;
  limitDetails: Record<string, unknown>;
  isLoadingCheckout: boolean;
  targetHref: string;
  openGate: (type: GateModalType, toolName?: string, details?: Record<string, unknown>) => void;
  closeGate: () => void;
  setTargetHref: (href: string) => void;
  triggerCheckout: (plan: "pro" | "business", billingCycle: "monthly" | "yearly") => Promise<void>;
}

export const useUsageStore = create<UsageState>(() => ({
  activeGate: null,
  toolName: "",
  limitDetails: {},
  isLoadingCheckout: false,
  targetHref: "",
  openGate: () => {},
  closeGate: () => {},
  setTargetHref: () => {},
  triggerCheckout: async () => {},
}));


