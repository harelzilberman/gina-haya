export type StarterTaskCategory = 'watering' | 'fertilizing' | 'pruning' | 'planting' | 'harvesting' | 'pest_control' | 'composting' | 'general';
export type StarterTask = {
    title: string;
    notes: string;
    category: StarterTaskCategory;
    dayOffset: number;
    priority: 'low' | 'medium' | 'high';
};
export declare const STARTER_TASKS: Record<string, StarterTask[]>;
export declare function getStarterTasks(plantType?: string | null): StarterTask[];
//# sourceMappingURL=starterTasks.d.ts.map