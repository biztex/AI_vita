import { prisma } from '../prisma';
import { processChat } from './chatService';
import { AXEL_OUTAGE_NOTICE } from './axelEngine';
import { pushText } from './lineService';
import { findActiveVitaNutritionPlan } from './vitaNutritionData';

function jstDateKey(d: Date): string {
  return d
    .toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-')
    .slice(0, 10);
}

type AlertThresholds = {
  fatigue_alert?: number;
  state_alert?: number;
};

function readThresholds(payload: unknown): { fatigueAlert: number; stateAlert: number } {
  const raw = (payload as { alert_thresholds?: AlertThresholds } | null)?.alert_thresholds;
  const fatigueAlert = typeof raw?.fatigue_alert === 'number' ? raw.fatigue_alert : 3;
  const stateAlert = typeof raw?.state_alert === 'number' ? raw.state_alert : 3;
  return { fatigueAlert, stateAlert };
}

/**
 * After saving a structured daily log, if levels exceed design-sheet thresholds, push one LINE message (max once per JST day).
 */
export async function maybePushVitaThresholdAlert(
  lineUserId: string,
  stateLevel: number | null,
  fatigueLevel: number | null,
): Promise<void> {
  if (stateLevel == null && fatigueLevel == null) return;

  const lu = await prisma.lineUser.findUnique({
    where: { lineUserId },
    select: { id: true, appUserId: true, lastVitaThresholdPushAt: true, userMode: true },
  });
  if (!lu) return;

  // Eligible for threshold alert: VITAAI single mode OR INTEGRATED (AXEL) subscriber.
  // ExecuWell single users are excluded — condition tracking isn't part of their flow.
  let isEligible = lu.userMode === 'VITAAI';
  if (!isEligible && lu.appUserId) {
    const sub = await prisma.stripeSubscription.findFirst({
      where: { userId: lu.appUserId, status: 'ACTIVE', subscriptionType: 'INTEGRATED' },
      select: { id: true },
    });
    isEligible = !!sub;
  }
  if (!isEligible) return;

  const todayKey = jstDateKey(new Date());
  if (lu.lastVitaThresholdPushAt && jstDateKey(lu.lastVitaThresholdPushAt) === todayKey) {
    return;
  }

  const plan = await findActiveVitaNutritionPlan(lineUserId, lu.appUserId);
  if (!plan) return;

  const { fatigueAlert, stateAlert } = readThresholds(plan.payload);
  const fatigueHit = fatigueLevel != null && fatigueLevel >= fatigueAlert;
  const stateHit = stateLevel != null && stateLevel >= stateAlert;
  if (!fatigueHit && !stateHit) return;

  const userMsg =
    `【閾値検知】状態レベル=${stateLevel ?? '-'}、疲労レベル=${fatigueLevel ?? '-'}。` +
    `個別設計シートの alert_thresholds に照らし、LINE通知用に運用参謀として最大3文で簡潔に伝えてください。`;

  const advice = await processChat('VITAAI', userMsg, lu.appUserId ?? undefined, undefined, undefined, lineUserId);
  if (advice === AXEL_OUTAGE_NOTICE) {
    // AI is down — a proactive push must not fire with a canned or
    // outage message. Skip (and leave the timestamp so it can retry
    // on the next threshold hit).
    console.error('[vitaAlert] AI unavailable — threshold push skipped');
    return;
  }
  await pushText(lineUserId, `【AXEL】\n${advice.trim()}`);
  await prisma.lineUser.update({
    where: { id: lu.id },
    data: { lastVitaThresholdPushAt: new Date() },
  });
}

/**
 * Remind users whose nextReviewAt is within `withinDays`, at most once per `cooldownDays`.
 */
export async function runVitaHearingReminders(withinDays = 14, cooldownDays = 7): Promise<number> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);

  const plans = await prisma.vitaNutritionPlan.findMany({
    where: {
      isActive: true,
      nextReviewAt: { not: null, lte: horizon },
    },
    orderBy: [{ lineUserId: 'asc' }, { version: 'desc' }],
  });

  let sent = 0;
  const seenLine = new Set<string>();

  for (const p of plans) {
    if (seenLine.has(p.lineUserId)) continue;
    seenLine.add(p.lineUserId);

    if (p.lastHearingReminderAt) {
      const elapsed = (Date.now() - p.lastHearingReminderAt.getTime()) / 86400000;
      if (elapsed < cooldownDays) continue;
    }

    const lineUser = await prisma.lineUser.findUnique({
      where: { lineUserId: p.lineUserId },
      include: {
        appUser: {
          include: {
            stripeSubscriptions: {
              where: { status: 'ACTIVE', subscriptionType: 'INTEGRATED' },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!lineUser || !lineUser.morningPushEnabled) continue;
    // Eligible: VITAAI single mode OR INTEGRATED (AXEL) subscriber.
    const isIntegrated = (lineUser.appUser?.stripeSubscriptions?.length ?? 0) > 0;
    if (lineUser.userMode !== 'VITAAI' && !isIntegrated) continue;

    const dateStr = p.nextReviewAt ? p.nextReviewAt.toISOString().slice(0, 10) : '近日';
    const text =
      `【AXEL】次回の管理栄養士ヒアリング（個別設計の更新）時期が近づいています（目安: ${dateStr}）。` +
      `日程調整と設計データの見直しをお勧めします。`;
    try {
      await pushText(p.lineUserId, text);
      await prisma.vitaNutritionPlan.update({
        where: { id: p.id },
        data: { lastHearingReminderAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error('[AXEL] hearing reminder push failed:', p.lineUserId, e);
    }
  }

  return sent;
}
