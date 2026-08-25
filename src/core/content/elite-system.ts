import type { EnemyModifierId } from "../types";

export interface EliteModifierDef {
    id: EnemyModifierId;
    name: string;
    description: string;
    weight: number; // Higher = more likely to appear
    modifyEnemy: (enemy: any) => void; // Apply stat modifications
}

export const ELITE_MODIFIERS: Record<EnemyModifierId, EliteModifierDef> = {
    regenerating: {
        id: "regenerating",
        name: "Yeniden Oluşan",
        description: "Düşman dalgada her saniye 5 HP iyileşir",
        weight: 1,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.2); // 20% more HP
            // healAura would be applied at runtime
        },
    },
    fast: {
        id: "fast",
        name: "Hızlı",
        description: "Düşman %40 daha hızlı hareket eder",
        weight: 2,
        modifyEnemy: (e) => {
            e.speed = Math.ceil(e.speed * 1.4);
        },
    },
    explosive: {
        id: "explosive",
        name: "Patlayıcı",
        description: "Ölüm anında çevreyi patlatır",
        weight: 2,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.15); // 15% more HP
            if (!e.explodeOnDeath) {
                e.explodeOnDeath = { radius: 80, damage: 20 };
            } else {
                e.explodeOnDeath.radius *= 1.2;
                e.explodeOnDeath.damage *= 1.3;
            }
        },
    },
    armored: {
        id: "armored",
        name: "Zırhlı",
        description: "Düşman hasar alma yeteneği %30 iyileştirilmiş",
        weight: 2,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.25); // 25% more HP
            // Actual armor modifier applied via damageTakenMultiplier at runtime
        },
    },
    vampiric: {
        id: "vampiric",
        name: "Vampirik",
        description: "Düşman verdigi hasar miktarının %50'sini cana çevirir",
        weight: 1,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.3); // 30% more HP
            // Lifesteal effect applied at runtime
        },
    },
    swarming: {
        id: "swarming",
        name: "Sürü",
        description: "Ölüm anında 2 daha küçük düşman doğurur",
        weight: 1,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.1); // 10% more HP
            if (!e.splitOnDeath) {
                e.splitOnDeath = { enemyId: "swarm", count: 2 };
            }
        },
    },
    shielded: {
        id: "shielded",
        name: "Kalkanlanmış",
        description: "Düşman ilk hasarı engeller",
        weight: 2,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.15); // 15% more HP
            // Shield property applied at runtime
        },
    },
    reflective: {
        id: "reflective",
        name: "Yansıtıcı",
        description: "Hasarın %20'si oyuncuya geri yansır",
        weight: 1,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.2); // 20% more HP
            // Reflection effect applied at runtime
        },
    },
    ranged: {
        id: "ranged",
        name: "Menzilli",
        description: "Düşman uzaktan ateş etme yeteneği kazanır",
        weight: 1,
        modifyEnemy: (e) => {
            e.hp = Math.ceil(e.hp * 1.15); // 15% more HP
            if (!e.shoot) {
                e.shoot = { damage: 10, interval: 1.5, speed: 400, range: 500 };
            }
        },
    },
};

/**
 * Determine if an enemy spawns as elite based on wave progression.
 * Elite chance increases with wave number.
 */
export function getEliteChance(waveIndex: number): number {
    if (waveIndex < 3) return 0; // No elites before wave 3
    if (waveIndex < 6) return 0.05; // 5% chance waves 3-5
    if (waveIndex < 10) return 0.1; // 10% chance waves 6-9
    return 0.15; // 15% chance wave 10+
}

/**
 * Select random elite modifiers for an enemy.
 * Can select 1-2 modifiers based on rarity.
 */
export function selectEliteModifiers(
    rng: any, // Rng instance
    maxModifiers: number = 2
): EnemyModifierId[] {
    const allModifiers = Object.keys(ELITE_MODIFIERS) as EnemyModifierId[];

    // Select 1-2 modifiers randomly
    const selectedCount = 1 + rng.int(maxModifiers); // 1 or 2
    const shuffled = rng.shuffle(allModifiers);

    return shuffled.slice(0, selectedCount);
}

/**
 * Apply elite modifiers to an enemy definition.
 */
export function applyEliteModifiers(
    enemy: any,
    modifierIds: EnemyModifierId[]
): void {
    modifierIds.forEach((modId) => {
        const modifier = ELITE_MODIFIERS[modId];
        if (modifier) {
            modifier.modifyEnemy(enemy);
        }
    });
}
