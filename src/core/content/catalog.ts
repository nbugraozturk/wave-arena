import type {
  BoostDef,
  BoostModifier,
  BuildSummary,
  ClassId,
  EnemyDef,
  PlayerStats,
  WaveDef,
  WaveThreatPreview,
  EnemyModifierId,
} from "../types";
import { CLASSES, classById } from "./classes";
import { applyPickupModifiers, pickupById } from "./pickups";
import { artifactById, bossRewardById, commitmentById } from "./strategic";

export const BASE_STATS: PlayerStats = {
  moveSpeed: 240,
  fireRate: 6.5,
  projectileSpeed: 620,
  projectileDamage: 11,
  projectilePierce: 0,
  projectileCount: 1,
  maxHp: 100,
  armor: 0,
  dodge: 0,
  shield: 0,
  spread: 0.055,
  knockback: 55,
  recoil: 10,
  critChance: 0.08,
  critMultiplier: 1.8,
  burstCount: 1,
  lifesteal: 0,
  ricochet: 0,
  explosionRadius: 0,
  slowFactor: 0,
  slowDuration: 0,
  regenPerSecond: 0,
  xpGain: 1,
  goldGain: 1,
  dropChance: 1,
  rerollCharges: 0,
  damageTakenMultiplier: 1,
};

const SYNERGY_LIBRARY = {
  "fire-build": { label: "Fire Build", threshold: 3 },
  "assassin-build": { label: "Assassin Build", threshold: 3 },
  "projectile-build": { label: "Projectile Build", threshold: 3 },
  "tank-build": { label: "Fortify Build", threshold: 3 },
} as const;

const EVOLUTION_LIBRARY = {
  inferno: { label: "Inferno", threshold: 3 },
  assassin: { label: "Assassin", threshold: 3 },
  "bullet-storm": { label: "Bullet Storm", threshold: 3 },
  tyrant: { label: "Tyrant", threshold: 3 },
} as const;

export const BOOSTS: BoostDef[] = [
  {
    id: "damage",
    name: "Keskin mermi",
    description: "+25% hasar",
    category: "attack",
    rarity: "common",
    modifiers: { mul: { projectileDamage: 1.25 } },
    synergyTags: ["projectile-build", "assassin-build"],
  },
  {
    id: "firerate",
    name: "Hızlı tetik",
    description: "+22% atış hızı",
    category: "attack",
    rarity: "common",
    modifiers: { mul: { fireRate: 1.22 } },
    synergyTags: ["assassin-build", "projectile-build"],
  },
  {
    id: "velocity",
    name: "Hızlı balistik",
    description: "+20% mermi hızı",
    category: "attack",
    rarity: "common",
    modifiers: { mul: { projectileSpeed: 1.2, spread: 0.9 } },
    synergyTags: ["projectile-build"],
  },
  {
    id: "accuracy",
    name: "Sıkı nişangah",
    description: "Yayılım %35 azalır",
    category: "attack",
    rarity: "common",
    modifiers: { mul: { spread: 0.65 } },
  },
  {
    id: "pierce",
    name: "Delici uç",
    description: "+1 delme",
    category: "attack",
    rarity: "rare",
    modifiers: { add: { projectilePierce: 1 } },
    maxCopies: 4,
    synergyTags: ["projectile-build"],
    evolution: "bullet-storm",
  },
  {
    id: "multishot",
    name: "Çift namlu",
    description: "+1 mermi, hafif yayılım",
    category: "attack",
    rarity: "rare",
    modifiers: { add: { projectileCount: 1 }, mul: { spread: 1.15 } },
    maxCopies: 4,
    synergyTags: ["projectile-build"],
    evolution: "bullet-storm",
  },
  {
    id: "burst",
    name: "Üçlü atış",
    description: "Her tetikte +1 ekstra mermi",
    category: "attack",
    rarity: "rare",
    modifiers: { add: { burstCount: 1 } },
    maxCopies: 3,
    minWave: 2,
    synergyTags: ["projectile-build"],
  },
  {
    id: "crit",
    name: "Kritik mercek",
    description: "+12% kritik şansı",
    category: "attack",
    rarity: "rare",
    modifiers: { add: { critChance: 0.12 } },
    synergyTags: ["assassin-build"],
    evolution: "assassin",
  },
  {
    id: "critdmg",
    name: "Oyucu uç",
    description: "Kritik hasar +0.5x",
    category: "attack",
    rarity: "rare",
    modifiers: { add: { critMultiplier: 0.5 } },
    minWave: 2,
    synergyTags: ["assassin-build"],
    evolution: "assassin",
  },
  {
    id: "fire_damage",
    name: "Alev kılıfı",
    description: "+18% ateş hasarı",
    category: "attack",
    rarity: "rare",
    modifiers: { mul: { projectileDamage: 1.18 } },
    synergyTags: ["fire-build"],
    evolution: "inferno",
  },
  {
    id: "burn_duration",
    name: "Sürekli yanma",
    description: "Yanma süresi uzar",
    category: "control",
    rarity: "rare",
    modifiers: { add: { slowDuration: 1.1 } },
    synergyTags: ["fire-build"],
    evolution: "inferno",
  },
  {
    id: "burn_spread",
    name: "Yaygın alev",
    description: "Yanma etki alanı genişler",
    category: "control",
    rarity: "epic",
    modifiers: { add: { explosionRadius: 18 } },
    synergyTags: ["fire-build"],
    evolution: "inferno",
  },
  {
    id: "glass_cannon",
    name: "Glass Cannon",
    description: "+80% hasar, -40% max can",
    category: "attack",
    rarity: "epic",
    modifiers: { mul: { projectileDamage: 1.8 }, add: { maxHp: -40 } },
    risk: { label: "Risk / Reward", summary: "Güçlü hasar, daha kırılganlık." },
  },
  {
    id: "berserker",
    name: "Berserker",
    description: "Can düşükken +100% hasar",
    category: "attack",
    rarity: "epic",
    modifiers: { mul: { projectileDamage: 1.3 } },
    risk: { label: "Risk / Reward", summary: "Hasar yükselir, hayatta kalma düşer." },
  },
  {
    id: "overcharge",
    name: "Yüksek yük",
    description: "+50% atış hızı, -30% hasar",
    category: "attack",
    rarity: "epic",
    modifiers: { mul: { fireRate: 1.5, projectileDamage: 0.7 } },
    risk: { label: "Risk / Reward", summary: "Daha hızlı atış, daha zayıf isabet." },
  },
  {
    id: "blood_pact",
    name: "Kan Paktı",
    description: "+30% hasar, can emme kaldırılır",
    category: "defense",
    rarity: "epic",
    modifiers: { mul: { projectileDamage: 1.3 }, add: { lifesteal: -1 } },
    risk: { label: "Risk / Reward", summary: "Güçlü vurgu, hayatta kalma tercihi azalır." },
  },
  {
    id: "hp",
    name: "Zırh plakası",
    description: "+25 max can ve canı doldur",
    category: "defense",
    rarity: "common",
    modifiers: { add: { maxHp: 25 } },
    heal: true,
    synergyTags: ["tank-build"],
  },
  {
    id: "armor",
    name: "Mekanik zırh",
    description: "+15 armor, daha az hasar al",
    category: "defense",
    rarity: "common",
    modifiers: { add: { armor: 15 } },
    synergyTags: ["tank-build"],
  },
  {
    id: "dodge",
    name: "Çeviklik",
    description: "+10% kaçış ve 5% dodge",
    category: "defense",
    rarity: "rare",
    modifiers: { mul: { moveSpeed: 1.1 }, add: { dodge: 5 } },
    synergyTags: ["tank-build"],
  },
  {
    id: "shield",
    name: "Kalkan ucu",
    description: "+1 kalkan, ilk hasarı engeller",
    category: "defense",
    rarity: "rare",
    modifiers: { add: { shield: 1 } },
    synergyTags: ["tank-build"],
  },
  {
    id: "lifesteal",
    name: "Kan emici",
    description: "Verilen hasarın %8'i cana döner",
    category: "defense",
    rarity: "epic",
    modifiers: { add: { lifesteal: 0.08 } },
    maxCopies: 3,
    minWave: 3,
    antiSynergy: ["shield"],
  },
  {
    id: "vital",
    name: "Can damarı",
    description: "+40 max can",
    category: "defense",
    rarity: "rare",
    modifiers: { add: { maxHp: 40 } },
    minWave: 4,
    synergyTags: ["tank-build"],
  },
  {
    id: "knockback",
    name: "İtme yayı",
    description: "Mermi düşmanı daha uzağa savurur",
    category: "control",
    rarity: "common",
    modifiers: { add: { knockback: 70 } },
  },
  {
    id: "frost",
    name: "Soğuk uç",
    description: "İsabet düşmanı 1.2sn yavaşlatır",
    category: "control",
    rarity: "rare",
    modifiers: { add: { slowFactor: 0.45, slowDuration: 1.2 } },
    maxCopies: 2,
    minWave: 2,
    synergyTags: ["fire-build"],
  },
  {
    id: "freeze",
    name: "Donma kılıfı",
    description: "Düşmanları kısa süreliğine dondurur",
    category: "control",
    rarity: "epic",
    modifiers: { add: { slowFactor: 0.7, slowDuration: 1.8 } },
    synergyTags: ["assassin-build"],
  },
  {
    id: "stun",
    name: "Sarsma",
    description: "Yüksek şansla kısa sersemletme",
    category: "control",
    rarity: "epic",
    modifiers: { add: { critChance: 0.08, slowDuration: 0.5 } },
    synergyTags: ["assassin-build"],
  },
  {
    id: "xp_gain",
    name: "Deneyim kartı",
    description: "+20% XP kazancı",
    category: "economy",
    rarity: "common",
    modifiers: { mul: { xpGain: 1.2 } },
  },
  {
    id: "gold_gain",
    name: "Kumbaralı depo",
    description: "+15% altın kazancı",
    category: "economy",
    rarity: "rare",
    modifiers: { mul: { goldGain: 1.15 } },
  },
  {
    id: "drop_chance",
    name: "Rastgele zenginlik",
    description: "+12% drop chance",
    category: "economy",
    rarity: "rare",
    modifiers: { mul: { dropChance: 1.12 } },
  },
  {
    id: "reroll",
    name: "Yeniden çekim",
    description: "+1 reroll hakkı",
    category: "economy",
    rarity: "rare",
    modifiers: { add: { rerollCharges: 1 } },
  },
  {
    id: "ult_core",
    name: "Ulti çekirdeği",
    description: "Ulti seviyesi +1",
    category: "ult",
    rarity: "epic",
    modifiers: {},
    maxCopies: 4,
    minWave: 3,
  },
];

export const ENEMIES: Record<string, EnemyDef> = {
  grunt: {
    id: "grunt",
    hp: 24,
    speed: 70,
    radius: 14,
    contactDamage: 10,
    color: "#e85d4c",
    ai: "chase",
  },
  runner: {
    id: "runner",
    hp: 14,
    speed: 138,
    radius: 11,
    contactDamage: 8,
    color: "#f0c14a",
    ai: "chase",
  },
  tank: {
    id: "tank",
    hp: 78,
    speed: 40,
    radius: 22,
    contactDamage: 18,
    color: "#7c5cff",
    ai: "chase",
  },
  sniper: {
    id: "sniper",
    hp: 22,
    speed: 55,
    radius: 13,
    contactDamage: 6,
    color: "#2ec4b6",
    ai: "kite",
    shoot: { damage: 12, interval: 1.35, speed: 420, range: 520 },
  },
  orbiter: {
    id: "orbiter",
    hp: 18,
    speed: 115,
    radius: 12,
    contactDamage: 9,
    color: "#fb8500",
    ai: "orbit",
  },
  bomber: {
    id: "bomber",
    hp: 28,
    speed: 78,
    radius: 16,
    contactDamage: 8,
    color: "#d62828",
    ai: "chase",
    explodeOnDeath: { radius: 78, damage: 22 },
  },
  shaman: {
    id: "shaman",
    hp: 32,
    speed: 48,
    radius: 15,
    contactDamage: 6,
    color: "#80b918",
    ai: "support",
    healAura: { radius: 150, perSecond: 10 },
  },
  splitter: {
    id: "splitter",
    hp: 36,
    speed: 62,
    radius: 17,
    contactDamage: 10,
    color: "#c77dff",
    ai: "chase",
    splitOnDeath: { enemyId: "swarm", count: 3 },
  },
  charger: {
    id: "charger",
    hp: 30,
    speed: 190,
    radius: 12,
    contactDamage: 16,
    color: "#ff595e",
    ai: "charge",
  },
  sentinel: {
    id: "sentinel",
    hp: 46,
    speed: 42,
    radius: 18,
    contactDamage: 12,
    color: "#4361ee",
    ai: "kite",
    shoot: { damage: 16, interval: 1.8, speed: 360, range: 600 },
  },
  overlord: {
    id: "overlord",
    hp: 420,
    speed: 34,
    radius: 42,
    contactDamage: 30,
    color: "#ff477e",
    ai: "chase",
    shoot: { damage: 22, interval: 1.1, speed: 300, range: 760 },
    isBoss: true,
    displayName: "Dalga Hakimi",
  },
  swarm: {
    id: "swarm",
    hp: 8,
    speed: 150,
    radius: 8,
    contactDamage: 5,
    color: "#e0aaff",
    ai: "chase",
  },
};

const RARITY_WEIGHT: Record<BoostDef["rarity"], number> = {
  common: 8,
  rare: 4,
  epic: 2,
  legendary: 1,
};

export function buildWaves(maxWaves: number): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let i = 1; i <= maxWaves; i++) {
    const groups: WaveDef["groups"] = [{ enemyId: "grunt", count: 4 + i }];
    if (i >= 2) groups.push({ enemyId: "runner", count: 2 + Math.floor(i / 2) });
    if (i >= 3) groups.push({ enemyId: "sniper", count: 1 + Math.floor((i - 3) / 2) });
    if (i >= 4) groups.push({ enemyId: "orbiter", count: 2 + Math.floor(i / 3) });
    if (i >= 5) groups.push({ enemyId: "tank", count: Math.max(1, Math.floor(i / 4)) });
    if (i >= 5) groups.push({ enemyId: "shaman", count: i >= 9 ? 2 : 1 });
    if (i >= 6) groups.push({ enemyId: "bomber", count: 1 + Math.floor((i - 6) / 2) });
    if (i >= 7) groups.push({ enemyId: "splitter", count: 1 + Math.floor((i - 7) / 3) });
    if (i >= 4) groups.push({ enemyId: "charger", count: 1 + Math.floor((i - 4) / 3) });
    if (i >= 8) groups.push({ enemyId: "sentinel", count: 1 + Math.floor((i - 8) / 2) });
    if (i % 3 === 0) groups.push({ enemyId: "overlord", count: 1 });
    waves.push({
      index: i,
      spawnInterval: Math.max(0.16, 0.52 - i * 0.025),
      groups: groups.filter((g) => g.count > 0),
      elite: i % 4 === 0,
      modifiers: i % 4 === 0
        ? (["fast", ...(i >= 8 ? ["armored"] : []), ...(i >= 12 ? ["explosive"] : [])] as EnemyModifierId[])
        : undefined,
    });
  }
  return waves;
}

export function applyBoosts(base: PlayerStats, boostIds: string[]): PlayerStats {
  const stats: PlayerStats = { ...base };
  for (const id of boostIds) {
    const boost = BOOSTS.find((b) => b.id === id);
    if (!boost) continue;
    if (boost.modifiers.add) {
      for (const key of Object.keys(boost.modifiers.add) as (keyof PlayerStats)[]) {
        const value = boost.modifiers.add[key];
        if (value !== undefined) stats[key] += value;
      }
    }
    if (boost.modifiers.mul) {
      for (const key of Object.keys(boost.modifiers.mul) as (keyof PlayerStats)[]) {
        const value = boost.modifiers.mul[key];
        if (value !== undefined) stats[key] *= value;
      }
    }
  }
  return finalizeStats(stats);
}

export function finalizeStats(stats: PlayerStats): PlayerStats {
  stats.projectileCount = Math.max(1, Math.round(stats.projectileCount));
  stats.projectilePierce = Math.max(0, Math.round(stats.projectilePierce));
  stats.burstCount = Math.max(1, Math.round(stats.burstCount));
  stats.ricochet = Math.max(0, Math.round(stats.ricochet));
  stats.spread = Math.max(0.008, stats.spread);
  stats.recoil = Math.max(0, stats.recoil);
  stats.critChance = Math.min(0.75, Math.max(0, stats.critChance));
  stats.lifesteal = Math.max(0, stats.lifesteal);
  stats.slowFactor = Math.min(0.8, Math.max(0, stats.slowFactor));
  stats.armor = Math.max(0, stats.armor);
  stats.dodge = Math.max(0, stats.dodge);
  stats.shield = Math.max(0, stats.shield);
  stats.xpGain = Math.max(0.25, stats.xpGain);
  stats.goldGain = Math.max(0.25, stats.goldGain);
  stats.dropChance = Math.max(0.25, stats.dropChance);
  stats.rerollCharges = Math.max(0, Math.round(stats.rerollCharges));
  stats.damageTakenMultiplier = Math.max(0.1, stats.damageTakenMultiplier);
  return stats;
}

export function applyBuild(classId: ClassId, boostIds: string[], wavePickupIds: string[] = []): PlayerStats {
  const stats = applyBoosts(classById(classId).stats, boostIds);
  for (const id of wavePickupIds) {
    const pickup = pickupById(id);
    if (pickup?.modifiers) applyPickupModifiers(stats, pickup.modifiers);
  }
  return finalizeStats(stats);
}

export function applyArtifacts(stats: PlayerStats, artifactIds: string[]): PlayerStats {
  for (const id of artifactIds) {
    const artifact = artifactById(id);
    if (!artifact?.modifiers) continue;
    if (artifact.modifiers.add) {
      for (const key of Object.keys(artifact.modifiers.add) as (keyof PlayerStats)[]) {
        const value = artifact.modifiers.add[key];
        if (value !== undefined) stats[key] += value;
      }
    }
    if (artifact.modifiers.mul) {
      for (const key of Object.keys(artifact.modifiers.mul) as (keyof PlayerStats)[]) {
        const value = artifact.modifiers.mul[key];
        if (value !== undefined) stats[key] *= value;
      }
    }
  }
  return finalizeStats(stats);
}

export function applyBossCores(stats: PlayerStats, coreIds: string[]): PlayerStats {
  for (const id of coreIds) {
    const core = bossRewardById(id);
    if (!core) continue;
    if (core.modifiers.add) {
      for (const key of Object.keys(core.modifiers.add) as (keyof PlayerStats)[]) {
        const value = core.modifiers.add[key];
        if (value !== undefined) stats[key] += value;
      }
    }
    if (core.modifiers.mul) {
      for (const key of Object.keys(core.modifiers.mul) as (keyof PlayerStats)[]) {
        const value = core.modifiers.mul[key];
        if (value !== undefined) stats[key] *= value;
      }
    }
  }
  return finalizeStats(stats);
}

export function applyTemporaryEffects(stats: PlayerStats, effects: Array<{ modifiers: BoostModifier }>): PlayerStats {
  for (const effect of effects) {
    if (effect.modifiers.add) {
      for (const key of Object.keys(effect.modifiers.add) as (keyof PlayerStats)[]) {
        const value = effect.modifiers.add[key];
        if (value !== undefined) stats[key] += value;
      }
    }
    if (effect.modifiers.mul) {
      for (const key of Object.keys(effect.modifiers.mul) as (keyof PlayerStats)[]) {
        const value = effect.modifiers.mul[key];
        if (value !== undefined) stats[key] *= value;
      }
    }
  }
  return finalizeStats(stats);
}

export function availableBoosts(appliedIds: string[], waveIndex: number): BoostDef[] {
  const copies = new Map<string, number>();
  for (const id of appliedIds) copies.set(id, (copies.get(id) ?? 0) + 1);
  return BOOSTS.filter((boost) => {
    if (boost.category === "ult") return false;
    if (boost.minWave && waveIndex < boost.minWave) return false;
    const taken = copies.get(boost.id) ?? 0;
    return taken < (boost.maxCopies ?? 6);
  });
}

export function weightFor(boost: BoostDef, waveIndex: number, classId: ClassId | null): number {
  let weight = RARITY_WEIGHT[boost.rarity];
  if (waveIndex >= 5 && boost.rarity === "epic") weight += 1.5;
  if (waveIndex >= 8 && boost.rarity === "rare") weight += 1;
  if (classId) {
    const cls = CLASSES.find((c) => c.id === classId);
    if (cls?.preferredBoostIds.includes(boost.id)) weight *= 2.4;
  }
  return weight;
}

export function commitmentWeight(boost: BoostDef, commitmentId: string | null): number {
  if (!commitmentId) return 1;
  const commitment = commitmentById(commitmentId);
  if (!commitment) return 1;
  if (boost.synergyTags?.some((tag) => commitment.preferredTags.includes(tag))) return 2.5;
  if (boost.synergyTags?.some((tag) => commitment.blockedTags.includes(tag))) return 0;
  return 1;
}

export function getBuildSummary(appliedIds: string[]): BuildSummary {
  const counts = new Map<string, number>();
  for (const id of appliedIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const active: string[] = [];
  const evolutions: string[] = [];
  const progress: BuildSummary["progress"] = [];

  for (const [id, def] of Object.entries(SYNERGY_LIBRARY)) {
    const matches = BOOSTS.filter((boost) => boost.synergyTags?.includes(id));
    const current = matches.reduce((sum, boost) => sum + (counts.get(boost.id) ?? 0), 0);
    const complete = current >= def.threshold;
    if (complete) active.push(id);
    progress.push({ id, label: def.label, current, threshold: def.threshold, complete });
  }

  for (const [id, def] of Object.entries(EVOLUTION_LIBRARY)) {
    const matches = BOOSTS.filter((boost) => boost.evolution === id);
    const current = matches.reduce((sum, boost) => sum + (counts.get(boost.id) ?? 0), 0);
    const complete = current >= def.threshold;
    if (complete) evolutions.push(id);
    progress.push({ id, label: def.label, current, threshold: def.threshold, complete });
  }

  return { activeSynergies: active, evolutions, progress };
}

export function getWavePreview(waveIndex: number): WaveThreatPreview {
  const normalized = Math.max(1, waveIndex);
  const previews: Record<number, { summary: string; threats: string[]; composition: Array<{ id: string; count: number }> }> = {
    1: { summary: "İlk baskı: zayıf ama hızlı küçük kalabalık", threats: ["Fast", "Low HP"], composition: [{ id: "grunt", count: 4 }, { id: "runner", count: 2 }] },
    2: { summary: "Hızlı baskı ve uzaktan hedefleme belirdi", threats: ["Fast", "Ranged"], composition: [{ id: "runner", count: 4 }, { id: "sniper", count: 1 }] },
    3: { summary: "Çevrede dolanan ve menzil vurucu düşmanlar", threats: ["Ranged", "Orbiting"], composition: [{ id: "grunt", count: 5 }, { id: "orbiter", count: 2 }, { id: "sniper", count: 2 }] },
    4: { summary: "Tank ve destek varlığı artıyor", threats: ["High HP", "Support"], composition: [{ id: "tank", count: 2 }, { id: "shaman", count: 1 }, { id: "charger", count: 1 }] },
    5: { summary: "Karışık baskı: hem kalabalık hem tank", threats: ["Mixed", "High HP"], composition: [{ id: "grunt", count: 6 }, { id: "tank", count: 2 }, { id: "bomber", count: 1 }] },
    6: { summary: "Patlayıcı ve koordine baskı dalgası", threats: ["Explosive", "Fast"], composition: [{ id: "runner", count: 8 }, { id: "bomber", count: 2 }, { id: "charger", count: 2 }] },
    7: { summary: "Çoklu konumlu düşmanlar ve bölme taktiği", threats: ["Crowd", "Split"], composition: [{ id: "splitter", count: 2 }, { id: "sentinel", count: 1 }, { id: "orbiter", count: 3 }] },
    8: { summary: "Kitle ve destek baskısı üst seviyeye çıktı", threats: ["Support", "High HP"], composition: [{ id: "tank", count: 3 }, { id: "shaman", count: 2 }, { id: "sentinel", count: 1 }] },
    9: { summary: "Boss yükselişi ve uzaktan kontrol baskısı", threats: ["Boss", "Ranged"], composition: [{ id: "overlord", count: 1 }, { id: "sentinel", count: 2 }, { id: "bomber", count: 2 }] },
  };

  const chosen = previews[normalized] ?? previews[9];
  if (!previews[normalized]) {
    return {
      summary: "Unknown Threat: uzak gelecek daha az kesin.",
      threats: ["Unknown Threat"],
      composition: [],
      certainty: "unknown",
      waveIndex: normalized,
    };
  }
  return {
    summary: chosen.summary,
    threats: chosen.threats,
    composition: chosen.composition,
    certainty: "known",
    waveIndex: normalized,
  };
}

export function getFutureWavePreviews(startWave: number, count = 3): WaveThreatPreview[] {
  return Array.from({ length: count }, (_, offset) => getWavePreview(startWave + offset));
}

export function getUpgradeOptions(
  appliedIds: string[],
  waveIndex: number,
  classId: ClassId | null,
  count = 3,
  excludedIds: string[] = [],
  commitmentId: string | null = null,
  recentIds: string[] = [],
): BoostDef[] {
  const excluded = new Set(excludedIds);
  const recentCounts = new Map<string, number>();
  for (const id of recentIds) recentCounts.set(id, (recentCounts.get(id) ?? 0) + 1);

  const pool = availableBoosts(appliedIds, waveIndex).filter((boost) => !excluded.has(boost.id));
  const summary = getBuildSummary(appliedIds);
  const ranked = pool
    .map((boost) => {
      let weight = weightFor(boost, waveIndex, classId);
      weight *= commitmentWeight(boost, commitmentId);
      if (weight <= 0) return { boost, weight };
      const isSynergy = boost.synergyTags?.some((tag) => summary.activeSynergies.includes(tag));
      if (isSynergy) weight *= 2.2;
      if (boost.evolution && summary.evolutions.includes(boost.evolution)) weight *= 1.4;
      if (boost.risk && summary.activeSynergies.length > 0) weight *= 0.85;
      if (boost.antiSynergy?.some((tag) => summary.activeSynergies.includes(tag))) weight *= 0.6;

      const recentHits = recentCounts.get(boost.id) ?? 0;
      if (recentHits > 0) {
        weight *= 0.42 ** recentHits;
      } else {
        weight *= 1.15;
      }

      return { boost, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  const picks: BoostDef[] = [];
  const seen = new Set<string>();
  while (picks.length < count && ranked.length > 0) {
    const next = ranked.shift();
    if (!next) break;
    if (seen.has(next.boost.id)) continue;
    seen.add(next.boost.id);
    picks.push(next.boost);
  }

  while (picks.length < count) {
    const fallback = pool.find((boost) => !seen.has(boost.id));
    if (!fallback) break;
    seen.add(fallback.id);
    picks.push(fallback);
  }

  return picks.slice(0, count);
}
