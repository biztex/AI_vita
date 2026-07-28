import { prisma } from '../prisma';
import type { VitaNutritionPlan } from '@prisma/client';

/**
 * Active nutritionist design sheet for LINE-first users.
 * Prefers lineUserId match; falls back to ownerId when linked.
 */
export async function findActiveVitaNutritionPlan(
  lineUserId?: string | null,
  ownerId?: string | null,
): Promise<VitaNutritionPlan | null> {
  if (lineUserId) {
    const byLine = await prisma.vitaNutritionPlan.findFirst({
      where: { lineUserId, isActive: true },
      orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
    });
    if (byLine) return byLine;
  }
  if (ownerId) {
    return prisma.vitaNutritionPlan.findFirst({
      where: { ownerId, isActive: true },
      orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
    });
  }
  return null;
}
