import {
  applyBuild,
  applyArtifacts,
  applyBossCores,
  applyTemporaryEffects,
  availableBoosts,
  BASE_STATS,
  BOOSTS,
  buildWaves,
  ENEMIES,
  getUpgradeOptions,
  getXpRequiredForLevel,
} from "./content/catalog";
import { getMutatorById } from "./content/mutators";
import { ACHIEVEMENTS } from "./content/achievements";
import { classById, CLASSES, ULT_CORE_ID, ultPower } from "./content/classes";
import { ARTIFACTS, bountiesForWave, BOSS_REWARDS, canFuse, canFuseWithState, commitmentById, FUSION_RECIPES, artifactById, createRouteOptions, createShopInventory, eventById, pactById, PACTS, temporaryEffectById } from "./content/strategic";
import { pickupById, WAVE_PICKUPS } from "./content/pickups";
import { previewWaves } from "./content/wave-preview";
import { applyRunModifiersToStats, applyRunModifierToWave } from "./content/run-modifiers";
import { getEliteChance, selectEliteModifiers, applyEliteModifiers } from "./content/elite-system";
import { addMasteryXp, calculateMasteryXpGain, getUnlockedContentIds, MAX_MASTERY_XP, UNLOCKS } from "./content/unlocks";
import { applyAscensionStats, applyAscensionToWave } from "./content/ascension-modifiers";
import { vec } from "./math/vec2";
import { Rng } from "./rng";
import type {
  AudioCueKind,
  BoostDef,
  ClassId,
  EnemyActor,
  FxKind,
  GameConfig,
  GameState,
  InputSnapshot,
  EnemyModifierId,
  RunModifierId,
  PlayerStats,
  ProjectileActor,
  ProfileState,
  WavePickup,
} from "./types";
import { WORLD } from "./types";

const CONTACT_COOLDOWN = 0.45;
const PROJECTILE_RADIUS = 4.5;
const PLAYER_RADIUS = 16;
const BARREL = 20;
const OFFER_COUNT = 3;
const VOLLEY_GAP = 0.038;

export function getBoostPanelCopy(state: Partial<Pick<GameState, "pendingLevelUps" | "waveIndex" | "level">>): { title: string; description: string } {
  const pendingLevelUps = state.pendingLevelUps ?? 0;
  const level = state.level ?? 1;

  if (pendingLevelUps > 0) {
    const levelText = pendingLevelUps > 1 ? `${pendingLevelUps} seviyeyi` : "1 seviyeyi";
    return {
      title: "Seviye atladı!",
      description: `Seviye atlaması yaşandı: ${level} seviyesine ulaştın. ${levelText} tek seferde aştın; yeni boost seçimi kapısı açıldı.`,
    };
  }

  return {
    title: "Dalga tamamlandı",
    description: "Bir boost seç. Sonraki dalganın tehdidine göre karar ver.",
  };
}

export class Simulation {
  readonly config: GameConfig;
  readonly waves;
  state: GameState;
  profile: ProfileState;
  private rng: Rng;
  private currentSeed: number;
  private contactTimer = 0;

  constructor(config: GameConfig) {
    this.config = config;
    this.waves = buildWaves(config.maxWaves);
    this.rng = new Rng(config.seed);
    this.currentSeed = config.seed;
    this.profile = this.createProfile();
    this.state = this.createInitialState();
  }

  getSeed(): number {
    return this.currentSeed;
  }

  reset(retrySameSeed = false): void {
    const resetSeed = retrySameSeed || this.config.dailyChallenge
      ? this.currentSeed
      : (Date.now() ^ this.rng.snapshot()) >>> 0;
    this.currentSeed = resetSeed;
    this.rng = new Rng(resetSeed);
    this.contactTimer = 0;
    this.state = this.createInitialState();
  }

  private log(event: string, details?: Record<string, unknown>): void {
    if (!this.config.debugLogging) return;
    const timestamp = `[Wave ${this.state.waveIndex} T${this.state.time.toFixed(2)}s]`;
    const message = details ? `${timestamp} ${event}: ${JSON.stringify(details)}` : `${timestamp} ${event}`;
    console.log(message);
  }

  saveProfile(): string {
    return JSON.stringify(this.profile);
  }

  loadProfile(serialized: string): boolean {
    try {
      const profile = JSON.parse(serialized) as ProfileState;
      if (profile.version !== 1 || !Array.isArray(profile.unlockedClasses)) return false;
      this.profile = {
        version: 1,
        legacyShards: Math.max(0, Math.floor(profile.legacyShards)),
        runsCompleted: Math.max(0, Math.floor(profile.runsCompleted)),
        bestWave: Math.max(0, Math.floor(profile.bestWave)),
        unlockedClasses: profile.unlockedClasses.filter((id): id is ClassId => CLASSES.some((cls) => cls.id === id)),
        achievements: Array.isArray(profile.achievements)
          ? profile.achievements.filter((id) => ACHIEVEMENTS.some((achievement) => achievement.id === id))
          : [],
        masteryXp: Math.min(MAX_MASTERY_XP, Math.max(0, Math.floor(profile.masteryXp ?? 0))),
        unlockedBoosts: Array.isArray(profile.unlockedBoosts) ? profile.unlockedBoosts.filter((id) => UNLOCKS.some((unlock) => unlock.id === id && unlock.kind === "boost")) : [],
        unlockedEnemyVariants: Array.isArray(profile.unlockedEnemyVariants)
          ? profile.unlockedEnemyVariants.filter((id) => UNLOCKS.some((unlock) => unlock.id === id && unlock.kind === "enemy_variant"))
          : [],
      };
      const pool = availableBoosts(this.state.appliedBoostIds, this.state.waveIndex, getUnlockedContentIds(this.profile));
      return true;
    } catch {
      return false;
    }
  }

  saveRun(): string {
    return JSON.stringify({ version: 2, state: this.state, rngState: this.rng.snapshot(), contactTimer: this.contactTimer });
  }

  loadRun(serialized: string): boolean {
    try {
      const payload = JSON.parse(serialized) as { version?: number; state?: GameState; rngState?: number; contactTimer?: number };
      if (!payload.state || !payload.state.phase || !Array.isArray(payload.state.appliedBoostIds) || !payload.state.player) return false;
      if (typeof payload.rngState !== "number") return false;
      const normalizedState = payload.state;
      const level = Number(normalizedState.level ?? 1);
      const pendingLevelUps = Number(normalizedState.pendingLevelUps ?? 0);
      const xp = Number(normalizedState.xp ?? 0);
      normalizedState.level = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
      normalizedState.pendingLevelUps = Number.isFinite(pendingLevelUps) ? Math.max(0, Math.floor(pendingLevelUps)) : 0;
      normalizedState.xp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
      normalizedState.mutators = Array.isArray(normalizedState.mutators) ? normalizedState.mutators : [];
      normalizedState.challengeMode = normalizedState.challengeMode ?? "normal";
      normalizedState.challenge = normalizedState.challenge ?? null;
      normalizedState.activeRunModifiers = Array.isArray(normalizedState.activeRunModifiers) ? normalizedState.activeRunModifiers : [];
      normalizedState.activeAscensionLevel = normalizedState.activeAscensionLevel === 1 ? 1 : 0;
      this.state = normalizedState;
      this.rng.restore(payload.rngState);
      this.contactTimer = typeof payload.contactTimer === "number" ? payload.contactTimer : 0;
      return true;
    } catch {
      return false;
    }
  }

  selectClass(classId: ClassId): void {
    const { state } = this;
    if (state.phase !== "class_select") return;
    if (!CLASSES.some((c) => c.id === classId)) return;
    state.classId = classId;
    state.rerollCharges = 1 + Math.min(2, Math.floor(this.profile.legacyShards / 5));
    const cls = classById(classId);
    state.stats = applyBuild(classId, []);
    state.player.maxHp = state.stats.maxHp;
    state.player.hp = state.stats.maxHp;
    state.player.color = cls.color;
    this.log("RUN_START", { class: classId, hp: state.player.hp });
    this.startWave(1);
  }

  rerollBoosts(): void {
    const { state } = this;
    if (state.phase !== "boost" || (state.rerollCharges <= 0 && state.rerollTokens <= 0)) return;
    if (state.rerollCharges > 0) state.rerollCharges -= 1;
    else state.rerollTokens -= 1;
    state.boostOffers = this.rollOffers(state.boostOffers.map((boost) => boost.id));
  }

  selectBoost(boostId: string): void {
    const { state } = this;
    if (state.phase !== "boost") return;
    const picked = state.boostOffers.find((b) => b.id === boostId);
    if (!picked || !state.classId) return;

    const prevMax = state.player.maxHp;
    const prevHp = state.player.hp;
    if (picked.id === ULT_CORE_ID) {
      state.ultBonusLevel += 1;
    } else {
      state.appliedBoostIds.push(boostId);
    }
    const previousUpgradeRerolls = state.stats.rerollCharges;
    this.rebuildStats();
    state.rerollCharges += Math.max(0, state.stats.rerollCharges - previousUpgradeRerolls);
    state.player.maxHp = state.stats.maxHp;
    if (picked.heal) {
      state.player.hp = state.stats.maxHp;
    } else {
      const gained = Math.max(0, state.stats.maxHp - prevMax);
      state.player.hp = Math.min(state.stats.maxHp, prevHp + gained);
    }

    const hadPendingLevelUps = state.pendingLevelUps > 0;
    if (hadPendingLevelUps) {
      state.freeRerollCharges += 1; // Grant 1 free reroll per level-up
      state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
      state.boostOffers = this.rollOffers(state.boostOffers.map((boost) => boost.id));
      if (state.pendingLevelUps > 0) {
        state.phase = "boost";
        state.strategicPhase = "boost";
        return;
      }
      if (state.pendingSpawns.length > 0 || state.enemies.some((enemy) => enemy.alive)) {
        state.boostOffers = [];
        state.phase = "combat";
        state.strategicPhase = "combat";
        return;
      }
    }

    this.log("UPGRADE_CHOSEN", { boostId: boostId, name: picked.name });
    state.boostOffers = [];
    state.routeOptions = createRouteOptions(state.waveIndex + 1);
    state.phase = "route";
    state.strategicPhase = "route";
  }

  tick(dt: number, input: InputSnapshot): void {
    const { state } = this;
    state.cues = [];
    if (state.phase !== "combat") {
      this.updateFx(dt);
      return;
    }

    const clampedDt = Math.min(dt, 1 / 20);
    state.time += clampedDt;
    state.waveTime += clampedDt;
    state.shake = Math.max(0, state.shake - clampedDt * 28);
    this.contactTimer = Math.max(0, this.contactTimer - clampedDt);

    if (state.hitstop > 0) {
      state.hitstop -= clampedDt;
      this.updateFx(clampedDt);
      this.decayFlashes(clampedDt);
      return;
    }

    this.aimPlayer(input);
    this.movePlayer(clampedDt, input);
    this.collectPickups();
    this.regen(clampedDt);
    this.tryUlt(input);
    this.updateUlt(clampedDt);
    this.tryFire(clampedDt, input);
    this.spawnEnemies(clampedDt);
    this.moveEnemies(clampedDt);
    this.moveProjectiles(clampedDt);
    this.resolveHits();
    this.pruneDead();
    this.updateFx(clampedDt);
    this.decayFlashes(clampedDt);
    this.checkWaveOrDefeat();
  }

  private createInitialState(): GameState {
    let stats = { ...BASE_STATS };
    // Apply run modifiers if configured
    const runModifiers = this.config.runModifiers ?? [];
    if (runModifiers.length > 0) {
      stats = applyRunModifiersToStats(stats, runModifiers as RunModifierId[]);
    }
    stats = applyAscensionStats(stats, this.config.ascensionLevel ?? 0);
    const player = {
      id: 1,
      team: "player" as const,
      position: vec.create(WORLD.width / 2, WORLD.height / 2),
      velocity: vec.create(),
      facing: vec.create(1, 0),
      radius: PLAYER_RADIUS,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      alive: true,
      color: "#4cc9f0",
    };
    return {
      phase: "class_select",
      time: 0,
      level: 1,
      pendingLevelUps: 0,
      waveIndex: 0,
      kills: 0,
      remainingToSpawn: 0,
      spawnCooldown: 0,
      fireCooldown: 0,
      volleyLeft: 0,
      volleyTimer: 0,
      hitstop: 0,
      shake: 0,
      nextId: 2,
      player,
      stats,
      enemies: [],
      projectiles: [],
      particles: [],
      cues: [],
      appliedBoostIds: [],
      boostOffers: [],
      recentBoostOffers: [],
      pendingSpawns: [],
      classId: null,
      ultCharge: 1,
      ultCooldown: 0,
      ultBonusLevel: 0,
      ultWasDown: false,
      zones: [],
      beams: [],
      pickups: [],
      wavePickupIds: [],
      waveShield: 0,
      waveVuln: 1,
      rerollCharges: 1,
      freeRerollCharges: 0,
      strategicPhase: "combat",
      gold: 0,
      evolutionShards: 0,
      rerollTokens: 0,
      artifacts: [],
      bossCoreIds: [],
      artifactSlots: 4,
      appliedFusionIds: [],
      sacrificesUsed: 0,
      committedBuild: null,
      routeHistory: [],
      routeOptions: [],
      activePacts: [],
      pactRewardClaimed: false,
      xp: 0,
      activeTemporaryEffects: [],
      activeBounty: null,
      lastBountyResult: null,
      bossRewardOffers: [],
      activeEvent: null,
      curses: [],
      shopItems: [],
      bountyProgress: 0,
      bountyFailed: false,
      waveDamageTaken: 0,
      waveTime: 0,
      eliteWave: false,
      artifactCounters: {},
      mutators: Array.isArray(this.config.mutators) ? [...this.config.mutators] : [],
      challengeMode: this.config.dailyChallenge?.mode ?? "normal",
      challenge: this.config.dailyChallenge ?? null,
      activeRunModifiers: this.config.runModifiers ?? [],
      activeAscensionLevel: this.config.ascensionLevel ?? 0,
    };
  }

  private createProfile(): ProfileState {
    return {
      version: 1,
      legacyShards: 0,
      runsCompleted: 0,
      bestWave: 0,
      unlockedClasses: ["vanguard", "marksman", "warden"],
      achievements: [],
      masteryXp: 0,
      unlockedBoosts: [],
      unlockedEnemyVariants: [],
    };
  }

  private startWave(index: number): void {
    const { state } = this;
    if (index > this.config.maxWaves) {
      state.phase = "victory";
      return;
    }
    this.log("WAVE_START", { wave: index });
    this.hydrateWave(state, index);
    state.phase = "combat";
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.fireCooldown = 0.12;
    state.volleyLeft = 0;
    state.shake = 0;
    state.hitstop = 0;
    state.zones = [];
    state.beams = [];
    state.wavePickupIds = [];
    state.waveShield = 0;
    state.waveVuln = 1;
    state.activeTemporaryEffects = state.activeTemporaryEffects
      .map((effect) => ({ ...effect, remainingWaves: effect.remainingWaves - 1 }))
      .filter((effect) => effect.remainingWaves > 0);
    state.waveDamageTaken = 0;
    state.waveTime = 0;
    state.bountyFailed = false;
    state.bountyProgress = 0;
    state.lastBountyResult = null;
    const bountyPool = bountiesForWave(state.eliteWave);
    state.activeBounty = bountyPool[this.rng.int(bountyPool.length)] ?? null;
    this.rebuildStats();
    this.spawnWavePickups();
  }

  private rebuildStats(): void {
    const { state } = this;
    if (!state.classId) return;
    const previousMax = state.player.maxHp;
    const baseStats = applyTemporaryEffects(
      applyBossCores(applyArtifacts(applyBuild(state.classId, state.appliedBoostIds, state.wavePickupIds), state.artifacts), state.bossCoreIds),
      state.activeTemporaryEffects,
    );
    let stats = { ...baseStats };
    for (const mutatorId of state.mutators) {
      const mutator = getMutatorById(mutatorId);
      if (!mutator) continue;
      if (mutator.modifiers.playerHpMultiplier) stats.maxHp *= mutator.modifiers.playerHpMultiplier;
      if (mutator.modifiers.playerDamageMultiplier) stats.projectileDamage *= mutator.modifiers.playerDamageMultiplier;
      if (mutator.modifiers.xpMultiplier) stats.xpGain *= mutator.modifiers.xpMultiplier;
      if (mutator.modifiers.lifestealMultiplier) stats.lifesteal *= mutator.modifiers.lifestealMultiplier;
    }
    // Apply run modifiers
    if (state.activeRunModifiers && state.activeRunModifiers.length > 0) {
      stats = applyRunModifiersToStats(stats, state.activeRunModifiers as RunModifierId[]);
    }
    stats = applyAscensionStats(stats, state.activeAscensionLevel);
    state.stats = stats;
    state.player.maxHp = state.stats.maxHp;
    if (state.player.maxHp > previousMax) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp - previousMax);
    }
  }

  private hydrateWave(state: GameState, index: number): void {
    const wave = this.waves[index - 1];
    if (!wave) return;
    state.waveIndex = index;
    state.eliteWave = Boolean(wave.elite);
    state.pendingSpawns = [];

    // Apply run modifier wave effects
    let baseEliteChance = getEliteChance(index);
    let countMultiplier = 1.0;
    let hpMultiplier = 1.0;
    let ascensionEffects = applyAscensionToWave(state.activeAscensionLevel);

    for (const modifierId of state.activeRunModifiers) {
      const modEffects = applyRunModifierToWave(index, { id: modifierId } as any, baseEliteChance);
      baseEliteChance = modEffects.eliteChance;
      countMultiplier *= modEffects.enemyCountMultiplier;
      hpMultiplier *= modEffects.enemyHpMultiplier;
    }
    countMultiplier *= ascensionEffects.enemyCountMultiplier;
    hpMultiplier *= ascensionEffects.enemyHpMultiplier;

    // Build spawn list with elite modifiers
    for (const group of wave.groups) {
      const swarmMultiplier = state.activePacts.reduce((total, id) => total + (pactById(id)?.modifiers.enemyCount ?? 0), 0);
      const mutatorCountMultiplier = this.mutatorMultiplier("enemyCountMultiplier");
      const runModifierCountMultiplier = countMultiplier; // From run modifiers
      const spawnCount = Math.ceil(group.count * (1 + swarmMultiplier) * mutatorCountMultiplier * runModifierCountMultiplier);

      for (let i = 0; i < spawnCount; i++) {
        let modifiers = wave.modifiers ? [...wave.modifiers] : [];

        // Determine if this enemy gets elite modifiers
        const roll = this.rng.next();
        if (roll < baseEliteChance) {
          const eliteModifiers = selectEliteModifiers(this.rng);
          modifiers = [...modifiers, ...eliteModifiers];
        }

        state.pendingSpawns.push({
          defId: group.enemyId,
          modifiers: modifiers as EnemyModifierId[],
          hpMultiplier, // Store for makeEnemy to apply
        });
      }
    }
    state.pendingSpawns = this.rng.shuffle(state.pendingSpawns);
    state.remainingToSpawn = state.pendingSpawns.length;
    state.spawnCooldown = 0.2;
  }

  private allocId(): number {
    return this.state.nextId++;
  }

  private cue(kind: AudioCueKind): void {
    this.state.cues.push({ kind });
  }

  private shake(amount: number): void {
    this.state.shake = Math.min(18, this.state.shake + amount);
  }

  private spawnFx(
    kind: FxKind,
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    life: number,
    radius: number,
    color: string,
  ): void {
    this.state.particles.push({
      kind,
      position: vec.clone(position),
      velocity: vec.clone(velocity),
      life,
      maxLife: life,
      radius,
      color,
    });
  }

  private aimPlayer(input: InputSnapshot): void {
    const aim = vec.sub(vec.create(input.aimX, input.aimY), this.state.player.position);
    const facing = vec.normalize(aim);
    if (facing.x !== 0 || facing.y !== 0) this.state.player.facing = facing;
  }

  private movePlayer(dt: number, input: InputSnapshot): void {
    const { player, stats } = this.state;
    const dir = vec.normalize(vec.create(input.moveX, input.moveY));
    player.velocity = vec.scale(dir, stats.moveSpeed);
    player.position = vec.clampToRect(
      vec.add(player.position, vec.scale(player.velocity, dt)),
      WORLD.width,
      WORLD.height,
      player.radius,
    );
  }

  private regen(dt: number): void {
    const { player, stats } = this.state;
    if (stats.regenPerSecond <= 0) return;
    player.hp = Math.min(player.maxHp, player.hp + stats.regenPerSecond * dt);
  }

  private tryFire(dt: number, input: InputSnapshot): void {
    const { state } = this;
    state.fireCooldown -= dt;
    state.volleyTimer -= dt;

    if (input.firing && state.fireCooldown <= 0 && state.volleyLeft <= 0) {
      state.volleyLeft = state.stats.burstCount;
      state.volleyTimer = 0;
      state.fireCooldown = 1 / state.stats.fireRate;
    }

    if (state.volleyLeft > 0 && state.volleyTimer <= 0) {
      this.fireVolley();
      state.volleyLeft -= 1;
      state.volleyTimer = VOLLEY_GAP;
    }
  }

  private fireVolley(): void {
    const { state } = this;
    const forward = state.player.facing;
    if (forward.x === 0 && forward.y === 0) return;

    const count = state.stats.projectileCount;
    const cone = count === 1 ? 0 : Math.min(0.7, 0.1 * (count - 1));
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const jitter = (this.rng.next() * 2 - 1) * state.stats.spread;
      const dir = vec.rotate(forward, t * cone + jitter);
      this.spawnProjectile(dir, state.stats);
    }

    const kick = vec.scale(forward, -state.stats.recoil);
    state.player.position = vec.clampToRect(
      vec.add(state.player.position, kick),
      WORLD.width,
      WORLD.height,
      state.player.radius,
    );

    const muzzle = vec.add(state.player.position, vec.scale(forward, state.player.radius + BARREL));
    this.spawnFx("muzzle", muzzle, vec.scale(forward, 40), 0.06, 10, "#fff3c4");
    this.spawnFx("burst", muzzle, vec.create(), 0.08, 16, "#ffbf66");
    const eject = vec.add(vec.scale(vec.perp(forward), 90 + this.rng.next() * 40), vec.create(0, -40));
    this.spawnFx("casing", muzzle, eject, 0.35, 2.2, "#d4b36a");
    this.shake(2.4 + state.stats.recoil * 0.08);
    this.cue("fire");
  }

  private spawnProjectile(dir: { x: number; y: number }, stats: PlayerStats): void {
    const { state } = this;
    const crit = this.rng.next() < stats.critChance;
    const passive = state.classId ? classById(state.classId).passive.id : null;
    const rageMultiplier = passive === "berserker_rage" && state.player.hp / state.player.maxHp < 0.4 ? 1.35 : 1;
    const fangReady = state.artifacts.includes("vampire_fang") && (state.artifactCounters.vampire_fang ?? 0) >= 10;
    const projectile: ProjectileActor = {
      id: this.allocId(),
      team: "projectile",
      position: vec.add(state.player.position, vec.scale(dir, state.player.radius + BARREL)),
      velocity: vec.scale(dir, stats.projectileSpeed * (crit ? 1.08 : 1)),
      radius: PROJECTILE_RADIUS * (crit ? 1.25 : 1),
      hp: 1,
      maxHp: 1,
      alive: true,
      damage: stats.projectileDamage * (crit ? stats.critMultiplier : 1) * rageMultiplier,
      pierceLeft: stats.projectilePierce + (crit && passive === "deadeye" ? 1 : 0),
      hitIds: [],
      crit,
      bouncesLeft: stats.ricochet,
      explosionRadius: stats.explosionRadius,
      hostile: false,
      chargedLifesteal: fangReady,
    };
    if (fangReady) {
      state.artifactCounters.vampire_fang = 0;
    }
    state.projectiles.push(projectile);
  }

  private spawnEnemies(dt: number): void {
    const { state } = this;
    const wave = this.waves[state.waveIndex - 1];
    if (!wave || state.pendingSpawns.length === 0) return;
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const spawnInterval = Number.isFinite(wave.spawnInterval) && wave.spawnInterval > 0 ? wave.spawnInterval : 0.2;
    if (!Number.isFinite(state.spawnCooldown)) state.spawnCooldown = 0;
    state.spawnCooldown -= elapsed;
    while (state.spawnCooldown <= 0 && state.pendingSpawns.length > 0) {
      const next = state.pendingSpawns.shift()!;
      const def = ENEMIES[next.defId];
      if (def) state.enemies.push(this.makeEnemy(def.id, undefined, next.modifiers, next.hpMultiplier ?? 1.0));
      state.remainingToSpawn = state.pendingSpawns.length;
      state.spawnCooldown += spawnInterval;
    }
  }

  private makeEnemy(defId: string, at?: { x: number; y: number }, modifiers: EnemyModifierId[] = [], hpMultiplier: number = 1.0): EnemyActor {
    const { state } = this;
    const def = ENEMIES[defId]!;
    const waveIndex = this.state.waveIndex;
    const baseHpScale = 1 + (waveIndex - 1) * 0.12;
    const pactHp = state.activePacts.reduce((total, id) => total + (pactById(id)?.modifiers.enemyHp ?? 0), 0);
    const artifactHp = state.artifacts.includes("cursed_skull") ? 0.2 : 0;
    const pactDamage = state.activePacts.reduce((total, id) => total + (pactById(id)?.modifiers.enemyDamage ?? 0), 0);

    // Apply elite modifier multipliers
    let modifierHpMultiplier = 1.0;
    let modifierSpeedMultiplier = 1.0;
    let modifierDamageMultiplier = 1.0;

    for (const modId of modifiers) {
      if (modId === "armored") modifierHpMultiplier *= 1.25;
      else if (modId === "fast") modifierSpeedMultiplier *= 1.4;
      else if (modId === "vampiric") modifierDamageMultiplier *= 1.2;
      else if (modId === "regenerating") modifierHpMultiplier *= 1.2;
      else if (modId === "explosive") modifierHpMultiplier *= 1.15;
      else if (modId === "swarming") modifierHpMultiplier *= 1.1;
      else if (modId === "shielded") modifierHpMultiplier *= 1.15;
      else if (modId === "reflective") modifierHpMultiplier *= 1.2;
      else if (modId === "ranged") modifierHpMultiplier *= 1.15;
    }

    const totalHpMultiplier = baseHpScale * (1 + pactHp + artifactHp) * modifierHpMultiplier * hpMultiplier * this.mutatorMultiplier("enemyHpMultiplier");
    const speedMultiplier = modifierSpeedMultiplier * this.mutatorMultiplier("enemySpeedMultiplier");
    const damageMultiplier = modifierDamageMultiplier * this.mutatorMultiplier("enemyDamageMultiplier");

    const hp = Math.ceil(def.hp * totalHpMultiplier);
    const enemy: EnemyActor = {
      id: this.allocId(),
      team: "enemy",
      defId,
      position: at ? vec.clone(at) : this.edgeSpawn(def.radius),
      velocity: vec.create(),
      radius: def.radius,
      hp: hp,
      maxHp: hp,
      alive: true,
      contactDamage: def.contactDamage * damageMultiplier * (1 + pactDamage),
      speed: def.speed * speedMultiplier,
      color: def.color,
      hitFlash: 0,
      slowTimer: 0,
      slowAmount: 0,
      ai: def.ai,
      fireCooldown: this.rng.next() * (def.shoot?.interval ?? 1),
      orbitSign: this.rng.next() < 0.5 ? -1 : 1,
      isBoss: Boolean(def.isBoss),
      modifiers: modifiers,
      shield: 0,
    };

    // Apply elite modifier special effects
    for (const modId of modifiers) {
      if (modId === "regenerating") enemy.regeneration = { perSecond: hp * 0.05 };
      else if (modId === "explosive") enemy.explodeOnDeath = { radius: 100, damage: 40 };
      else if (modId === "shielded") enemy.shield = Math.ceil(hp * 0.3);
      else if (modId === "reflective") enemy.reflection = { damage: 0.15 };
      else if (modId === "swarming") enemy.splitOnDeath = { enemyId: defId, count: 2 };
      else if (modId === "ranged") enemy.shoot = { damage: 15, interval: 1.5, speed: 400, range: 500 };
    }

    return enemy;
  }

  private edgeSpawn(radius: number) {
    const w = WORLD.width;
    const h = WORLD.height;
    const perimeter = 2 * (w + h);
    const distance = this.rng.next() * perimeter;
    if (distance < w) return vec.create(distance, -radius);
    if (distance < w + h) return vec.create(w + radius, distance - w);
    if (distance < 2 * w + h) return vec.create(w - (distance - w - h), h + radius);
    return vec.create(-radius, h - (distance - 2 * w - h));
  }

  private moveEnemies(dt: number): void {
    const { state } = this;
    const target = state.player.position;
    for (const enemy of state.enemies) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.modifiers.includes("regenerating")) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.03 * dt);
      }
      const slow = enemy.slowTimer > 0 ? 1 - enemy.slowAmount : 1;
      const speed = enemy.speed * slow;
      const toPlayer = vec.sub(target, enemy.position);
      const dist = vec.length(toPlayer);
      const chase = vec.normalize(toPlayer);

      if (enemy.ai === "kite") {
        const preferred = 340;
        let dir = chase;
        if (dist < preferred - 30) dir = vec.scale(chase, -1);
        else if (dist < preferred + 40) dir = vec.normalize(vec.add(vec.perp(chase), vec.scale(chase, 0.15)));
        enemy.velocity = vec.scale(dir, speed);
      } else if (enemy.ai === "charge") {
        const chargeDir = vec.normalize(vec.add(chase, vec.scale(vec.perp(chase), enemy.orbitSign * 0.18)));
        enemy.velocity = vec.scale(chargeDir, speed);
      } else if (enemy.ai === "orbit") {
        const inward = dist > 210 ? 0.35 : dist < 140 ? -0.45 : 0.05;
        const dir = vec.normalize(vec.add(vec.scale(vec.perp(chase), enemy.orbitSign), vec.scale(chase, inward)));
        enemy.velocity = vec.scale(dir, speed);
      } else if (enemy.ai === "support") {
        const ally = this.nearestAlly(enemy);
        const hold = ally ? ally.position : vec.add(target, vec.scale(chase, -320));
        const away = dist < 260 ? vec.scale(chase, -1) : vec.normalize(vec.sub(hold, enemy.position));
        enemy.velocity = vec.scale(away, speed * 0.9);
      } else {
        enemy.velocity = vec.scale(chase, speed);
      }

      enemy.position = vec.add(enemy.position, vec.scale(enemy.velocity, dt));
      enemy.position = vec.clampToRect(enemy.position, WORLD.width, WORLD.height, enemy.radius);
      this.tryEnemyShoot(enemy, dt, dist, chase);
    }
    this.applyHealAuras(dt);
  }

  private nearestAlly(enemy: EnemyActor): EnemyActor | undefined {
    let nearest: EnemyActor | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of this.state.enemies) {
      if (candidate.id === enemy.id || !candidate.alive) continue;
      const distance = vec.dist(enemy.position, candidate.position);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private tryEnemyShoot(enemy: EnemyActor, dt: number, distance: number, chase: { x: number; y: number }): void {
    const weapon = ENEMIES[enemy.defId]?.shoot;
    if (!weapon || distance > weapon.range) return;
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown > 0) return;
    enemy.fireCooldown = weapon.interval;
    const projectile: ProjectileActor = {
      id: this.allocId(),
      team: "projectile",
      position: vec.add(enemy.position, vec.scale(chase, enemy.radius + 8)),
      velocity: vec.scale(chase, weapon.speed),
      radius: 5,
      hp: 1,
      maxHp: 1,
      alive: true,
      damage: weapon.damage * this.pactEnemyDamageMultiplier(),
      pierceLeft: 0,
      hitIds: [],
      crit: false,
      bouncesLeft: 0,
      explosionRadius: 0,
      hostile: true,
      chargedLifesteal: false,
    };
    this.state.projectiles.push(projectile);
  }

  private applyHealAuras(dt: number): void {
    for (const source of this.state.enemies) {
      const aura = ENEMIES[source.defId]?.healAura;
      if (!aura || !source.alive) continue;
      for (const ally of this.state.enemies) {
        if (!ally.alive || vec.dist(source.position, ally.position) > aura.radius) continue;
        ally.hp = Math.min(ally.maxHp, ally.hp + aura.perSecond * dt);
      }
    }
  }

  private moveProjectiles(dt: number): void {
    for (const shot of this.state.projectiles) {
      shot.position = vec.add(shot.position, vec.scale(shot.velocity, dt));
      this.bounceOrCull(shot);
    }
  }

  private bounceOrCull(shot: ProjectileActor): void {
    const margin = shot.radius;
    let bounced = false;
    if (shot.position.x < margin) {
      shot.position.x = margin;
      shot.velocity.x = Math.abs(shot.velocity.x);
      bounced = true;
    } else if (shot.position.x > WORLD.width - margin) {
      shot.position.x = WORLD.width - margin;
      shot.velocity.x = -Math.abs(shot.velocity.x);
      bounced = true;
    }
    if (shot.position.y < margin) {
      shot.position.y = margin;
      shot.velocity.y = Math.abs(shot.velocity.y);
      bounced = true;
    } else if (shot.position.y > WORLD.height - margin) {
      shot.position.y = WORLD.height - margin;
      shot.velocity.y = -Math.abs(shot.velocity.y);
      bounced = true;
    }
    if (!bounced) return;
    if (shot.hostile || shot.bouncesLeft <= 0) {
      shot.alive = false;
      return;
    }
    shot.bouncesLeft -= 1;
    this.spawnFx("impact", shot.position, vec.scale(shot.velocity, 0.05), 0.1, 5, "#ffe08a");
  }

  private resolveHits(): void {
    const { state } = this;
    for (const shot of state.projectiles) {
      if (!shot.alive || shot.hostile) continue;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (shot.hitIds.includes(enemy.id)) continue;
        if (vec.dist(shot.position, enemy.position) > shot.radius + enemy.radius) continue;
        this.applyBulletHit(shot, enemy);
        if (!shot.alive) break;
      }
    }

    for (const shot of state.projectiles) {
      if (!shot.alive || !shot.hostile) continue;
      if (vec.dist(shot.position, state.player.position) > shot.radius + state.player.radius) continue;
      this.hurtPlayer(shot.damage);
      shot.alive = false;
    }

    if (this.contactTimer > 0) return;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (vec.dist(enemy.position, state.player.position) > enemy.radius + state.player.radius) {
        continue;
      }
      this.hurtPlayer(enemy.contactDamage);
      this.contactTimer = CONTACT_COOLDOWN;
      const def = ENEMIES[enemy.defId];
      if (def?.explodeOnDeath || enemy.modifiers.includes("explosive")) {
        enemy.alive = false;
        if (def?.explodeOnDeath) this.explode(enemy.position, def.explodeOnDeath.radius, def.explodeOnDeath.damage);
        else this.explode(enemy.position, enemy.radius * 4, enemy.contactDamage * 1.2);
        this.onEnemyKilled(enemy);
      }
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.player.alive = false;
      }
      break;
    }
  }

  private hurtPlayer(damage: number): void {
    const { state } = this;
    let remaining = damage;
    if (state.waveShield > 0) {
      state.waveShield -= 1;
      remaining = 0;
    }
    if (remaining > 0) {
      const taken = remaining * state.stats.damageTakenMultiplier;
      state.player.hp -= taken;
      state.waveDamageTaken += taken;
      this.log("DAMAGE_TAKEN", { damage: taken, hp: state.player.hp, totalWaveDamage: state.waveDamageTaken });
      if (state.activeBounty?.target === "no_damage") state.bountyFailed = true;
    }
    this.cue("hurt");
    this.shake(5);
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      state.player.alive = false;
    }
  }

  private applyBulletHit(shot: ProjectileActor, enemy: EnemyActor): void {
    const { state } = this;
    if (enemy.shield > 0) {
      enemy.shield = Math.max(0, enemy.shield - shot.damage);
      shot.hitIds.push(enemy.id);
      shot.alive = enemy.shield <= 0;
      return;
    }
    const damage = shot.damage * this.state.waveVuln * (enemy.modifiers.includes("armored") ? 0.75 : 1);
    const attunement = state.classId === "warden" && enemy.slowTimer > 0 ? 1.2 : 1;
    enemy.hp -= damage * attunement;
    enemy.hitFlash = 0.12;
    shot.hitIds.push(enemy.id);
    if (state.stats.slowDuration > 0) {
      this.applySlow(enemy, state.stats.slowDuration, state.stats.slowFactor);
    }

    const push = vec.scale(vec.normalize(shot.velocity), state.stats.knockback);
    enemy.position = vec.add(enemy.position, push);

    if (state.stats.lifesteal > 0) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + shot.damage * state.stats.lifesteal);
    }
    if (shot.chargedLifesteal) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage);
      shot.chargedLifesteal = false;
    }

    this.spawnFx(
      "impact",
      enemy.position,
      vec.scale(vec.normalize(shot.velocity), 80),
      0.14,
      shot.crit ? 8 : 5,
      shot.crit ? "#ffffff" : "#ffe08a",
    );
    this.shake(shot.crit ? 3.2 : 1.4);
    this.cue("hit");
    this.addUltCharge(shot.damage * this.power().chargeFromDamage);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      state.kills += 1;
      this.addUltCharge(0.08);
      state.hitstop = Math.max(state.hitstop, shot.crit ? 0.055 : 0.035);
      this.shake(5);
      this.cue("kill");
      this.onEnemyKilled(enemy);
      if (enemy.modifiers.includes("explosive")) {
        this.explode(enemy.position, enemy.radius * 4, enemy.contactDamage * 1.2);
      }
      for (let i = 0; i < 6; i++) {
        const a = this.rng.next() * Math.PI * 2;
        this.spawnFx(
          "debris",
          enemy.position,
          vec.create(Math.cos(a) * 140, Math.sin(a) * 140),
          0.28,
          3,
          enemy.color,
        );
      }
    }

    if (shot.explosionRadius > 0) {
      this.explode(shot.position, shot.explosionRadius, shot.damage * 0.55);
      shot.alive = false;
      return;
    }

    if (shot.pierceLeft <= 0) {
      shot.alive = false;
      return;
    }
    shot.pierceLeft -= 1;
  }

  private explode(origin: { x: number; y: number }, radius: number, damage: number): void {
    this.spawnFx("burst", origin, vec.create(), 0.16, radius, "#ff9a4a");
    this.shake(7);
    this.cue("explode");
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;
      if (vec.dist(origin, enemy.position) > radius + enemy.radius) continue;
      enemy.hp -= damage * this.state.waveVuln;
      enemy.hitFlash = 0.12;
      if (enemy.hp <= 0) {
        enemy.alive = false;
        this.state.kills += 1;
        this.onEnemyKilled(enemy);
      }
    }
  }

  private pruneDead(): void {
    this.state.enemies = this.state.enemies.filter((e) => e.alive);
    this.state.projectiles = this.state.projectiles.filter((p) => p.alive);
  }

  private updateFx(dt: number): void {
    for (const p of this.state.particles) {
      p.life -= dt;
      p.position = vec.add(p.position, vec.scale(p.velocity, dt));
      if (p.kind === "casing") p.velocity.y += 520 * dt;
      p.velocity = vec.scale(p.velocity, p.kind === "casing" ? 0.98 : 0.9);
    }
    this.state.particles = this.state.particles.filter((p) => p.life > 0);
  }

  private decayFlashes(dt: number): void {
    for (const enemy of this.state.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    }
  }

  private checkWaveOrDefeat(): void {
    const { state } = this;
    if (!state.player.alive) {
      state.phase = "defeat";
      this.log("WAVE_END", { wave: state.waveIndex, reason: "player_death", damageTotal: state.waveDamageTaken });
      this.recordRun(false);
      return;
    }
    const waveDone = state.pendingSpawns.length === 0 && state.enemies.length === 0;
    if (!waveDone) return;

    this.resolveBounty();
    this.resolvePactReward();

    if (this.waves[state.waveIndex - 1]?.groups.some((group) => ENEMIES[group.enemyId]?.isBoss)) {
      state.bossRewardOffers = [...BOSS_REWARDS];
      this.log("WAVE_END", { wave: state.waveIndex, reason: "wave_complete", damageTotal: state.waveDamageTaken });
      this.log("UPGRADE_OFFERED", { count: state.bossRewardOffers.length, type: "boss_reward" });
      state.phase = "boss_reward";
      state.strategicPhase = "boss_reward";
      return;
    }
    if (state.waveIndex >= this.config.maxWaves) {
      state.phase = "victory";
      this.log("WAVE_END", { wave: state.waveIndex, reason: "run_complete", damageTotal: state.waveDamageTaken });
      this.recordRun(true);
      return;
    }
    state.phase = "boost";
    state.rerollCharges = Math.max(state.rerollCharges, 1);
    this.log("WAVE_END", { wave: state.waveIndex, reason: "wave_complete", damageTotal: state.waveDamageTaken });
    state.boostOffers = this.rollOffers();
    this.log("UPGRADE_OFFERED", { count: state.boostOffers.length, type: "normal_boost" });
  }

  choosePact(pactId: string): boolean {
    const { state } = this;
    if (state.phase !== "route" || state.activePacts.length >= 1 || !PACTS.some((pact) => pact.id === pactId)) return false;
    state.activePacts.push(pactId);
    return true;
  }

  private resolveBounty(): void {
    const { state } = this;
    const bounty = state.activeBounty;
    if (!bounty) return;
    const complete = bounty.target === "no_damage"
      || (bounty.target === "kills" && state.bountyProgress >= (bounty.amount ?? 0))
      || (bounty.target === "speed" && state.waveTime <= (bounty.amount ?? 0))
      || (bounty.target === "elite" && state.bountyProgress > 0);
    const success = !state.bountyFailed && complete;
    state.lastBountyResult = { bounty, success };
    if (success) {
      state.gold += bounty.reward.gold ?? 0;
      state.rerollTokens += bounty.reward.rerollTokens ?? 0;
      state.evolutionShards += bounty.reward.evolutionShards ?? 0;
    }
    state.activeBounty = null;
  }

  private resolvePactReward(): void {
    const { state } = this;
    if (state.activePacts.length === 0 || state.pactRewardClaimed) return;
    const pact = pactById(state.activePacts[0]);
    if (!pact) return;
    if (pact.reward.rarity === "legendary") {
      state.evolutionShards += 2;
      state.rerollTokens += 1;
    }
    if (pact.reward.artifact) {
      const availableArtifact = ARTIFACTS.find((artifact) => !state.artifacts.includes(artifact.id));
      if (availableArtifact && !this.addArtifact(availableArtifact.id)) state.evolutionShards += 1;
    }
    state.pactRewardClaimed = true;
  }

  selectBossReward(rewardId: string): boolean {
    const { state } = this;
    const reward = state.bossRewardOffers.find((candidate) => candidate.id === rewardId);
    if (state.phase !== "boss_reward" || !reward) return false;
    state.bossCoreIds.push(reward.id);
    state.bossRewardOffers = [];
    this.rebuildStats();
    state.routeOptions = createRouteOptions(state.waveIndex + 1);
    state.phase = "route";
    state.strategicPhase = "route";
    return true;
  }

  private rollOffers(excludedIds: string[] = []): BoostDef[] {
    const offers = getUpgradeOptions(
      this.state.appliedBoostIds,
      this.state.waveIndex,
      this.state.classId,
      OFFER_COUNT,
      excludedIds,
      this.state.committedBuild,
      this.state.recentBoostOffers,
      getUnlockedContentIds(this.profile),
    );
    this.state.recentBoostOffers = [...this.state.recentBoostOffers, ...offers.map((boost) => boost.id)].slice(-12);
    if (offers.length === OFFER_COUNT) return offers;
    const pool = availableBoosts(this.state.appliedBoostIds, this.state.waveIndex, getUnlockedContentIds(this.profile));
    const picked = [...offers];
    for (const boost of pool) {
      if (picked.length >= OFFER_COUNT) break;
      if (picked.some((item) => item.id === boost.id)) continue;
      picked.push(boost);
    }
    return picked.slice(0, OFFER_COUNT);
  }

  commitToBuild(commitmentId: string): boolean {
    const { state } = this;
    if (state.phase !== "boost" || state.committedBuild || !commitmentById(commitmentId)) return false;
    state.committedBuild = commitmentId;
    state.boostOffers = this.rollOffers();
    return true;
  }

  removeUpgrade(boostId: string): boolean {
    const { state } = this;
    if (state.phase !== "boost" || state.gold < 25) return false;
    const index = state.appliedBoostIds.indexOf(boostId);
    if (index < 0) return false;
    state.appliedBoostIds.splice(index, 1);
    state.gold -= 25;
    this.rebuildStats();
    return true;
  }

  sacrificeUpgrade(boostId: string): boolean {
    const { state } = this;
    if (state.phase !== "boost" || state.sacrificesUsed >= 2) return false;
    const index = state.appliedBoostIds.indexOf(boostId);
    if (index < 0) return false;
    state.appliedBoostIds.splice(index, 1);
    state.evolutionShards += 1;
    state.sacrificesUsed += 1;
    this.rebuildStats();
    return true;
  }

  fuse(recipeId: string): boolean {
    const { state } = this;
    const recipe = FUSION_RECIPES.find((candidate) => candidate.id === recipeId);
    if (state.phase !== "boost" || !recipe) return false;
    if (!canFuseWithState(state.appliedBoostIds, recipe, state.evolutionShards, state.artifacts, state.artifactSlots)) return false;

    const resultId = recipe.resultBoostId;
    const keepResultStack = !!resultId && recipe.ingredients.includes(resultId);
    for (const ingredient of recipe.ingredients) {
      if (keepResultStack && ingredient === resultId) continue;
      const index = state.appliedBoostIds.indexOf(ingredient);
      if (index >= 0) state.appliedBoostIds.splice(index, 1);
    }
    if (resultId) state.appliedBoostIds.push(resultId);
    if (recipe.resultArtifactId && !this.addArtifact(recipe.resultArtifactId)) return false;

    const burnDamage = Math.max(6, Math.round(state.player.maxHp * 0.08));
    state.player.hp = Math.max(1, state.player.hp - burnDamage);
    state.evolutionShards -= recipe.cost.evolutionShards;
    state.appliedFusionIds.push(recipe.id);
    this.rebuildStats();
    return true;
  }

  addArtifact(artifactId: string): boolean {
    const { state } = this;
    if (!artifactById(artifactId) || state.artifacts.includes(artifactId) || state.artifacts.length >= state.artifactSlots) return false;
    state.artifacts.push(artifactId);
    this.rebuildStats();
    return true;
  }

  selectRoute(nodeId: string): boolean {
    const { state } = this;
    if (state.phase !== "route") return false;
    const node = state.routeOptions.find((option) => option.id === nodeId);
    if (!node) return false;
    state.routeHistory.push(node.id);
    state.routeOptions = [];
    if (node.type === "shop") {
      state.shopItems = createShopInventory(state.appliedBoostIds);
      state.phase = "shop";
      state.strategicPhase = "shop";
      return true;
    }
    if (node.type === "rest") state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.35);
    if (node.type === "treasure") this.addArtifact("magnet");
    if (node.type === "event") {
      state.activeEvent = eventById("mysterious-shrine") ?? null;
      state.phase = "event";
      state.strategicPhase = "event";
      return true;
    }
    this.startWave(node.waveIndex);
    state.strategicPhase = "combat";
    return true;
  }

  selectEventChoice(choiceId: string): boolean {
    const { state } = this;
    const choice = state.activeEvent?.choices.find((candidate) => candidate.id === choiceId);
    if (state.phase !== "event" || !choice) return false;
    const effect = choice.effect;
    if (effect.gold) state.gold = Math.max(0, state.gold + effect.gold);
    if (effect.evolutionShards) state.evolutionShards += effect.evolutionShards;
    if (effect.hpFraction) state.player.hp = Math.max(1, Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * effect.hpFraction));
    if (effect.artifactId) this.addArtifact(effect.artifactId);
    if (effect.curseId && !state.curses.includes(effect.curseId)) state.curses.push(effect.curseId);
    state.activeEvent = null;
    this.startWave(state.waveIndex + 1);
    state.strategicPhase = "combat";
    return true;
  }

  buyShopItem(itemId: string): boolean {
    const { state } = this;
    const item = state.shopItems.find((candidate) => candidate.id === itemId);
    if (state.phase !== "shop" || !item || state.gold < item.price) return false;
    if (item.kind === "artifact" && (!item.artifactId || !this.addArtifact(item.artifactId))) return false;
    state.gold -= item.price;
    if (item.kind === "heal") state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.35);
    if (item.kind === "reroll") state.rerollTokens += 1;
    if (item.kind === "shard") state.evolutionShards += 1;
    state.shopItems = state.shopItems.filter((candidate) => candidate.id !== itemId);
    return true;
  }

  leaveShop(): boolean {
    const { state } = this;
    if (state.phase !== "shop") return false;
    state.shopItems = [];
    this.startWave(state.waveIndex + 1);
    state.strategicPhase = "combat";
    return true;
  }

  activateTemporaryEffect(effectId: string): boolean {
    const { state } = this;
    const definition = temporaryEffectById(effectId);
    if (!definition || (state.phase !== "boost" && state.phase !== "route") || state.activeTemporaryEffects.length > 0) return false;
    state.activeTemporaryEffects.push({ id: definition.id, name: definition.name, remainingWaves: definition.durationWaves, modifiers: definition.modifiers });
    this.rebuildStats();
    return true;
  }

  private power() {
    return ultPower(this.state.waveIndex, this.state.ultBonusLevel);
  }

  private addUltCharge(amount: number): void {
    this.state.ultCharge = Math.min(1, this.state.ultCharge + amount);
  }

  private applySlow(enemy: EnemyActor, duration: number, amount: number): void {
    enemy.slowTimer = Math.max(enemy.slowTimer, duration);
    enemy.slowAmount = Math.max(enemy.slowAmount, amount);
  }

  private tryUlt(input: InputSnapshot): void {
    const { state } = this;
    const pressed = input.ult && !state.ultWasDown;
    state.ultWasDown = input.ult;
    if (!pressed || !state.classId) return;
    if (state.ultCharge < 1 || state.ultCooldown > 0) return;
    this.castUlt(input);
  }

  private castUlt(input: InputSnapshot): void {
    const { state } = this;
    if (!state.classId) return;
    const cls = classById(state.classId);
    const p = this.power();
    state.ultCharge = 0;
    state.ultCooldown = p.cooldown;
    this.cue("ult");
    this.shake(10);

    if (cls.ult.kind === "nova") this.castNova(p.novaRadius, p.novaDamage);
    if (cls.ult.kind === "beam") this.castBeam(p.beamLength, p.beamWidth, p.beamDamage, cls.color);
    if (cls.ult.kind === "zone") {
      this.castZone(
        vec.create(input.aimX, input.aimY),
        p.zoneRadius,
        p.zoneDuration,
        p.zoneDps,
        p.zoneSlow,
        cls.color,
      );
    }
  }

  private castNova(radius: number, damage: number): void {
    const origin = this.state.player.position;
    this.spawnFx("burst", origin, vec.create(), 0.28, radius, "#ff8a4a");
    this.spawnFx("burst", origin, vec.create(), 0.18, radius * 0.55, "#ffe0c2");
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;
      if (vec.dist(origin, enemy.position) > radius + enemy.radius) continue;
      const dir = vec.normalize(vec.sub(enemy.position, origin));
      enemy.position = vec.add(enemy.position, vec.scale(dir, 48));
      this.damageEnemy(enemy, damage);
    }
    this.state.hitstop = Math.max(this.state.hitstop, 0.07);
  }

  private castBeam(length: number, width: number, damage: number, color: string): void {
    const from = this.state.player.position;
    const to = vec.add(from, vec.scale(this.state.player.facing, length));
    this.state.beams.push({
      from: vec.clone(from),
      to,
      width,
      life: 0.16,
      maxLife: 0.16,
      color,
    });
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;
      if (distToSegment(enemy.position, from, to) > width + enemy.radius) continue;
      this.damageEnemy(enemy, damage);
    }
    this.state.hitstop = Math.max(this.state.hitstop, 0.05);
  }

  private castZone(
    aim: { x: number; y: number },
    radius: number,
    duration: number,
    dps: number,
    slow: number,
    color: string,
  ): void {
    const pos = vec.clampToRect(aim, WORLD.width, WORLD.height, radius);
    this.state.zones.push({
      position: pos,
      radius,
      life: duration,
      maxLife: duration,
      dps,
      slow,
      color,
    });
    this.spawnFx("burst", pos, vec.create(), 0.2, radius, color);
  }

  private updateUlt(dt: number): void {
    const { state } = this;
    state.ultCooldown = Math.max(0, state.ultCooldown - dt);
    if (state.ultCooldown <= 0 && state.ultCharge < 1) this.addUltCharge(dt * 0.035);

    for (const zone of state.zones) {
      zone.life -= dt;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (vec.dist(zone.position, enemy.position) > zone.radius + enemy.radius) continue;
        this.applySlow(enemy, 0.25, zone.slow);
        this.damageEnemy(enemy, zone.dps * dt, false);
      }
    }
    state.zones = state.zones.filter((z) => z.life > 0);

    for (const beam of state.beams) beam.life -= dt;
    state.beams = state.beams.filter((b) => b.life > 0);
  }

  private damageEnemy(enemy: EnemyActor, damage: number, fx = true): void {
    if (!enemy.alive || damage <= 0) return;
    enemy.hp -= damage;
    if (fx) enemy.hitFlash = 0.12;
    if (enemy.hp > 0) return;
    enemy.alive = false;
    this.state.kills += 1;
    this.addUltCharge(0.08);
    if (fx) {
      this.cue("kill");
      this.shake(4);
    }
    this.onEnemyKilled(enemy);
  }

  private spawnWavePickups(): void {
    const available = WAVE_PICKUPS.filter(
      (pickup) => !pickup.minWave || this.state.waveIndex >= pickup.minWave,
    );
    const points = [
      vec.create(360, 300),
      vec.create(820, 1260),
      vec.create(1440, 230),
      vec.create(2040, 420),
      vec.create(2460, 1120),
      vec.create(720, 820),
      vec.create(1800, 1320),
      vec.create(2480, 260),
    ];
    const shuffledPoints = this.rng.shuffle(points);
    const shuffledPickups = this.rng.shuffle(available);
    const count = Math.min(2 + (this.state.waveIndex >= 5 ? 1 : 0), shuffledPickups.length);
    this.state.pickups = [];
    for (let i = 0; i < count; i++) {
      const anchor = shuffledPoints[i];
      const jitter = 90 + this.rng.next() * 90;
      const angle = this.rng.next() * Math.PI * 2;
      const position = vec.clampToRect(
        vec.create(anchor.x + Math.cos(angle) * jitter, anchor.y + Math.sin(angle) * jitter),
        WORLD.width,
        WORLD.height,
        28,
      );
      this.state.pickups.push({
        id: this.allocId(),
        defId: shuffledPickups[i].id,
        position,
      });
    }
  }

  private collectPickups(): void {
    const { state } = this;
    const collected = state.pickups.filter(
      (pickup) => vec.dist(pickup.position, state.player.position) <= state.player.radius + (state.artifacts.includes("magnet") ? 40 : 20),
    );
    if (collected.length === 0) return;
    for (const pickup of collected) {
      const def = pickupById(pickup.defId);
      if (!def) continue;
      if (def.modifiers) state.wavePickupIds.push(def.id);
      if (def.healFrac) state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * def.healFrac);
      if (def.fillUlt) state.ultCharge = 1;
      if (def.shieldHits) state.waveShield += def.shieldHits;
      if (def.vuln) state.waveVuln = Math.max(state.waveVuln, 1 + def.vuln);
      this.cue("pickup");
      this.spawnFx("burst", pickup.position, vec.create(), 0.22, 28, def.color);
    }
    state.pickups = state.pickups.filter((pickup) => !collected.some((item) => item.id === pickup.id));
    if (state.classId) this.rebuildStats();
  }

  private onEnemyKilled(enemy: EnemyActor): void {
    if (this.state.artifacts.includes("vampire_fang")) {
      this.state.artifactCounters.vampire_fang = (this.state.artifactCounters.vampire_fang ?? 0) + 1;
    }
    const goldValue = enemy.isBoss ? 10 : 1;
    this.state.gold += Math.max(1, Math.round(goldValue * this.state.stats.goldGain));
    const xpMultiplier = this.state.activePacts.reduce((total, id) => total * (pactById(id)?.reward.xpMultiplier ?? 1), 1);
    this.grantXp(this.state.stats.xpGain * xpMultiplier);
    if (this.state.activeBounty?.target === "kills") this.state.bountyProgress += 1;
    if (this.state.activeBounty?.target === "elite" && this.state.eliteWave) this.state.bountyProgress += 1;
    const split = ENEMIES[enemy.defId]?.splitOnDeath;
    if (!split) return;
    const def = ENEMIES[split.enemyId];
    if (!def) return;
    for (let i = 0; i < split.count; i++) {
      const child = this.makeEnemy(def.id);
      child.position = vec.add(enemy.position, vec.create((this.rng.next() - 0.5) * 30, (this.rng.next() - 0.5) * 30));
      this.state.enemies.push(child);
    }
  }

  grantXp(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const { state } = this;
    state.xp += amount;
    let overflow = 0;
    while (state.xp >= getXpRequiredForLevel(state.level)) {
      const required = getXpRequiredForLevel(state.level);
      state.xp -= required;
      state.level += 1;
      state.pendingLevelUps += 1;
      overflow += 1;
    }
    if (overflow > 0 && state.phase === "combat") {
      this.openLevelUpSelection();
    }
  }

  private openLevelUpSelection(): void {
    const { state } = this;
    if (state.phase !== "combat" || state.pendingLevelUps <= 0) return;
    state.rerollCharges = Math.max(state.rerollCharges, 1);
    state.boostOffers = this.rollOffers();
    state.phase = "boost";
    state.strategicPhase = "boost";
  }

  private pactEnemyDamageMultiplier(): number {
    return 1 + this.state.activePacts.reduce((total, id) => total + (pactById(id)?.modifiers.enemyDamage ?? 0), 0);
  }

  private mutatorMultiplier(key: keyof NonNullable<ReturnType<typeof getMutatorById>>["modifiers"]): number {
    return this.state.mutators.reduce((total, id) => total * (getMutatorById(id)?.modifiers[key] ?? 1), 1);
  }

  private recordRun(victory: boolean): void {
    this.profile.runsCompleted += 1;
    this.profile.bestWave = Math.max(this.profile.bestWave, this.state.waveIndex);
    this.profile.legacyShards += Math.max(0, Math.floor(this.state.evolutionShards / 3)) + (victory ? 2 : 0);
    this.profile.masteryXp = addMasteryXp(this.profile.masteryXp ?? 0, calculateMasteryXpGain(this.state.waveIndex, victory));
    const unlockedBoosts = UNLOCKS.filter((unlock) => unlock.kind === "boost" && (this.profile.masteryXp ?? 0) >= unlock.masteryXp).map((unlock) => unlock.id);
    this.profile.unlockedBoosts = [...new Set([...(this.profile.unlockedBoosts ?? []), ...unlockedBoosts])];
    const unlocked = [
      this.profile.runsCompleted >= 1 ? "first_run" : null,
      this.state.waveIndex >= 10 ? "wave_10" : null,
      this.state.level >= 10 ? "level_10" : null,
      victory ? "victory" : null,
      victory && this.state.challengeMode === "daily" ? "daily_clear" : null,
      victory && this.state.challengeMode === "weekly" ? "weekly_clear" : null,
    ];
    for (const id of unlocked) {
      if (id && !this.profile.achievements.includes(id)) this.profile.achievements.push(id);
    }
  }
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const ab = vec.sub(b, a);
  const len2 = vec.dot(ab, ab);
  if (len2 <= 1e-8) return vec.dist(p, a);
  const t = Math.min(1, Math.max(0, vec.dot(vec.sub(p, a), ab) / len2));
  return vec.dist(p, vec.add(a, vec.scale(ab, t)));
}
