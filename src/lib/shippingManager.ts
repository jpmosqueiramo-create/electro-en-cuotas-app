"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export type ShippingDestination = {
  id: string;
  name: string;
  code: string;
  timeframe: string;
  order: number;
  active: boolean;
  visible: boolean;
  manualQuote: boolean;
  estimatedBase: number;
  notes?: string;
};

export type ShippingLoadType = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  multiplier: number;
  order: number;
  active: boolean;
  visible: boolean;
  manualQuote: boolean;
  notes?: string;
};

export type ShippingRate = {
  id: string; // ${destinationId}_${loadTypeId}_${quantity}
  destinationId: string;
  loadTypeId: string;
  quantity: number; // 1, 2, 3, 4, 5 (para 5+)
  price: number;
  manualQuote: boolean;
  active: boolean;
};

export type ShippingSettings = {
  calculatorActive: boolean;
  currency: string;
  maxAutoBultos: number;
  allowAutoQuote: boolean;
};

export type ShippingConfig = {
  destinations: ShippingDestination[];
  loadTypes: ShippingLoadType[];
  rates: Record<string, ShippingRate>;
  settings: ShippingSettings;
  draftUpdatedAt?: string;
  draftUpdatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
};

// INITIAL SEED DATA DERIVED FROM ENVIOSCALCULATOR
export const SEED_DESTINATIONS: ShippingDestination[] = [
  { id: "lincoln", name: "Lincoln", code: "LIN", timeframe: "Recorrido semanal", order: 1, active: true, visible: true, manualQuote: false, estimatedBase: 12000 },
  { id: "chivilcoy", name: "Chivilcoy", code: "CHV", timeframe: "Recorrido semanal", order: 2, active: true, visible: true, manualQuote: false, estimatedBase: 14000 },
  { id: "lostoldos", name: "Los Toldos", code: "LTO", timeframe: "Recorrido semanal", order: 3, active: true, visible: true, manualQuote: false, estimatedBase: 13000 },
  { id: "obrien", name: "O'Brien", code: "OBR", timeframe: "Recorrido semanal", order: 4, active: true, visible: true, manualQuote: false, estimatedBase: 13500 },
  { id: "zavalia", name: "Zavalía", code: "ZAV", timeframe: "Recorrido semanal", order: 5, active: true, visible: true, manualQuote: false, estimatedBase: 12500 },
  { id: "bragado", name: "Bragado", code: "BRG", timeframe: "Recorrido programado", order: 6, active: true, visible: true, manualQuote: false, estimatedBase: 13800 },
  { id: "pehuajo", name: "Pehuajó", code: "PEH", timeframe: "Recorrido programado", order: 7, active: true, visible: true, manualQuote: false, estimatedBase: 15500 },
  { id: "nuevedejulio", name: "9 de Julio", code: "NDJ", timeframe: "Recorrido programado", order: 8, active: true, visible: true, manualQuote: false, estimatedBase: 14500 },
  { id: "otra", name: "Otra Localidad (Consultar)", code: "OTR", timeframe: "A coordinar", order: 9, active: true, visible: true, manualQuote: true, estimatedBase: 15000 },
];

export const SEED_LOAD_TYPES: ShippingLoadType[] = [
  { id: "electro_grande", name: "Electrodoméstico Grande", desc: "Heladera, Lavarropas, Cocina, Freezer", icon: "🧺", multiplier: 1.6, order: 1, active: true, visible: true, manualQuote: false },
  { id: "tech_tv", name: "Tecnología / TV", desc: "Smart TV, Notebook, Consola, Audio", icon: "📺", multiplier: 1.0, order: 2, active: true, visible: true, manualQuote: false },
  { id: "muebles", name: "Muebles / Colchón", desc: "Sommier, Sofá, Mesa, Sillas", icon: "🛋️", multiplier: 1.8, order: 3, active: true, visible: true, manualQuote: false },
  { id: "bulto_std", name: "Bulto Estándar / Caja", desc: "Cajas de compras, ropa, repuestos", icon: "📦", multiplier: 0.8, order: 4, active: true, visible: true, manualQuote: false },
  { id: "comercio", name: "Carga Múltiple (Comercio)", desc: "Múltiples bultos consolidables", icon: "🏭", multiplier: 2.2, order: 5, active: true, visible: true, manualQuote: false },
];

export const generateSeedRates = (): Record<string, ShippingRate> => {
  const rates: Record<string, ShippingRate> = {};
  for (const d of SEED_DESTINATIONS) {
    for (const c of SEED_LOAD_TYPES) {
      for (let q = 1; q <= 5; q++) {
        const rateId = `${d.id}_${c.id}_${q}`;
        const calculatedPrice = Math.round(d.estimatedBase * c.multiplier * (1 + (q - 1) * 0.4));
        const isManual = d.manualQuote || c.manualQuote || q === 5;
        rates[rateId] = {
          id: rateId,
          destinationId: d.id,
          loadTypeId: c.id,
          quantity: q,
          price: calculatedPrice,
          manualQuote: isManual,
          active: true,
        };
      }
    }
  }
  return rates;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  calculatorActive: true,
  currency: "ARS",
  maxAutoBultos: 4,
  allowAutoQuote: true,
};

export const getInitialConfig = (): ShippingConfig => {
  return {
    destinations: SEED_DESTINATIONS,
    loadTypes: SEED_LOAD_TYPES,
    rates: generateSeedRates(),
    settings: DEFAULT_SHIPPING_SETTINGS,
    draftUpdatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };
};

// FIRESTORE GET & SAVE METHODS
export const getShippingDraftConfig = async (): Promise<ShippingConfig> => {
  try {
    const docRef = doc(db, "shipping_settings", "draft_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ShippingConfig;
    } else {
      // Auto-seed draft if not existing
      const initial = getInitialConfig();
      await setDoc(docRef, initial);
      return initial;
    }
  } catch (error) {
    console.warn("Using local fallback config for shipping draft:", error);
    return getInitialConfig();
  }
};

export const saveShippingDraftConfig = async (config: ShippingConfig, adminUser: string = "Admin"): Promise<void> => {
  const docRef = doc(db, "shipping_settings", "draft_config");
  const updatedConfig: ShippingConfig = {
    ...config,
    draftUpdatedAt: new Date().toISOString(),
    draftUpdatedBy: adminUser,
  };
  await setDoc(docRef, updatedConfig);
};

export const publishShippingConfig = async (config: ShippingConfig, adminUser: string = "Admin"): Promise<void> => {
  const publishedTime = new Date().toISOString();
  const updatedConfig: ShippingConfig = {
    ...config,
    publishedAt: publishedTime,
    publishedBy: adminUser,
  };
  
  // Save both draft and published documents
  const draftRef = doc(db, "shipping_settings", "draft_config");
  const publishedRef = doc(db, "shipping_settings", "published_config");
  
  await setDoc(draftRef, updatedConfig);
  await setDoc(publishedRef, updatedConfig);
};

export const getShippingPublishedConfig = async (): Promise<ShippingConfig> => {
  try {
    const docRef = doc(db, "shipping_settings", "published_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ShippingConfig;
    } else {
      // Fall back to draft or initial seed
      return await getShippingDraftConfig();
    }
  } catch (error) {
    console.warn("Using local fallback config for shipping published:", error);
    return getInitialConfig();
  }
};
