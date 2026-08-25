import { classById, CLASSES, ultLevel } from "../core/content/classes";
import { getBuildSummary, getFutureWavePreviews, getWavePreview, getXpRequiredForLevel } from "../core/content/catalog";
import { buildDailyChallenge, buildWeeklyChallenge, getMutatorById } from "../core/content/mutators";
import { ACHIEVEMENTS } from "../core/content/achievements";
import { getUnlockedContentIds, MAX_MASTERY_XP, UNLOCKS } from "../core/content/unlocks";
import { addRunRecord, createRunRecord, getTopRuns, LEADERBOARD_STORAGE_KEY, parseLeaderboard, serializeLeaderboard } from "../core/content/leaderboard";
import { pickupById } from "../core/content/pickups";
import { artifactById, canFuseWithState, COMMITMENTS, FUSION_RECIPES, missingFusionIngredients, PACTS, TEMPORARY_EFFECTS } from "../core/content/strategic";
import { BOOSTS } from "../core/content/catalog";
import { ASCENSION_1, getUnlockedAscensionLevels } from "../core/content/ascension-modifiers";
import type { AscensionLevel } from "../core/types";
import { getBoostPanelCopy, Simulation } from "../core/Simulation";
import { CanvasView } from "./CanvasView";
import { InputAdapter } from "./InputAdapter";
import { Sfx } from "./Sfx";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const waveLabel = document.querySelector("#wave-label")!;
const killsLabel = document.querySelector("#kills-label")!;
const waveProgressLabel = document.querySelector("#wave-progress-label")!;
const waveProgressFill = document.querySelector<HTMLDivElement>("#wave-progress-fill")!;
const hpValue = document.querySelector("#hp-value")!;
const hpFill = document.querySelector<HTMLDivElement>("#hp-fill")!;
const hpGhost = document.querySelector<HTMLDivElement>("#hp-ghost")!;
const xpValue = document.querySelector("#xp-value")!;
const xpFill = document.querySelector<HTMLDivElement>("#xp-fill")!;
const levelLine = document.querySelector("#level-line")!;
const shieldLine = document.querySelector<HTMLDivElement>("#shield-line")!;
const shieldValue = document.querySelector("#shield-value")!;
const classLine = document.querySelector("#class-line")!;
const combatStatus = document.querySelector("#combat-status")!;
const goldValue = document.querySelector("#gold-value")!;
const shardValue = document.querySelector("#shard-value")!;
const masteryValue = document.querySelector("#mastery-value")!;
const rerollValue = document.querySelector("#reroll-value")!;
const seedValue = document.querySelector("#seed-value")!;
const bountyLine = document.querySelector<HTMLDivElement>("#bounty-line")!;
const bountyResult = document.querySelector<HTMLDivElement>("#bounty-result")!;
const ultFill = document.querySelector<HTMLDivElement>("#ult-fill")!;
const ultHint = document.querySelector("#ult-hint")!;
const buildPanel = document.querySelector<HTMLDetailsElement>("#build-panel")!;
const buildSummary = document.querySelector("#build-summary")!;
const buildTags = document.querySelector<HTMLDivElement>("#build-tags")!;
const artifactPanel = document.querySelector<HTMLDivElement>("#artifact-panel")!;
const artifactCount = document.querySelector<HTMLSpanElement>("#artifact-count")!;
const artifactList = document.querySelector<HTMLDivElement>("#artifact-list")!;
const effectPanel = document.querySelector<HTMLDetailsElement>("#effect-panel")!;
const effectSummary = document.querySelector("#effect-summary")!;
const effectList = document.querySelector<HTMLDivElement>("#effect-list")!;
const riskPanel = document.querySelector<HTMLDetailsElement>("#risk-panel")!;
const riskList = document.querySelector<HTMLDivElement>("#risk-list")!;
const challengePanel = document.querySelector<HTMLDetailsElement>("#challenge-panel")!;
const challengeSummary = document.querySelector("#challenge-summary")!;
const challengeList = document.querySelector<HTMLDivElement>("#challenge-list")!;
const achievementSummary = document.querySelector("#achievement-summary")!;
const achievementList = document.querySelector<HTMLDivElement>("#achievement-list")!;
const pickupList = document.querySelector<HTMLDivElement>("#pickup-list")!;
const classOverlay = document.querySelector("#class-overlay")!;
const classCards = document.querySelector("#class-cards")!;
const boostOverlay = document.querySelector("#boost-overlay")!;
const boostTitle = document.querySelector("#boost-title");
const boostDescription = document.querySelector("#boost-description");
const boostCards = document.querySelector("#boost-cards")!;
const upgradeManagement = document.querySelector<HTMLDivElement>("#upgrade-management")!;
const fusionManagement = document.querySelector<HTMLDivElement>("#fusion-management")!;
const commitmentActions = document.querySelector<HTMLDivElement>("#commitment-actions")!;
const temporaryActions = document.querySelector<HTMLDivElement>("#temporary-actions")!;
const routeOverlay = document.querySelector("#route-overlay")!;
const routeCards = document.querySelector<HTMLDivElement>("#route-cards")!;
const pactActions = document.querySelector<HTMLDivElement>("#pact-actions")!;
const bossOverlay = document.querySelector("#boss-overlay")!;
const bossCards = document.querySelector<HTMLDivElement>("#boss-cards")!;
const eventOverlay = document.querySelector("#event-overlay")!;
const eventTitle = document.querySelector("#event-title")!;
const eventDescription = document.querySelector("#event-description")!;
const eventCards = document.querySelector<HTMLDivElement>("#event-cards")!;
const shopOverlay = document.querySelector("#shop-overlay")!;
const shopCards = document.querySelector<HTMLDivElement>("#shop-cards")!;
const shopBalance = document.querySelector("#shop-balance")!;
const leaveShop = document.querySelector<HTMLButtonElement>("#leave-shop")!;
const waveBrief = document.querySelector("#wave-brief");
const waveThreats = document.querySelector<HTMLDivElement>("#wave-threats");
const futureThreats = document.querySelector<HTMLDivElement>("#future-threats");
const rerollCount = document.querySelector("#reroll-count")!;
const rerollBtn = document.querySelector<HTMLButtonElement>("#reroll-btn")!;
const endOverlay = document.querySelector("#end-overlay")!;
const endTitle = document.querySelector("#end-title")!;
const endBody = document.querySelector("#end-body")!;
const leaderboardList = document.querySelector<HTMLOListElement>("#leaderboard-list")!;
const restartBtn = document.querySelector("#restart-btn")!;
const dailyChallengeBtn = document.querySelector<HTMLButtonElement>("#daily-challenge-btn")!;
const weeklyChallengeBtn = document.querySelector<HTMLButtonElement>("#weekly-challenge-btn")!;
const ascensionButtons = document.querySelector<HTMLDivElement>("#ascension-buttons")!;
const ascensionProgress = document.querySelector<HTMLParagraphElement>("#ascension-progress")!;

function boostIcon(boost: (typeof BOOSTS)[number]): string {
  const icons: Record<string, string> = { attack: "A", defense: "D", control: "C", economy: "E", weapon: "W", body: "B", tactic: "T", ult: "U" };
  return icons[boost.category] ?? "+";
}

function boostCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    attack: "Saldırı",
    defense: "Savunma",
    control: "Kontrol",
    economy: "Ekonomi",
    weapon: "Silah",
    body: "Gövde",
    tactic: "Taktik",
    ult: "Ulti",
  };
  return labels[category] ?? "Upgrade";
}

function statLabel(stat: string): string {
  const labels: Record<string, string> = {
    projectileDamage: "Projectile Damage",
    fireRate: "Attack Speed",
    projectileSpeed: "Projectile Speed",
    projectilePierce: "Pierce",
    projectileCount: "Projectiles",
    maxHp: "Max HP",
    critChance: "Crit Chance",
    critMultiplier: "Crit Damage",
    slowDuration: "Slow Duration",
    explosionRadius: "Explosion Radius",
    moveSpeed: "Move Speed",
    lifesteal: "Lifesteal",
    rerollCharges: "Rerolls",
  };
  return labels[stat] ?? stat;
}

function boostImpact(boost: (typeof BOOSTS)[number]): string {
  const entries = Object.entries(boost.modifiers.mul ?? {}).map(([key, value]) => `${statLabel(key)} ${Number(value) >= 1 ? `+${Math.round((Number(value) - 1) * 100)}%` : `${Math.round((Number(value) - 1) * 100)}%`}`);
  const additions = Object.entries(boost.modifiers.add ?? {}).map(([key, value]) => `${statLabel(key)} ${Number(value) >= 0 ? "+" : ""}${value}`);
  return [...entries, ...additions].slice(0, 2).join(" · ") || "Build etkisi";
}

const sessionSeed = Date.now() >>> 0;
let sim = new Simulation({ seed: sessionSeed, maxWaves: 12 });
let selectedAscensionLevel: AscensionLevel = 0;
let lastAscensionRenderKey = "";
const savedProfile = localStorage.getItem("wave-arena-profile");
if (savedProfile) sim.loadProfile(savedProfile);
const view = new CanvasView(canvas);
const input = new InputAdapter(canvas);
const sfx = new Sfx();
window.addEventListener("pointerdown", () => sfx.unlock(), { once: true });

function updateChallengeButtons(): void {
  const dailyActive = sim.state.challengeMode === "daily";
  const weeklyActive = sim.state.challengeMode === "weekly";
  dailyChallengeBtn.classList.toggle("active-run-mode", dailyActive);
  dailyChallengeBtn.setAttribute("aria-pressed", String(dailyActive));
  dailyChallengeBtn.textContent = dailyActive ? "Günlük challenge aktif · Kapat" : "Günlük challenge başlat";
  weeklyChallengeBtn.classList.toggle("active-run-mode", weeklyActive);
  weeklyChallengeBtn.setAttribute("aria-pressed", String(weeklyActive));
  weeklyChallengeBtn.textContent = weeklyActive ? "Haftalık challenge aktif · Kapat" : "Haftalık challenge başlat";
}

function replaceRun(next: Simulation): void {
  const profile = sim.saveProfile();
  sim = next;
  sim.loadProfile(profile);
  lastBoostKey = "";
  lastEndPhase = "";
  lastAscensionRenderKey = "";
  updateChallengeButtons();
}

function renderAscensionOptions(): void {
  const renderKey = `${sim.profile.bestWave}:${selectedAscensionLevel}`;
  if (renderKey === lastAscensionRenderKey) return;
  lastAscensionRenderKey = renderKey;
  const unlockedLevels = getUnlockedAscensionLevels(sim.profile.bestWave);
  ascensionProgress.textContent = unlockedLevels.includes(1)
    ? `En iyi dalga: ${sim.profile.bestWave} · Ascension 1 açıldı`
    : `En iyi dalga: ${sim.profile.bestWave} · Ascension 1 için Wave 8 gerekli`;
  ascensionButtons.replaceChildren();

  const normal = document.createElement("button");
  normal.type = "button";
  normal.className = selectedAscensionLevel === 0 ? "active-run-mode" : "";
  normal.setAttribute("aria-pressed", String(selectedAscensionLevel === 0));
  normal.textContent = "Normal run";
  normal.addEventListener("click", () => {
    selectedAscensionLevel = 0;
    renderAscensionOptions();
  });
  ascensionButtons.append(normal);

  const ascension = document.createElement("button");
  ascension.type = "button";
  ascension.disabled = !unlockedLevels.includes(1);
  ascension.className = selectedAscensionLevel === 1 ? "active-run-mode" : "";
  ascension.setAttribute("aria-pressed", String(selectedAscensionLevel === 1));
  ascension.textContent = ascension.disabled
    ? `Ascension 1 · Wave ${8} gerekli`
    : `Ascension 1 · ${ASCENSION_1.effects.join(" · ")}`;
  ascension.title = ASCENSION_1.description;
  ascension.addEventListener("click", () => {
    selectedAscensionLevel = 1;
    renderAscensionOptions();
  });
  ascensionButtons.append(ascension);
}

function saveAndRenderLeaderboard(): void {
  if (!sim.state.classId) return;
  const record = createRunRecord({
    waveIndex: sim.state.waveIndex,
    kills: sim.state.kills,
    seed: sim.getSeed(),
    classId: sim.state.classId,
    ascensionLevel: sim.state.activeAscensionLevel,
    challengeMode: sim.state.challengeMode,
    victory: sim.state.phase === "victory",
  });
  const runs = addRunRecord(parseLeaderboard(localStorage.getItem(LEADERBOARD_STORAGE_KEY)), record);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, serializeLeaderboard(runs));
  leaderboardList.replaceChildren();
  for (const [index, run] of getTopRuns(runs, sim.state.classId, sim.state.activeAscensionLevel).entries()) {
    const item = document.createElement("li");
    item.textContent = `#${index + 1} · Wave ${run.waveIndex} · ${run.kills} kill · Seed ${run.seed}${run.victory ? " · Victory" : ""}`;
    leaderboardList.append(item);
  }
}

function startSelectedRun(classId: Parameters<Simulation["selectClass"]>[0]): void {
  const config = sim.config;
  const next = new Simulation({
    seed: sim.getSeed(),
    maxWaves: config.maxWaves,
    mutators: config.mutators,
    runModifiers: config.runModifiers,
    dailyChallenge: config.dailyChallenge,
    ascensionLevel: selectedAscensionLevel,
  });
  replaceRun(next);
  sim.selectClass(classId);
  selectedAscensionLevel = 0;
}

function toggleChallenge(mode: "daily" | "weekly"): void {
  if (sim.state.phase !== "class_select") return;
  if (sim.state.challengeMode === mode) {
    replaceRun(new Simulation({ seed: 42, maxWaves: 12 }));
    return;
  }
  const dateKey = new Date().toISOString().slice(0, 10);
  if (mode === "daily") {
    const challenge = buildDailyChallenge(dateKey);
    replaceRun(new Simulation({ seed: challenge.seed, maxWaves: 30, mutators: challenge.mutators, dailyChallenge: challenge }));
  } else {
    const challenge = buildWeeklyChallenge(dateKey);
    replaceRun(new Simulation({ seed: challenge.seed, maxWaves: 40, mutators: challenge.mutators, dailyChallenge: challenge }));
  }
}

for (const cls of CLASSES) {
  const button = document.createElement("button");
  button.className = "boost-card class-card";
  button.type = "button";
  button.style.borderColor = cls.color;
  button.innerHTML = `<span class="rarity" style="color:${cls.color}">${cls.role}</span><h3>${cls.name}</h3><p>${cls.description}</p><p class="ult-blurb"><strong>${cls.passive.name}</strong> — ${cls.passive.description}</p><p class="ult-blurb"><strong>${cls.ultName}</strong> — ${cls.ultBlurb}</p>`;
  button.addEventListener("click", () => startSelectedRun(cls.id));
  classCards.append(button);
}

let last = performance.now();
let lastBoostKey = "";
let lastEndPhase = "";
let lastHpRatio = 1;
let hpGhostTimer: number | undefined;

function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  input.sync(sim.state);
  sim.tick(dt, input.snapshot());
  input.sync(sim.state);
  for (const cue of sim.state.cues) sfx.play(cue.kind);
  view.draw(sim.state);
  syncHud();
  requestAnimationFrame(frame);
}

function syncHud(): void {
  const { state } = sim;
  const boostCopy = getBoostPanelCopy(state);
  if (boostTitle) boostTitle.textContent = boostCopy.title;
  if (boostDescription) boostDescription.textContent = boostCopy.description;
  updateChallengeButtons();
  if (state.phase === "class_select") renderAscensionOptions();
  if (state.lastBountyResult) {
    const { bounty, success } = state.lastBountyResult;
    const reward = !success
      ? "Ödül yok"
      : [
        bounty.reward.gold ? `+${bounty.reward.gold} Gold` : "",
        bounty.reward.rerollTokens ? `+${bounty.reward.rerollTokens} Reroll` : "",
        bounty.reward.evolutionShards ? `+${bounty.reward.evolutionShards} Shard` : "",
      ].filter(Boolean).join(" · ");
    bountyResult.className = `bounty-result ${success ? "success" : "failed"}`;
    bountyResult.textContent = success
      ? `Bounty başarılı · ${bounty.name} · ${reward || "Tamamlandı"}`
      : `Bounty başarısız · ${bounty.name} · ${reward}`;
  } else {
    bountyResult.className = "hidden";
  }
  waveLabel.textContent = state.waveIndex > 0 ? `Dalga ${state.waveIndex}` : "Hazırlık";
  killsLabel.textContent = `${state.kills} öldürme`;
  combatStatus.textContent = state.eliteWave ? "ELITE WAVE · YÜKSEK RİSK" : state.phase === "combat" ? "COMBAT · TEHDİT ANALİZİ" : "RUN CONTROL";
  combatStatus.classList.toggle("elite-status", state.eliteWave);
  const wave = state.waveIndex > 0 ? sim.waves[state.waveIndex - 1] : undefined;
  const waveTotal = wave?.groups.reduce((total, group) => total + group.count, 0) ?? 0;
  const waveRemaining = state.remainingToSpawn + state.enemies.length;
  const waveProgress = waveTotal > 0 ? Math.min(1, Math.max(0, 1 - waveRemaining / waveTotal)) : 0;
  waveProgressLabel.textContent = `${Math.max(0, waveTotal - waveRemaining)} / ${waveTotal}`;
  waveProgressFill.style.width = `${waveProgress * 100}%`;
  const xpRequired = Math.max(1, sim.state.level > 0 ? Math.max(100, getXpRequiredForLevel(state.level)) : 100);
  const xpRatio = Math.min(1, Math.max(0, state.xp / xpRequired));
  xpValue.textContent = `${Math.floor(state.xp)} / ${xpRequired}`;
  xpFill.style.width = `${xpRatio * 100}%`;
  levelLine.textContent = `Level ${state.level}`;
  seedValue.textContent = `${sim.getSeed()}`;
  const hp = state.player.maxHp <= 0 ? 0 : state.player.hp / state.player.maxHp;
  hpValue.textContent = `${Math.ceil(Math.max(0, state.player.hp))} / ${Math.ceil(state.player.maxHp)}`;
  if (hp < lastHpRatio) {
    hpGhost.style.width = `${lastHpRatio * 100}%`;
    if (hpGhostTimer) window.clearTimeout(hpGhostTimer);
    hpGhostTimer = window.setTimeout(() => {
      hpGhost.style.width = `${hp * 100}%`;
    }, 260);
  } else {
    hpGhost.style.width = `${hp * 100}%`;
  }
  lastHpRatio = hp;
  hpFill.style.width = `${Math.max(0, hp) * 100}%`;
  hpFill.parentElement?.classList.toggle("critical", hp > 0 && hp <= 0.3);
  shieldValue.textContent = `${state.waveShield}`;
  shieldLine.classList.toggle("hidden", state.waveShield <= 0);

  if (state.classId) {
    const cls = classById(state.classId);
    const level = ultLevel(state.waveIndex, state.ultBonusLevel);
    classLine.textContent = `${cls.name} · ${cls.ultName} Sv.${level}`;
    goldValue.textContent = `${state.gold}`;
    shardValue.textContent = `${state.evolutionShards}`;
    masteryValue.textContent = `${Math.floor(sim.profile.masteryXp ?? 0)} / ${MAX_MASTERY_XP}`;
    rerollValue.textContent = `${state.rerollCharges + state.rerollTokens}`;
    if (state.activeBounty) {
      bountyLine.textContent = `Bounty: ${state.activeBounty.name} · ${state.bountyProgress}${state.activeBounty.amount ? `/${state.activeBounty.amount}` : ""}`;
      bountyLine.classList.remove("hidden");
    } else {
      bountyLine.classList.add("hidden");
    }
    ultFill.style.width = `${state.ultCharge * 100}%`;
    ultFill.style.background = cls.color;
    if (state.ultCooldown > 0) {
      ultHint.textContent = `Ulti beklemede ${state.ultCooldown.toFixed(1)}s`;
    } else if (state.ultCharge >= 1) {
      ultHint.textContent = "Q / sağ tık — ulti hazır";
    } else {
      ultHint.textContent = `Ulti şarj ${Math.round(state.ultCharge * 100)}%`;
    }
  } else {
    classLine.textContent = "Sınıf seç";
    goldValue.textContent = "0";
    shardValue.textContent = "0";
    masteryValue.textContent = `${Math.floor(sim.profile.masteryXp ?? 0)} / ${MAX_MASTERY_XP}`;
    rerollValue.textContent = "0";
    bountyLine.classList.add("hidden");
    ultFill.style.width = "0%";
    ultHint.textContent = "Ulti sınıfa göre oluşur";
  }

  const build = getBuildSummary(state.appliedBoostIds);
  buildTags.replaceChildren();
  for (const item of build.progress.filter((progress) => progress.current > 0)) {
    const tag = document.createElement("span");
    tag.className = `build-tag${item.complete ? " complete" : ""}`;
    tag.textContent = `${item.label} ${item.current}/${item.threshold}`;
    buildTags.append(tag);
  }
  for (const artifactId of state.artifacts) {
    const tag = document.createElement("span");
    tag.className = "build-tag complete";
    tag.textContent = `Artifact: ${artifactId}`;
    buildTags.append(tag);
  }
  buildSummary.innerHTML = `Build <span>${state.appliedBoostIds.length > 0 ? `${state.appliedBoostIds.length} ACTIVE` : "VIEW"}</span>`;
  buildPanel.classList.toggle("hidden", buildTags.childElementCount === 0);

  artifactList.replaceChildren();
  artifactCount.textContent = `${state.artifacts.length}/${state.artifactSlots}`;
  for (const artifactId of state.artifacts) {
    const artifact = artifactById(artifactId);
    if (!artifact) continue;
    const item = document.createElement("div");
    item.className = "artifact-item";
    item.title = artifact.description;
    item.innerHTML = `<strong>${artifact.name}</strong><span>${artifact.description}</span>`;
    artifactList.append(item);
  }
  artifactPanel.classList.toggle("hidden", state.artifacts.length === 0);

  effectList.replaceChildren();
  for (const effect of state.activeTemporaryEffects) {
    const item = document.createElement("div");
    item.className = "effect-item";
    item.textContent = `${effect.name} · ${effect.remainingWaves} wave`;
    effectList.append(item);
  }
  effectSummary.innerHTML = `Active Effects <span>${state.activeTemporaryEffects.length}</span>`;
  effectPanel.classList.toggle("hidden", state.activeTemporaryEffects.length === 0);
  if (state.activeTemporaryEffects.length > 0) effectPanel.open = true;

  riskList.replaceChildren();
  for (const curse of state.curses) {
    const item = document.createElement("div");
    item.className = "risk-item";
    item.textContent = `CURSE · ${curse}`;
    riskList.append(item);
  }
  for (const pact of state.activePacts) {
    const item = document.createElement("div");
    item.className = "risk-item pact-item";
    item.textContent = `PACT · ${pact}`;
    riskList.append(item);
  }
  riskPanel.classList.toggle("hidden", riskList.childElementCount === 0);

  challengeList.replaceChildren();
  if (state.challenge) {
    challengeSummary.innerHTML = `${state.challenge.mode === "weekly" ? "Weekly" : "Daily"} Challenge <span>${state.challenge.date}</span>`;
    const mode = document.createElement("div");
    mode.className = "challenge-mode-label";
    mode.textContent = `${state.challenge.character} · Goal: ${state.challenge.goal}`;
    challengeList.append(mode);
    for (const mutatorId of state.mutators) {
      const mutator = getMutatorById(mutatorId);
      const item = document.createElement("div");
      item.className = "challenge-item";
      item.textContent = mutator ? `${mutator.name} · ${mutator.description}` : mutatorId;
      challengeList.append(item);
    }
    challengePanel.classList.remove("hidden");
  } else {
    challengePanel.classList.add("hidden");
  }

  achievementList.replaceChildren();
  for (const achievement of ACHIEVEMENTS) {
    const item = document.createElement("div");
    const unlocked = sim.profile.achievements.includes(achievement.id);
    item.className = `achievement-item${unlocked ? " unlocked" : " locked"}`;
    item.textContent = `${unlocked ? "UNLOCKED" : "LOCKED"} · ${achievement.name} · ${achievement.description}`;
    achievementList.append(item);
  }
  achievementSummary.innerHTML = `Achievements <span>${sim.profile.achievements.length}/${ACHIEVEMENTS.length}</span>`;

  pickupList.replaceChildren();
  for (const pickupId of state.wavePickupIds) {
    const pickup = pickupById(pickupId);
    if (!pickup) continue;
    const item = document.createElement("div");
    item.className = "active-pickup";
    item.title = pickup.description;
    const icon = document.createElement("span");
    icon.className = "active-pickup-icon";
    icon.style.backgroundColor = pickup.color;
    icon.textContent = pickup.name.slice(0, 1);
    const name = document.createElement("span");
    name.textContent = pickup.name;
    const description = document.createElement("span");
    description.className = "pickup-description";
    description.textContent = pickup.description;
    item.role = "button";
    item.tabIndex = 0;
    item.setAttribute("aria-expanded", "false");
    const togglePickupDetails = () => {
      const expanded = item.classList.toggle("expanded");
      item.setAttribute("aria-expanded", String(expanded));
    };
    item.addEventListener("click", togglePickupDetails);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePickupDetails();
      }
    });
    item.append(icon, name, description);
    pickupList.append(item);
  }
  pickupList.classList.toggle("hidden", state.wavePickupIds.length === 0);

  classOverlay.classList.toggle("hidden", state.phase !== "class_select");

  if (state.phase === "boost") {
    const key = `${state.waveIndex}:${state.rerollCharges}:${state.gold}:${state.evolutionShards}:${state.sacrificesUsed}:${state.committedBuild}:${state.appliedBoostIds.join("|")}:${state.activeTemporaryEffects.map((effect) => effect.id).join("|")}:${state.boostOffers.map((b) => b.id).join("|")}`;
    if (key !== lastBoostKey) {
      lastBoostKey = key;
      boostCards.replaceChildren();
      const preview = getWavePreview(state.waveIndex + 1);
      if (waveBrief) waveBrief.textContent = preview.summary;
      if (waveThreats) {
        waveThreats.replaceChildren();
        for (const threat of preview.threats) {
          const badge = document.createElement("span");
          badge.className = "threat-badge";
          badge.textContent = threat;
          waveThreats.append(badge);
        }
      }
      if (futureThreats) {
        futureThreats.replaceChildren();
        for (const future of getFutureWavePreviews(state.waveIndex + 1)) {
          const item = document.createElement("div");
          item.className = "future-threat";
          item.textContent = `Dalga ${future.waveIndex}: ${future.threats.join(" · ")}`;
          futureThreats.append(item);
        }
      }
      for (const boost of state.boostOffers) {
        const button = document.createElement("button");
        button.className = `boost-card rarity-${boost.rarity}`;
        button.type = "button";
        const rarityLabel =
          boost.rarity === "epic" ? "Epik" : boost.rarity === "rare" ? "Nadir" : "Yaygın";
        const catLabel = boostCategoryLabel(boost.category);
        const synergy = boost.synergyTags?.length
          ? `<span class="card-meta">Synergy: ${boost.synergyTags.map((tag) => tag.replaceAll("-", " ")).join(" · ")}</span>`
          : "";
        const risk = boost.risk
          ? `<span class="risk-line">${boost.risk.label}: ${boost.risk.summary}</span>`
          : "";
        const nextSummary = getBuildSummary([...state.appliedBoostIds, boost.id]);
        const evolution = boost.evolution
          ? nextSummary.progress.find((item) => item.id === boost.evolution)
          : undefined;
        const evolutionLine = evolution ? `<span class="card-meta evolution-meta">Evolution ${evolution.label}: ${evolution.current}/${evolution.threshold}</span>` : "";
        button.innerHTML = `<span class="card-topline"><span class="boost-icon" title="${boostIcon(boost)} = ${catLabel}" aria-label="${boostIcon(boost)} = ${catLabel}">${boostIcon(boost)}</span><span class="rarity">${rarityLabel} · ${catLabel}</span></span><h3>${boost.name}</h3><p>${boost.description}</p><span class="impact-line">${boostImpact(boost)}</span>${synergy}${evolutionLine}${risk}`;
        button.addEventListener("click", () => sim.selectBoost(boost.id));
        boostCards.append(button);
      }
      upgradeManagement.replaceChildren();
      const appliedLabel = document.createElement("div");
      appliedLabel.className = "management-label";
      appliedLabel.textContent = `Applied upgrades · ${state.appliedBoostIds.length}`;
      upgradeManagement.append(appliedLabel);
      for (const boostId of [...new Set(state.appliedBoostIds)]) {
        const boost = BOOSTS.find((candidate) => candidate.id === boostId);
        if (!boost) continue;
        const row = document.createElement("div");
        row.className = "management-row";
        const name = document.createElement("span");
        name.textContent = `${boost.name} x${state.appliedBoostIds.filter((id) => id === boostId).length}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove · 25G";
        remove.disabled = state.gold < 25;
        remove.addEventListener("click", () => sim.removeUpgrade(boostId));
        const sacrifice = document.createElement("button");
        sacrifice.type = "button";
        sacrifice.textContent = "Sacrifice · +1 Shard";
        sacrifice.disabled = state.sacrificesUsed >= 2;
        sacrifice.addEventListener("click", () => sim.sacrificeUpgrade(boostId));
        row.append(name, remove, sacrifice);
        upgradeManagement.append(row);
      }
      fusionManagement.replaceChildren();
      const fusionLabel = document.createElement("div");
      fusionLabel.className = "management-label";
      fusionLabel.textContent = `Fusion · ${state.evolutionShards} Shard`;
      fusionManagement.append(fusionLabel);
      for (const recipe of FUSION_RECIPES) {
        const row = document.createElement("div");
        row.className = "management-row fusion-row";
        const info = document.createElement("div");
        info.className = "fusion-info";
        const recipeText = document.createElement("div");
        recipeText.className = "fusion-recipe";
        const statusText = document.createElement("div");
        const missing = missingFusionIngredients(state.appliedBoostIds, recipe);
        const readiness = canFuseWithState(state.appliedBoostIds, recipe, state.evolutionShards, state.artifacts, state.artifactSlots);
        const tradeoffText = `Tradeoff: burns ${Math.max(6, Math.round(state.player.maxHp * 0.08))} HP`;
        const missingSummary = missing.length > 0
          ? `Need: ${missing.join(" + ")}`
          : "Ready";
        const extraState = !readiness && missing.length === 0
          ? (recipe.resultArtifactId && state.artifacts.length >= state.artifactSlots ? "Artifact slots full" : "Not enough shards")
          : "";

        recipeText.textContent = `${recipe.ingredients.join(" + ")} → ${recipe.resultArtifactId ?? recipe.resultBoostId} · ${recipe.cost.evolutionShards}S`;
        statusText.className = `fusion-note ${readiness ? "ready" : missing.length > 0 ? "missing" : "blocked"}`;
        statusText.textContent = readiness ? `${tradeoffText} · Stack` : extraState ? `${extraState} · ${tradeoffText}` : `${missingSummary} · ${tradeoffText}`;

        info.append(recipeText, statusText);
        const fuse = document.createElement("button");
        fuse.type = "button";
        fuse.className = "fusion-action";
        fuse.textContent = readiness ? "Fuse" : "Need";
        fuse.disabled = !readiness;
        fuse.setAttribute("title", readiness ? "Fuse this recipe" : missing.length > 0 ? `Missing ingredients: ${missing.join(", ")}` : `Insufficient shards or artifact slots`);
        fuse.addEventListener("click", () => sim.fuse(recipe.id));
        row.append(info, fuse);
        fusionManagement.append(row);
      }
      commitmentActions.replaceChildren();
      if (!state.committedBuild) {
        const label = document.createElement("p");
        label.textContent = "Bir build seçersen uyumlu kartlar daha sık gelir; seçim geri alınamaz.";
        commitmentActions.append(label);
        for (const [id, commitment] of Object.entries(COMMITMENTS)) {
          const button = document.createElement("button");
          button.className = "commitment-button";
          button.type = "button";
          button.textContent = `Commit: ${commitment.label}`;
          button.addEventListener("click", () => sim.commitToBuild(id));
          commitmentActions.append(button);
        }
      } else {
        const committed = document.createElement("span");
        committed.className = "card-meta";
        committed.textContent = `Committed build: ${state.committedBuild}`;
        commitmentActions.append(committed);
      }
      temporaryActions.replaceChildren();
      const temporaryLabel = document.createElement("span");
      temporaryLabel.className = "temporary-label";
      temporaryLabel.textContent = "TIMING BONUS · Choose one before the next wave";
      temporaryActions.append(temporaryLabel);
      for (const effect of TEMPORARY_EFFECTS) {
        const button = document.createElement("button");
        button.className = "commitment-button";
        button.type = "button";
        const active = state.activeTemporaryEffects.some((activeEffect) => activeEffect.id === effect.id);
        const blocked = state.activeTemporaryEffects.length > 0 && !active;
        button.classList.toggle("active-temporary", active);
        button.classList.toggle("blocked-temporary", blocked);
        button.disabled = active || blocked;
        button.textContent = active ? `${effect.name} · ACTIVE` : blocked ? `${effect.name} · LOCKED` : `${effect.name} · ${effect.durationWaves}W`;
        button.title = effect.description;
        button.addEventListener("click", () => sim.activateTemporaryEffect(effect.id));
        temporaryActions.append(button);
      }
    }
    rerollCount.textContent = `Yeniden çekim: ${state.rerollCharges + state.rerollTokens}`;
    rerollBtn.disabled = state.rerollCharges + state.rerollTokens <= 0;
    boostOverlay.classList.remove("hidden");
  } else {
    lastBoostKey = "";
    rerollBtn.disabled = true;
    boostOverlay.classList.add("hidden");
  }

  if (state.phase === "route") {
    const key = `${state.activePacts.join("|")}:${state.routeOptions.map((node) => node.id).join("|")}`;
    if (routeCards.dataset.key !== key) {
      routeCards.dataset.key = key;
      routeCards.replaceChildren();
      for (const node of state.routeOptions) {
        const button = document.createElement("button");
        button.className = "boost-card";
        button.type = "button";
        button.classList.add(node.risk >= 3 ? "risk-high" : node.risk === 0 ? "risk-low" : "risk-mid");
        button.innerHTML = `<span class="rarity">Dalga ${node.waveIndex} · Risk ${node.risk}/4</span><h3>${node.label}</h3><p>${node.description}</p><span class="card-meta">Ödül: ${node.reward}</span>`;
        button.addEventListener("click", () => sim.selectRoute(node.id));
        routeCards.append(button);
      }
    }
    if (pactActions.dataset.key !== key) {
      pactActions.dataset.key = key;
      pactActions.replaceChildren();
      const pactStatus = document.createElement("div");
      pactStatus.className = state.activePacts.length > 0 ? "pact-status is-active" : "pact-status";
      if (state.activePacts.length === 0) {
        pactStatus.innerHTML = `<strong>PACT NOT ACTIVE</strong><span>Optional risk: choose one for an extra reward, or continue safely.</span>`;
        pactActions.append(pactStatus);
        for (const pact of PACTS) {
          const button = document.createElement("button");
          button.className = "commitment-button pact-option";
          button.type = "button";
          button.innerHTML = `<strong>Activate Pact</strong><small>${pact.name} · ${pact.description}</small>`;
          button.title = pact.description;
          button.addEventListener("click", () => {
            if (sim.choosePact(pact.id)) syncHud();
          });
          pactActions.append(button);
        }
      } else {
        const active = PACTS.find((pact) => pact.id === state.activePacts[0]);
        pactStatus.innerHTML = `<strong>PACT ACTIVE · ${active?.name ?? state.activePacts[0]}</strong><span>${active?.description ?? "Risk modifier active for the next waves."}</span>`;
        pactActions.append(pactStatus);
      }
    }
    routeOverlay.classList.remove("hidden");
  } else {
    routeCards.dataset.key = "";
    pactActions.dataset.key = "";
    routeOverlay.classList.add("hidden");
  }

  if (state.phase === "boss_reward") {
    const key = state.bossRewardOffers.map((reward) => reward.id).join("|");
    if (bossCards.dataset.key !== key) {
      bossCards.dataset.key = key;
      bossCards.replaceChildren();
      for (const reward of state.bossRewardOffers) {
        const button = document.createElement("button");
        button.className = "boost-card rarity-legendary";
        button.type = "button";
        button.innerHTML = `<span class="rarity">Boss Core</span><h3>${reward.name}</h3><p>${reward.description}</p>`;
        button.addEventListener("click", () => sim.selectBossReward(reward.id));
        bossCards.append(button);
      }
    }
    bossOverlay.classList.remove("hidden");
  } else {
    bossCards.dataset.key = "";
    bossOverlay.classList.add("hidden");
  }

  if (state.phase === "event" && state.activeEvent) {
    const key = `${state.activeEvent.id}:${state.activeEvent.choices.map((choice) => choice.id).join("|")}`;
    if (eventCards.dataset.key !== key) {
      eventCards.dataset.key = key;
      eventTitle.textContent = state.activeEvent.name;
      eventDescription.textContent = state.activeEvent.description;
      eventCards.replaceChildren();
      for (const choice of state.activeEvent.choices) {
        const button = document.createElement("button");
        button.className = "boost-card";
        button.type = "button";
        button.innerHTML = `<h3>${choice.label}</h3><p>${choice.description}</p>`;
        button.addEventListener("click", () => sim.selectEventChoice(choice.id));
        eventCards.append(button);
      }
    }
    eventOverlay.classList.remove("hidden");
  } else {
    eventCards.dataset.key = "";
    eventOverlay.classList.add("hidden");
  }

  if (state.phase === "shop") {
    shopBalance.textContent = `· ${state.gold} Gold · ${state.rerollTokens} Reroll`;
    const key = `${state.gold}:${state.shopItems.map((item) => item.id).join("|")}`;
    if (shopCards.dataset.key !== key) {
      shopCards.dataset.key = key;
      shopCards.replaceChildren();
      for (const item of state.shopItems) {
        const button = document.createElement("button");
        button.className = "boost-card";
        button.type = "button";
        button.disabled = state.gold < item.price;
        button.title = state.gold < item.price ? `Not enough Gold · Need ${item.price}` : `Buy for ${item.price} Gold`;
        button.innerHTML = `<span class="rarity">${item.price} Gold</span><h3>${item.name}</h3><p>${item.description}</p>`;
        button.addEventListener("click", () => sim.buyShopItem(item.id));
        shopCards.append(button);
      }
    }
    shopOverlay.classList.remove("hidden");
  } else {
    shopCards.dataset.key = "";
    shopOverlay.classList.add("hidden");
  }

  leaveShop.onclick = () => sim.leaveShop();

  if (state.phase === "defeat" || state.phase === "victory") {
    if (lastEndPhase !== state.phase) {
      lastEndPhase = state.phase;
      localStorage.setItem("wave-arena-profile", sim.saveProfile());
      saveAndRenderLeaderboard();
      endTitle.textContent = state.phase === "victory" ? "Kazandın" : "Kaybettin";
      const clsName = state.classId ? classById(state.classId).name : "-";
      const unlockedNames = getUnlockedContentIds(sim.profile)
        .map((id) => UNLOCKS.find((unlock) => unlock.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const unlockText = unlockedNames.length > 0 ? ` · Açılanlar: ${unlockedNames.join(", ")}` : "";
      endBody.textContent = `${clsName} · Dalga ${state.waveIndex} · En iyi dalga ${sim.profile.bestWave} · ${state.kills} öldürme · ulti sv.${ultLevel(state.waveIndex, state.ultBonusLevel)} · Başarımlar ${sim.profile.achievements.length} · Mastery ${Math.floor(sim.profile.masteryXp ?? 0)}/${MAX_MASTERY_XP}${unlockText}`;
    }
    endOverlay.classList.remove("hidden");
  } else {
    lastEndPhase = "";
    endOverlay.classList.add("hidden");
  }
}

restartBtn.addEventListener("click", () => {
  sim.reset(sim.state.phase !== "victory");
  lastBoostKey = "";
  lastEndPhase = "";
});

dailyChallengeBtn.addEventListener("click", () => {
  toggleChallenge("daily");
});

weeklyChallengeBtn.addEventListener("click", () => {
  toggleChallenge("weekly");
});

rerollBtn.addEventListener("click", () => sim.rerollBoosts());

window.addEventListener("resize", () => view.resize());
view.resize();
requestAnimationFrame(frame);
