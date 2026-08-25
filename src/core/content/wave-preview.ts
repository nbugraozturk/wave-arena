import type { WaveDef, WaveThreatPreview } from "../types";
import { ENEMIES } from "./catalog";

/**
 * PHASE 3.1 - Wave Preview System
 * Generates threat summaries and predictions for upcoming waves.
 */

export interface WaveAnalysis {
    totalEnemies: number;
    totalHp: number;
    threatLevel: "low" | "medium" | "high" | "extreme";
    hasElites: boolean;
    dominantThreat: string;
    hardestEnemy: { id: string; hp: number };
}

export function analyzeWave(wave: WaveDef): WaveAnalysis {
    let totalEnemies = 0;
    let totalHp = 0;
    const threats: Map<string, number> = new Map();
    let hardestEnemy = { id: "", hp: 0 };

    for (const group of wave.groups) {
        const enemy = ENEMIES[group.enemyId as keyof typeof ENEMIES];
        if (!enemy) continue;

        totalEnemies += group.count;
        const enemyTotalHp = enemy.hp * group.count;
        totalHp += enemyTotalHp;
        threats.set(group.enemyId, (threats.get(group.enemyId) || 0) + group.count);

        if (enemy.hp > hardestEnemy.hp) {
            hardestEnemy = { id: group.enemyId, hp: enemy.hp };
        }
    }

    // Threat level based on total HP
    let threatLevel: "low" | "medium" | "high" | "extreme" = "low";
    if (totalHp > 1000) threatLevel = "extreme";
    else if (totalHp > 500) threatLevel = "high";
    else if (totalHp > 200) threatLevel = "medium";

    // Find dominant threat
    let dominantThreat = "mixed";
    let maxCount = 0;
    for (const [enemyId, count] of threats) {
        if (count > maxCount) {
            maxCount = count;
            dominantThreat = enemyId;
        }
    }

    return {
        totalEnemies,
        totalHp,
        threatLevel,
        hasElites: wave.elite === true,
        dominantThreat,
        hardestEnemy,
    };
}

export function getWaveComposition(wave: WaveDef): Array<{ id: string; count: number }> {
    return wave.groups.map((g) => ({ id: g.enemyId, count: g.count }));
}

export function generateThreatSummary(wave: WaveDef, currentWave: number): string {
    const analysis = analyzeWave(wave);
    const parts: string[] = [];

    if (analysis.hasElites) parts.push("Elite wave incoming");
    if (analysis.threatLevel === "extreme") parts.push("Extreme threat");
    else if (analysis.threatLevel === "high") parts.push("High threat");
    else if (analysis.threatLevel === "medium") parts.push("Medium threat");

    if (analysis.totalEnemies > 20) parts.push(`Heavy spawn (${analysis.totalEnemies} enemies)`);
    if (analysis.dominantThreat !== "mixed") parts.push(`Dominated by ${analysis.dominantThreat}s`);

    return parts.length > 0 ? parts.join("; ") : "Standard wave";
}

export function generateThreatList(wave: WaveDef, currentWave: number): string[] {
    const analysis = analyzeWave(wave);
    const threats: string[] = [];

    if (analysis.hasElites) threats.push(`Elite modifiers on all enemies`);
    if (analysis.dominantThreat !== "mixed") threats.push(`${analysis.dominantThreat} swarm`);
    if (analysis.hardestEnemy.id && analysis.hardestEnemy.hp > 50) {
        threats.push(`High-HP ${analysis.hardestEnemy.id} (${analysis.hardestEnemy.hp} hp)`);
    }
    if (analysis.totalEnemies > 25) threats.push("Dense enemy concentration");

    return threats.length > 0 ? threats : ["Standard composition"];
}

export function previewWaves(
    waves: WaveDef[],
    currentWaveIndex: number,
    lookahead: number = 3
): WaveThreatPreview[] {
    const previews: WaveThreatPreview[] = [];

    for (let i = 1; i <= lookahead; i++) {
        const waveIndex = currentWaveIndex + i;
        if (waveIndex > waves.length) break;

        const wave = waves[waveIndex - 1]; // waves are 0-indexed
        const distance = waveIndex - currentWaveIndex;

        // Certainty decreases with distance
        let certainty: "known" | "forecast" | "unknown" = "known";
        if (distance === 1) certainty = "known";
        else if (distance === 2) certainty = "forecast";
        else certainty = "unknown";

        previews.push({
            waveIndex,
            summary: generateThreatSummary(wave, waveIndex),
            threats: generateThreatList(wave, waveIndex),
            composition: getWaveComposition(wave),
            certainty,
        });
    }

    return previews;
}

export function getWaveDifficulty(wave: WaveDef): number {
    const analysis = analyzeWave(wave);

    // Calculate difficulty score: 0-100
    let score = 0;

    // 40% from total HP
    score += Math.min(40, (analysis.totalHp / 1000) * 40);

    // 30% from enemy count
    score += Math.min(30, (analysis.totalEnemies / 40) * 30);

    // 20% from elite modifier
    if (analysis.hasElites) score += 20;

    // 10% from threat level
    if (analysis.threatLevel === "extreme") score += 10;
    else if (analysis.threatLevel === "high") score += 6;
    else if (analysis.threatLevel === "medium") score += 3;

    return Math.min(100, Math.max(0, score));
}
