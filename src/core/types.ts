import type { Vec2 } from "./math/vec2";

export const WORLD = {
  width: 2880,
  height: 1620,
} as const;

/** Visible window in world units (camera). */
export const VIEW = {
  width: 960,
  height: 540,
} as const;

export type GamePhase = "class_select" | "combat" | "boost" | "route" | "shop" | "event" | "boss_reward" | "defeat" | "victory";

export type StrategicPhase = "combat" | "boost" | "route" | "shop" | "event" | "boss_reward";
export type NodeType = "combat" | "elite" | "boss" | "shop" | "event" | "treasure" | "rest" | "challenge";
export type EnemyModifierId =
  | "regenerating"
  | "fast"
  | "explosive"
  | "armored"
  | "vampiric"
  | "swarming"
  | "shielded"
  | "reflective"
  | "ranged";

export type RunModifierId = "elite_rush" | "abundance" | "hardcore" | "rng_boost" | "mutant_surge";
export type AscensionLevel = 0 | 1;
export interface RunRecord {
  waveIndex: number;
  kills: number;
  seed: number;
  timestamp: number;
  classId: ClassId;
  ascensionLevel: AscensionLevel;
  challengeMode: "normal" | "daily" | "weekly";
  victory: boolean;
}

export type Team = "player" | "enemy" | "projectile";

export type BoostCategory =
  | "attack"
  | "defense"
  | "control"
  | "economy"
  | "weapon"
  | "body"
  | "tactic"
  | "ult";

export type BoostRarity = "common" | "rare" | "epic" | "legendary";

export type FxKind = "muzzle" | "impact" | "debris" | "casing" | "burst";

export type AudioCueKind = "fire" | "hit" | "kill" | "hurt" | "explode" | "ult" | "pickup";

export type ClassId = "vanguard" | "marksman" | "warden";

export type UltKind = "nova" | "beam" | "zone";
export type ClassPassiveId = "berserker_rage" | "deadeye" | "elemental_attunement";

export interface PlayerStats {
  moveSpeed: number;
  fireRate: number;
  projectileSpeed: number;
  projectileDamage: number;
  projectilePierce: number;
  projectileCount: number;
  maxHp: number;
  armor: number;
  dodge: number;
  shield: number;
  spread: number;
  knockback: number;
  recoil: number;
  critChance: number;
  critMultiplier: number;
  burstCount: number;
  lifesteal: number;
  ricochet: number;
  explosionRadius: number;
  slowFactor: number;
  slowDuration: number;
  regenPerSecond: number;
  xpGain: number;
  goldGain: number;
  dropChance: number;
  rerollCharges: number;
  damageTakenMultiplier: number;
}

export interface BoostModifier {
  add?: Partial<PlayerStats>;
  mul?: Partial<PlayerStats>;
}

export interface UpgradeRisk {
  label: string;
  summary: string;
}

export interface BoostDef {
  id: string;
  name: string;
  description: string;
  category: BoostCategory;
  rarity: BoostRarity;
  modifiers: BoostModifier;
  tags?: string[];
  heal?: boolean;
  maxCopies?: number;
  minWave?: number;
  synergyTags?: string[];
  antiSynergy?: string[];
  risk?: UpgradeRisk;
  evolution?: string;
  unlockRequired?: string;
}

export type UnlockKind = "boost" | "enemy_variant";

export interface UnlockDef {
  id: string;
  name: string;
  description: string;
  kind: UnlockKind;
  masteryXp: number;
}

export interface BuildProgressItem {
  id: string;
  label: string;
  current: number;
  threshold: number;
  complete: boolean;
}

export interface BuildSummary {
  activeSynergies: string[];
  evolutions: string[];
  progress: BuildProgressItem[];
}

export interface WaveThreatPreview {
  summary: string;
  threats: string[];
  composition: Array<{ id: string; count: number }>;
  certainty?: "known" | "forecast" | "unknown";
  waveIndex?: number;
}

export interface RunModifierDef {
  id: RunModifierId;
  name: string;
  description: string;
  rarity: BoostRarity;
  modifiers?: BoostModifier;
  waveModifiers?: { eliteChance?: number; enemyCountMultiplier?: number; enemyHpMultiplier?: number };
  rewardMultiplier?: number;
}

export interface ArtifactDef {
  id: string;
  name: string;
  description: string;
  rarity: BoostRarity;
  tags: string[];
  modifiers?: BoostModifier;
  behavior?: "lifesteal_pulse" | "magnet";
}

export interface ProfileState {
  version: 1;
  legacyShards: number;
  runsCompleted: number;
  bestWave: number;
  unlockedClasses: ClassId[];
  achievements: string[];
  masteryXp?: number;
  unlockedBoosts?: string[];
  unlockedEnemyVariants?: string[];
}

export interface FusionRecipe {
  id: string;
  ingredients: string[];
  resultBoostId?: string;
  resultArtifactId?: string;
  cost: { evolutionShards: number };
  description: string;
}

export interface PactDef {
  id: string;
  name: string;
  description: string;
  modifiers: { enemyHp?: number; enemyDamage?: number; enemyCount?: number };
  reward: { rarity?: BoostRarity; artifact?: boolean; xpMultiplier?: number };
}

export interface BountyDef {
  id: string;
  name: string;
  description: string;
  target: "no_damage" | "kills" | "speed" | "elite";
  amount?: number;
  reward: { gold?: number; rerollTokens?: number; evolutionShards?: number; rarity?: BoostRarity };
}

export interface BossRewardDef {
  id: string;
  name: string;
  description: string;
  tags: string[];
  modifiers: BoostModifier;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  effect: { gold?: number; hpFraction?: number; evolutionShards?: number; artifactId?: string; curseId?: string };
}

export interface EventDef {
  id: string;
  name: string;
  description: string;
  choices: EventChoice[];
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: "artifact" | "heal" | "reroll" | "shard";
  artifactId?: string;
}

export interface RouteNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  risk: number;
  reward: string;
  waveIndex: number;
}

export interface TemporaryEffect {
  id: string;
  name: string;
  remainingWaves: number;
  modifiers: BoostModifier;
}

export interface TemporaryEffectDef {
  id: string;
  name: string;
  description: string;
  durationWaves: number;
  modifiers: BoostModifier;
}

export type EnemyAi = "chase" | "orbit" | "kite" | "support" | "charge";

export interface EnemyDef {
  id: string;
  hp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  color: string;
  ai: EnemyAi;
  shoot?: { damage: number; interval: number; speed: number; range: number };
  splitOnDeath?: { enemyId: string; count: number };
  explodeOnDeath?: { radius: number; damage: number };
  healAura?: { radius: number; perSecond: number };
  isBoss?: boolean;
  displayName?: string;
  modifierPool?: EnemyModifierId[];
}

export interface WaveSpawnGroup {
  enemyId: string;
  count: number;
}

export interface WaveDef {
  index: number;
  groups: WaveSpawnGroup[];
  spawnInterval: number;
  modifiers?: EnemyModifierId[];
  elite?: boolean;
}
export interface Actor {
  id: number;
  team: Team;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface EnemyActor extends Actor {
  team: "enemy";
  defId: string;
  contactDamage: number;
  speed: number;
  color: string;
  hitFlash: number;
  slowTimer: number;
  slowAmount: number;
  ai: EnemyAi;
  fireCooldown: number;
  orbitSign: number;
  isBoss: boolean;
  modifiers: EnemyModifierId[];
  shield?: number;
  regeneration?: { perSecond: number };
  explodeOnDeath?: { radius: number; damage: number };
  reflection?: { damage: number };
  splitOnDeath?: { enemyId: string; count: number };
  shoot?: { damage: number; interval: number; speed: number; range: number };
}

export interface ProjectileActor extends Actor {
  team: "projectile";
  damage: number;
  pierceLeft: number;
  hitIds: number[];
  crit: boolean;
  bouncesLeft: number;
  explosionRadius: number;
  hostile: boolean;
  chargedLifesteal: boolean;
}

export interface PlayerActor extends Actor {
  team: "player";
  facing: Vec2;
  color: string;
}

export interface UltZone {
  position: Vec2;
  radius: number;
  life: number;
  maxLife: number;
  dps: number;
  slow: number;
  color: string;
}

export interface UltBeam {
  from: Vec2;
  to: Vec2;
  width: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  ultName: string;
  ultBlurb: string;
  color: string;
  stats: PlayerStats;
  passive: { id: ClassPassiveId; name: string; description: string };
  preferredBoostIds: string[];
  ult: {
    kind: UltKind;
    baseCooldown: number;
  };
}

export interface FxParticle {
  kind: FxKind;
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface AudioCue {
  kind: AudioCueKind;
}

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  aimX?: number;
  aimY?: number;
  firing?: boolean;
  shoot?: boolean;
  ult: boolean;
}

export interface WavePickupDef {
  id: string;
  name: string;
  description: string;
  color: string;
  minWave?: number;
  modifiers?: BoostModifier;
  healFrac?: number;
  fillUlt?: boolean;
  shieldHits?: number;
  vuln?: number;
  maxPerWave?: number;
}

export interface WavePickup {
  id: number;
  defId: string;
  position: Vec2;
}

export interface GameConfig {
  seed: number;
  maxWaves: number;
  mutators?: string[];
  debugLogging?: boolean;
  runModifiers?: RunModifierId[];
  ascensionLevel?: AscensionLevel;
  dailyChallenge?: {
    id: string;
    mode: "daily" | "weekly";
    date: string;
    character: string;
    seed: number;
    mutators: string[];
    difficulty: number;
    rules: string[];
    goal: string;
  };
}

export interface GameState {
  phase: GamePhase;
  time: number;
  level: number;
  pendingLevelUps: number;
  waveIndex: number;
  kills: number;
  remainingToSpawn: number;
  spawnCooldown: number;
  fireCooldown: number;
  volleyLeft: number;
  volleyTimer: number;
  hitstop: number;
  shake: number;
  nextId: number;
  player: PlayerActor;
  stats: PlayerStats;
  enemies: EnemyActor[];
  projectiles: ProjectileActor[];
  particles: FxParticle[];
  cues: AudioCue[];
  appliedBoostIds: string[];
  boostOffers: BoostDef[];
  recentBoostOffers: string[];
  pendingSpawns: { defId: string; modifiers?: EnemyModifierId[]; hpMultiplier?: number }[];
  classId: ClassId | null;
  ultCharge: number;
  ultCooldown: number;
  ultBonusLevel: number;
  ultWasDown: boolean;
  zones: UltZone[];
  beams: UltBeam[];
  pickups: WavePickup[];
  wavePickupIds: string[];
  waveShield: number;
  waveVuln: number;
  rerollCharges: number;
  freeRerollCharges: number;
  strategicPhase: StrategicPhase;
  gold: number;
  evolutionShards: number;
  rerollTokens: number;
  artifacts: string[];
  bossCoreIds: string[];
  artifactSlots: number;
  appliedFusionIds: string[];
  sacrificesUsed: number;
  committedBuild: string | null;
  routeHistory: string[];
  routeOptions: RouteNode[];
  activePacts: string[];
  pactRewardClaimed: boolean;
  xp: number;
  activeTemporaryEffects: TemporaryEffect[];
  activeBounty: BountyDef | null;
  lastBountyResult: { bounty: BountyDef; success: boolean } | null;
  bossRewardOffers: BossRewardDef[];
  activeEvent: EventDef | null;
  curses: string[];
  shopItems: ShopItem[];
  bountyProgress: number;
  bountyFailed: boolean;
  waveDamageTaken: number;
  waveTime: number;
  eliteWave: boolean;
  artifactCounters: Record<string, number>;
  mutators: string[];
  challengeMode: "normal" | "daily" | "weekly";
  challenge: GameConfig["dailyChallenge"] | null;
  activeRunModifiers: RunModifierId[];
  activeAscensionLevel: AscensionLevel;
}
