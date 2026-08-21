import type { BoostModifier, PlayerStats, WavePickupDef } from "../types";

export const WAVE_PICKUPS: WavePickupDef[] = [
  {
    id: "overclock",
    name: "Aşırı yük",
    description: "Bu dalga +55% atış hızı",
    color: "#ffd166",
    modifiers: { mul: { fireRate: 1.55, spread: 1.12 } },
  },
  {
    id: "haste",
    name: "Sprint",
    description: "Bu dalga +40% hareket",
    color: "#80ed99",
    modifiers: { mul: { moveSpeed: 1.4 } },
  },
  {
    id: "breaker",
    name: "Zırh delici",
    description: "Bu dalga +2 delme",
    color: "#90e0ef",
    modifiers: { add: { projectilePierce: 2 } },
  },
  {
    id: "vampire",
    name: "Kan paketi",
    description: "Bu dalga %18 can çalma",
    color: "#ef476f",
    modifiers: { add: { lifesteal: 0.18 } },
    minWave: 2,
  },
  {
    id: "stim",
    name: "Saha kiti",
    description: "%30 can doldur + bu dalga rejenerasyon",
    color: "#06d6a0",
    modifiers: { add: { regenPerSecond: 6 } },
    healFrac: 0.3,
  },
  {
    id: "aegis",
    name: "Aegis",
    description: "Bu dalga 3 temas vuruşunu emer",
    color: "#48bfe3",
    shieldHits: 3,
  },
  {
    id: "battery",
    name: "Ulti bataryası",
    description: "Ultiyi hemen doldurur",
    color: "#c77dff",
    fillUlt: true,
    minWave: 2,
  },
  {
    id: "mark",
    name: "Hedef işaretçisi",
    description: "Bu dalga düşmanlar %30 fazla hasar alır",
    color: "#f4a261",
    vuln: 0.3,
    minWave: 3,
  },
  {
    id: "frostpack",
    name: "Soğuk çekirdek",
    description: "Bu dalga isabet yavaşlatır",
    color: "#8ecae6",
    modifiers: { add: { slowFactor: 0.4, slowDuration: 1 } },
    minWave: 3,
  },
  {
    id: "fortify",
    name: "Siper plakası",
    description: "Bu dalga 2 hasar temasını emer",
    color: "#b8f2e6",
    modifiers: { mul: { maxHp: 1.12 } },
    shieldHits: 2,
    minWave: 2,
  },
  {
    id: "scatter",
    name: "Saçma hücresi",
    description: "Bu dalga +2 mermi, fakat yayılım artar",
    color: "#ffb703",
    modifiers: { add: { projectileCount: 2 }, mul: { spread: 1.45, fireRate: 0.82 } },
    minWave: 2,
  },
  {
    id: "overheal",
    name: "Acil durum jeli",
    description: "%45 can doldurur ve bu dalga +20 max can verir",
    color: "#90be6d",
    modifiers: { add: { maxHp: 20 } },
    healFrac: 0.45,
    minWave: 3,
  },
  {
    id: "hunter",
    name: "Avcı protokolü",
    description: "Bu dalga elit düşmanlara karşı +35% hasar",
    color: "#ff6b6b",
    modifiers: { mul: { projectileDamage: 1.35 } },
    minWave: 4,
  },
];

export function pickupById(id: string): WavePickupDef | undefined {
  return WAVE_PICKUPS.find((p) => p.id === id);
}

export function applyPickupModifiers(stats: PlayerStats, mod: BoostModifier): void {
  if (mod.add) {
    for (const key of Object.keys(mod.add) as (keyof PlayerStats)[]) {
      const value = mod.add[key];
      if (value !== undefined) stats[key] += value;
    }
  }
  if (mod.mul) {
    for (const key of Object.keys(mod.mul) as (keyof PlayerStats)[]) {
      const value = mod.mul[key];
      if (value !== undefined) stats[key] *= value;
    }
  }
}
