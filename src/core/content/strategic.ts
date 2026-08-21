import type {
    ArtifactDef,
    BountyDef,
    BossRewardDef,
    EventDef,
    ShopItem,
    TemporaryEffectDef,
    EnemyModifierId,
    FusionRecipe,
    NodeType,
    PactDef,
    RouteNode,
} from "../types";

export const COMMITMENTS: Record<string, { label: string; preferredTags: string[]; blockedTags: string[] }> = {
    fire: { label: "Fire Mastery", preferredTags: ["fire-build"], blockedTags: ["tank-build"] },
    projectile: { label: "Projectile Doctrine", preferredTags: ["projectile-build"], blockedTags: [] },
    assassin: { label: "Assassin Path", preferredTags: ["assassin-build"], blockedTags: ["tank-build"] },
};

export const ARTIFACTS: ArtifactDef[] = [
    { id: "vampire_fang", name: "Vampire Fang", description: "Her 10 kill'de sonraki saldırı %100 lifesteal verir.", rarity: "epic", tags: ["lifesteal", "risk"], behavior: "lifesteal_pulse" },
    { id: "magnet", name: "Magnet", description: "Pickup toplama menzili iki katına çıkar.", rarity: "rare", tags: ["economy"], behavior: "magnet" },
    { id: "cursed_skull", name: "Cursed Skull", description: "+40% hasar, düşman canı +20%.", rarity: "legendary", tags: ["curse", "damage"], modifiers: { mul: { projectileDamage: 1.4 } } },
    { id: "bullet_core", name: "Bullet Core", description: "+1 mermi, mermi hasarı -15%.", rarity: "epic", tags: ["projectile"], modifiers: { add: { projectileCount: 1 }, mul: { projectileDamage: 0.85 } } },
];

export const FUSION_RECIPES: FusionRecipe[] = [
    { id: "attack-speed-ii", ingredients: ["firerate", "firerate"], resultBoostId: "firerate", cost: { evolutionShards: 1 }, description: "Attack Speed I + Attack Speed I, geliştirilmiş bir tetik kartına dönüşür." },
    { id: "fire-projectile", ingredients: ["fire_damage", "multishot"], resultArtifactId: "bullet_core", cost: { evolutionShards: 2 }, description: "Alev ve çoklu mermi, özel bir mermi çekirdeği üretir." },
    { id: "inferno", ingredients: ["burn_duration", "burn_spread"], resultBoostId: "burn_spread", cost: { evolutionShards: 3 }, description: "Yanma süresi ve yayılımı Inferno ilerlemesini tamamlar." },
];

export const PACTS: PactDef[] = [
    { id: "blood-pact", name: "Blood Pact", description: "Düşman HP +50%; tamamlayınca Legendary seviyesinde bonus.", modifiers: { enemyHp: 0.5 }, reward: { rarity: "legendary" } },
    { id: "swarm-pact", name: "Swarm Pact", description: "Düşman sayısı +75%; XP kazancı iki katı.", modifiers: { enemyCount: 0.75 }, reward: { xpMultiplier: 2 } },
    { id: "berserker-pact", name: "Berserker Pact", description: "Düşman hasarı +50%; tamamlayınca Artifact bonusu.", modifiers: { enemyDamage: 0.5 }, reward: { artifact: true } },
];

export const TEMPORARY_EFFECTS: TemporaryEffectDef[] = [
    { id: "overclock", name: "Overclock", description: "3 wave boyunca +100% attack speed.", durationWaves: 3, modifiers: { mul: { fireRate: 2 } } },
    { id: "fortified", name: "Fortified", description: "2 wave boyunca alınan hasar azalır.", durationWaves: 2, modifiers: { mul: { damageTakenMultiplier: 0.5 } } },
    { id: "berserk", name: "Berserk", description: "Boss'a kadar +75% damage.", durationWaves: 3, modifiers: { mul: { projectileDamage: 1.75 } } },
];

export const BOUNTIES: BountyDef[] = [
    { id: "no-damage", name: "No Damage", description: "Dalgayı hasar almadan tamamla.", target: "no_damage", reward: { rerollTokens: 1 } },
    { id: "hunter", name: "Hunter", description: "Bu wave içinde 5 düşman öldür.", target: "kills", amount: 5, reward: { gold: 30 } },
    { id: "speedrun", name: "Speedrun", description: "Dalgayı 35 saniyede tamamla.", target: "speed", amount: 35, reward: { rarity: "rare" } },
    { id: "elite-hunter", name: "Elite Hunter", description: "Bir elite düşman öldür.", target: "elite", reward: { evolutionShards: 2 } },
];

export function bountiesForWave(eliteWave: boolean): BountyDef[] {
    return BOUNTIES.filter((bounty) => bounty.target !== "elite" || eliteWave);
}

export const BOSS_REWARDS: BossRewardDef[] = [
    { id: "fire-core", name: "Fire Core", description: "Ateş ve yanma sinerjilerini güçlendirir.", tags: ["fire-build"], modifiers: { mul: { projectileDamage: 1.18 }, add: { explosionRadius: 8 } } },
    { id: "blood-core", name: "Blood Core", description: "Can emme ve dayanıklılık build'ini güçlendirir.", tags: ["tank-build"], modifiers: { add: { maxHp: 30, lifesteal: 0.03 } } },
    { id: "storm-core", name: "Storm Core", description: "Kritik ve saldırı hızı arasında güçlü bir tempo sağlar.", tags: ["assassin-build", "projectile-build"], modifiers: { mul: { fireRate: 1.12 }, add: { critChance: 0.05 } } },
];

export const EVENTS: EventDef[] = [
    {
        id: "mysterious-shrine",
        name: "Mysterious Shrine",
        description: "Eski bir shrine senden bedel istiyor. Her seçenek build'in geleceğini farklı etkiler.",
        choices: [
            { id: "shrine-curse", label: "Curse kabul et", description: "+1 Curse karşılığında Legendary şansını artırır.", effect: { curseId: "shrine-mark", evolutionShards: 2 } },
            { id: "shrine-blood", label: "Can feda et", description: "Canının %20'sini kaybet, Artifact kazan.", effect: { hpFraction: -0.2, artifactId: "vampire_fang" } },
            { id: "shrine-leave", label: "Uzaklaş", description: "Hiçbir şey kazanma, risk alma.", effect: {} },
        ],
    },
    {
        id: "stranger",
        name: "Stranger",
        description: "Ne aldığını tam açıklamadan bir değiş tokuş öneriyor.",
        choices: [
            { id: "stranger-gold", label: "Anlaşmayı kabul et", description: "20 Gold karşılığında 2 Evolution Shard.", effect: { gold: -20, evolutionShards: 2 } },
            { id: "stranger-decline", label: "Reddet", description: "Run state değişmez.", effect: {} },
        ],
    },
];

export function bossRewardById(id: string): BossRewardDef | undefined {
    return BOSS_REWARDS.find((reward) => reward.id === id);
}

export function eventById(id: string): EventDef | undefined {
    return EVENTS.find((event) => event.id === id);
}

export function createShopInventory(appliedBoostIds: string[] = []): ShopItem[] {
    const artifactItems: ShopItem[] = [
        { id: "shop-fang", name: "Vampire Fang", description: "Artifact slotuna ekle.", price: 45, kind: "artifact", artifactId: "vampire_fang" },
        { id: "shop-skull", name: "Cursed Skull", description: "+40% hasar; build'i daha kırılgan yapar.", price: 60, kind: "artifact", artifactId: "cursed_skull" },
        { id: "shop-bullet", name: "Bullet Core", description: "+1 mermi, mermi hasarı -15%.", price: 55, kind: "artifact", artifactId: "bullet_core" },
    ];
    const preferred = appliedBoostIds.some((id) => ["lifesteal", "blood_pact"].includes(id))
        ? "vampire_fang"
        : appliedBoostIds.some((id) => ["multishot", "pierce", "fire_damage"].includes(id))
            ? "bullet_core"
            : "cursed_skull";
    artifactItems.sort((a, b) => Number(b.artifactId === preferred) - Number(a.artifactId === preferred));
    return [
        ...artifactItems,
        { id: "shop-heal", name: "Field Medic", description: "Max HP'nin %35'ini iyileştir.", price: 20, kind: "heal" },
        { id: "shop-reroll", name: "Reroll Token", description: "Bir sonraki upgrade ekranında kullanılabilir.", price: 30, kind: "reroll" },
        { id: "shop-shard", name: "Fusion Material", description: "+1 Evolution Shard.", price: 35, kind: "shard" },
    ];
}

export const ENEMY_MODIFIERS: Record<EnemyModifierId, { label: string; description: string }> = {
    regenerating: { label: "Regenerating", description: "Zamanla HP yeniler." },
    fast: { label: "Fast", description: "Daha hızlı hareket eder." },
    explosive: { label: "Explosive", description: "Ölünce patlar." },
    armored: { label: "Armored", description: "Hasarı azaltır." },
    vampiric: { label: "Vampiric", description: "Verdiği hasarla iyileşir." },
    swarming: { label: "Swarming", description: "Kalabalık kompozisyonun parçasıdır." },
    shielded: { label: "Shielded", description: "İlk hasarı absorbe eder." },
    reflective: { label: "Reflective", description: "Gelen hasarın bir kısmını geri yansıtır." },
    ranged: { label: "Ranged", description: "Uzaktan saldırır." },
};

const ROUTE_TYPES: Array<{ type: NodeType; label: string; description: string; risk: number; reward: string }> = [
    { type: "combat", label: "Normal Combat", description: "Dengeli bir sonraki dalga.", risk: 1, reward: "Upgrade" },
    { type: "elite", label: "Elite", description: "Modifier'lı zor dalga.", risk: 3, reward: "Rare+ / Shard" },
    { type: "event", label: "Event", description: "Belirsiz ama anlamlı bir encounter.", risk: 0, reward: "Choice" },
    { type: "shop", label: "Shop", description: "Gold ile build'ini düzenle.", risk: 0, reward: "Economy" },
    { type: "treasure", label: "Treasure", description: "Artifact bul.", risk: 1, reward: "Artifact" },
    { type: "rest", label: "Rest", description: "İyileş veya upgrade yönet.", risk: 0, reward: "Heal / Remove" },
    { type: "challenge", label: "Challenge", description: "Ek risk karşılığında özel ödül.", risk: 4, reward: "Legendary choice" },
];

export function createRouteOptions(waveIndex: number): RouteNode[] {
    const types = waveIndex % 2 === 0 ? ["combat", "shop", "rest"] : ["combat", "elite", "event"];
    return types.map((type, index) => {
        const node = ROUTE_TYPES.find((candidate) => candidate.type === type)!;
        return { ...node, id: `${node.type}-${waveIndex}-${index}`, waveIndex };
    });
}

export function artifactById(id: string): ArtifactDef | undefined {
    return ARTIFACTS.find((artifact) => artifact.id === id);
}

export function pactById(id: string): PactDef | undefined {
    return PACTS.find((pact) => pact.id === id);
}

export function temporaryEffectById(id: string): TemporaryEffectDef | undefined {
    return TEMPORARY_EFFECTS.find((effect) => effect.id === id);
}

export function commitmentById(id: string) {
    return COMMITMENTS[id];
}

export function canFuse(appliedIds: string[], recipe: FusionRecipe): boolean {
    const available = [...appliedIds];
    return recipe.ingredients.every((ingredient) => {
        const index = available.indexOf(ingredient);
        if (index < 0) return false;
        available.splice(index, 1);
        return true;
    });
}