export interface AchievementDef {
    id: string;
    name: string;
    description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    { id: "first_run", name: "First Drop", description: "Complete your first run." },
    { id: "wave_10", name: "Deep Run", description: "Reach wave 10." },
    { id: "level_10", name: "Overclocked", description: "Reach level 10 in a run." },
    { id: "victory", name: "Arena Clear", description: "Complete a run in victory." },
    { id: "daily_clear", name: "Daily Specialist", description: "Clear a daily challenge." },
    { id: "weekly_clear", name: "Weekly Specialist", description: "Clear a weekly challenge." },
];

export function achievementById(id: string): AchievementDef | undefined {
    return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}