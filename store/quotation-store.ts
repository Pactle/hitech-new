"use client";

import { create } from "zustand";
import { calculateQuotation } from "@/lib/freight";
import { defaultSettings, demoSuite2Inquiry, demoSuite2Settings, emptyInquiry, sampleInquiry } from "@/lib/sample-data";
import type { CalculationResult, ParsedInquiry, PipeItem, QuoteSettings } from "@/types/quotation";

type QuotationStore = {
  inquiry: ParsedInquiry;
  items: PipeItem[];
  settings: QuoteSettings;
  calculation: CalculationResult;
  setInquiry: (inquiry: ParsedInquiry) => void;
  updateItem: (id: string, field: keyof PipeItem, value: string | number) => void;
  addItem: (item: PipeItem) => void;
  updateSettings: (patch: Partial<QuoteSettings>) => void;
  loadDemo: () => void;
  loadDemoSuite2: () => void;
  clear: () => void;
};

function recalculate(items: PipeItem[], settings: QuoteSettings) {
  return calculateQuotation(items, settings);
}

export const useQuotationStore = create<QuotationStore>((set) => ({
  inquiry: emptyInquiry,
  items: [],
  settings: defaultSettings,
  calculation: recalculate([], defaultSettings),
  setInquiry: (inquiry) =>
    set((state) => ({
      inquiry,
      items: inquiry.items,
      calculation: recalculate(inquiry.items, state.settings)
    })),
  updateItem: (id, field, value) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== id) return item;
        const nextValue = typeof item[field] === "number" ? Number(value) : String(value);
        const next = { ...item, [field]: nextValue };
        next.rateMeter = Number((next.wtPerMeter * next.rateKg).toFixed(2));
        next.amount = Number((next.qty * next.rateMeter).toFixed(2));
        next.totalWeight = Number((next.qty * next.wtPerMeter).toFixed(2));
        next.description = next.description || `PE100 PN${next.pn} DN${next.dn}`;
        return next;
      });
      return { items, calculation: recalculate(items, state.settings) };
    }),
  addItem: (item) =>
    set((state) => {
      const items = [...state.items, item];
      return { items, calculation: recalculate(items, state.settings) };
    }),
  updateSettings: (patch) =>
    set((state) => {
      const settings = { ...state.settings, ...patch };
      return { settings, calculation: recalculate(state.items, settings) };
    }),
  loadDemo: () => {
    set({
      inquiry: sampleInquiry,
      items: sampleInquiry.items,
      settings: defaultSettings,
      calculation: recalculate(sampleInquiry.items, defaultSettings)
    });
  },
  loadDemoSuite2: () => {
    set({
      inquiry: demoSuite2Inquiry,
      items: demoSuite2Inquiry.items,
      settings: demoSuite2Settings,
      calculation: recalculate(demoSuite2Inquiry.items, demoSuite2Settings)
    });
  },
  clear: () => {
    set({
      inquiry: emptyInquiry,
      items: [],
      settings: defaultSettings,
      calculation: recalculate([], defaultSettings)
    });
  }
}));
