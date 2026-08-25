import type { AscensionLevel, ClassId, RunRecord } from "../types";

export const LEADERBOARD_STORAGE_KEY = "wave-arena-leaderboard";
export const LEADERBOARD_VERSION = 1;
export const LEADERBOARD_LIMIT = 10;

export interface LeaderboardPayload {
    version: 1;
    runs: RunRecord[];
}

function isValidRunRecord(value: unknown): value is RunRecord {
    if (!value || typeof value !== "object") return false;
    const record = value as Partial<RunRecord>;
    return Number.isFinite(record.waveIndex)
        && Number.isFinite(record.kills)
        && Number.isFinite(record.seed)
        && Number.isFinite(record.timestamp)
        && (record.classId === "vanguard" || record.classId === "marksman" || record.classId === "warden")
        && (record.ascensionLevel === 0 || record.ascensionLevel === 1)
        && (record.challengeMode === "normal" || record.challengeMode === "daily" || record.challengeMode === "weekly")
        && typeof record.victory === "boolean";
}

export function sortRunRecords(runs: RunRecord[]): RunRecord[] {
    return [...runs].sort((a, b) => b.waveIndex - a.waveIndex || Number(b.victory) - Number(a.victory) || b.kills - a.kills || b.timestamp - a.timestamp);
}

export function addRunRecord(runs: RunRecord[], record: RunRecord): RunRecord[] {
    const sameMode = (run: RunRecord) => run.classId === record.classId && run.ascensionLevel === record.ascensionLevel;
    const otherRuns = runs.filter((run) => !sameMode(run));
    const modeRuns = runs.filter(sameMode).filter((run) => run.seed !== record.seed);
    const previousSeedRun = runs.find((run) => sameMode(run) && run.seed === record.seed);
    const bestSeedRun = previousSeedRun && sortRunRecords([previousSeedRun, record])[0] === previousSeedRun ? previousSeedRun : record;
    const rankedRuns = sortRunRecords([...modeRuns, bestSeedRun]);
    return [...otherRuns, ...rankedRuns.slice(0, LEADERBOARD_LIMIT)];
}

export function getTopRuns(runs: RunRecord[], classId: ClassId, ascensionLevel: AscensionLevel): RunRecord[] {
    return sortRunRecords(runs.filter((run) => run.classId === classId && run.ascensionLevel === ascensionLevel));
}

export function parseLeaderboard(serialized: string | null): RunRecord[] {
    if (!serialized) return [];
    try {
        const payload = JSON.parse(serialized) as Partial<LeaderboardPayload>;
        if (payload.version !== LEADERBOARD_VERSION || !Array.isArray(payload.runs)) return [];
        return payload.runs.filter(isValidRunRecord);
    } catch {
        return [];
    }
}

export function serializeLeaderboard(runs: RunRecord[]): string {
    return JSON.stringify({ version: LEADERBOARD_VERSION, runs } satisfies LeaderboardPayload);
}

export function createRunRecord(input: {
    waveIndex: number;
    kills: number;
    seed: number;
    classId: ClassId;
    ascensionLevel: AscensionLevel;
    challengeMode: RunRecord["challengeMode"];
    victory: boolean;
    timestamp?: number;
}): RunRecord {
    return { ...input, timestamp: input.timestamp ?? Date.now() };
}