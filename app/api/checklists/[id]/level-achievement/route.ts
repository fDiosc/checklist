import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Calculate and return level achievement for a checklist
export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        void req;
        const params = await props.params;
        const { id } = params;

        // 1. Get the checklist with its template structure
        const checklist = await db.checklist.findUnique({
            where: { id },
            include: {
                template: {
                    include: {
                        levels: { orderBy: { order: 'asc' } },
                        classifications: { orderBy: { order: 'asc' } },
                        sections: {
                            include: {
                                items: {
                                    include: {
                                        conditions: {
                                            include: { scopeField: true },
                                        },
                                    },
                                },
                                level: true,
                            },
                        },
                    },
                },
                responses: true,
                scopeAnswers: true,
                targetLevel: true,
                parent: {
                    select: {
                        scopeAnswers: true,
                    },
                },
            },
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        const { template } = checklist;
        if (!template.isLevelBased) {
            return NextResponse.json({ error: "Not a level-based checklist" }, { status: 400 });
        }

        const levels = template.levels;
        const classifications = template.classifications;
        // For child checklists, use parent's scope answers
        const effectiveScopeAnswers = checklist.parentId && checklist.parent?.scopeAnswers?.length
            ? checklist.parent.scopeAnswers
            : checklist.scopeAnswers;
        const scopeAnswerMap = new Map(
            effectiveScopeAnswers.map((sa: { scopeFieldId: string; value: string }) => [sa.scopeFieldId, sa.value])
        );
        const responseMap = new Map(
            checklist.responses.map(r => [`${r.itemId}_${r.fieldId}`, r])
        );

        // 2. Determine which items are active (not conditioned out)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isItemActive = (item: any): boolean => {
            if (!item.conditions || item.conditions.length === 0) return true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const cond of item.conditions as any[]) {
                const scopeValue = scopeAnswerMap.get(cond.scopeFieldId);
                if (!scopeValue) continue;
                const numVal = parseFloat(scopeValue);
                const condVal = parseFloat(cond.value);
                let match = false;
                switch (cond.operator) {
                    case 'EQ': match = scopeValue === cond.value; break;
                    case 'NEQ': match = scopeValue !== cond.value; break;
                    case 'GT': match = numVal > condVal; break;
                    case 'LT': match = numVal < condVal; break;
                    case 'GTE': match = numVal >= condVal; break;
                    case 'LTE': match = numVal <= condVal; break;
                }
                if (match && cond.action === 'REMOVE') return false;
                // OPTIONAL is handled at required level, item is still active
            }
            return true;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isItemOptionalByCondition = (item: any): boolean => {
            if (!item.conditions || item.conditions.length === 0) return false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const cond of item.conditions as any[]) {
                const scopeValue = scopeAnswerMap.get(cond.scopeFieldId);
                if (!scopeValue) continue;
                const numVal = parseFloat(scopeValue);
                const condVal = parseFloat(cond.value);
                let match = false;
                switch (cond.operator) {
                    case 'EQ': match = scopeValue === cond.value; break;
                    case 'NEQ': match = scopeValue !== cond.value; break;
                    case 'GT': match = numVal > condVal; break;
                    case 'LT': match = numVal < condVal; break;
                    case 'GTE': match = numVal >= condVal; break;
                    case 'LTE': match = numVal <= condVal; break;
                }
                if (match && cond.action === 'OPTIONAL') return true;
            }
            return false;
        };

        // 3. Calculate progress per level
        type LevelProgress = {
            levelId: string;
            levelName: string;
            levelOrder: number;
            achieved: boolean;
            blocked: boolean;
            blockedByItems: string[];
            totalItems: number;
            approvedItems: number;
            classificationProgress: {
                classificationId: string;
                classificationName: string;
                classificationCode: string;
                requiredPercentage: number;
                totalItems: number;
                approvedItems: number;
                achieved: boolean;
            }[];
        };

        const levelProgressList: LevelProgress[] = [];

        for (const level of levels) {
            // Get sections for this level
            const levelSections = template.sections.filter(s => {
                if (template.levelAccumulative) {
                    // Include global sections + sections up to this level
                    return !s.levelId || s.level!.order <= level.order;
                }
                return !s.levelId || s.levelId === level.id;
            });

            // Get all items in these sections
            const allItems = levelSections.flatMap(s => s.items).filter(isItemActive);

            // Items that block advancement
            const blockedByItems: string[] = [];
            for (const item of allItems) {
                if (item.blocksAdvancementToLevelId) {
                    // Check if this item blocks this level or a level at/before this one
                    const blockLevel = levels.find(l => l.id === item.blocksAdvancementToLevelId);
                    if (blockLevel && blockLevel.order <= level.order) {
                        const response = responseMap.get(`${item.id}___global__`);
                        if (!response || response.status !== 'APPROVED') {
                            blockedByItems.push(item.name);
                        }
                    }
                }
            }

            // Classification progress
            const classProgress = classifications.map(cls => {
                const clsItems = allItems.filter(it => it.classificationId === cls.id);
                const required = clsItems.filter(it => !isItemOptionalByCondition(it) && it.required);
                const approved = required.filter(it => {
                    const r = responseMap.get(`${it.id}___global__`);
                    return r && r.status === 'APPROVED';
                });

                const percentage = required.length === 0 ? 100 : (approved.length / required.length) * 100;
                return {
                    classificationId: cls.id,
                    classificationName: cls.name,
                    classificationCode: cls.code,
                    requiredPercentage: cls.requiredPercentage,
                    totalItems: required.length,
                    approvedItems: approved.length,
                    achieved: percentage >= cls.requiredPercentage,
                };
            });

            // Uncategorized items
            const uncategorizedItems = allItems.filter(it => !it.classificationId);
            const uncatRequired = uncategorizedItems.filter(it => !isItemOptionalByCondition(it) && it.required);
            const uncatApproved = uncatRequired.filter(it => {
                const r = responseMap.get(`${it.id}___global__`);
                return r && r.status === 'APPROVED';
            });

            const totalApproved = classProgress.reduce((sum, cp) => sum + cp.approvedItems, 0) + uncatApproved.length;
            const totalItems = classProgress.reduce((sum, cp) => sum + cp.totalItems, 0) + uncatRequired.length;

            const allClassificationsAchieved = classProgress.every(cp => cp.achieved);
            const allUncategorizedApproved = uncatRequired.length === 0 || uncatApproved.length === uncatRequired.length;

            levelProgressList.push({
                levelId: level.id,
                levelName: level.name,
                levelOrder: level.order,
                achieved: allClassificationsAchieved && allUncategorizedApproved && blockedByItems.length === 0,
                blocked: blockedByItems.length > 0,
                blockedByItems,
                totalItems,
                approvedItems: totalApproved,
                classificationProgress: classProgress,
            });
        }

        // Find highest achieved level
        const achievedLevel = [...levelProgressList].reverse().find(lp => lp.achieved);

        return NextResponse.json({
            checklistId: id,
            targetLevel: checklist.targetLevel,
            achievedLevel: achievedLevel ? {
                id: achievedLevel.levelId,
                name: achievedLevel.levelName,
                order: achievedLevel.levelOrder,
            } : null,
            levelProgress: levelProgressList,
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("GET level-achievement error:", errorMessage);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
