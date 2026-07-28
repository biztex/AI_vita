/**
 * Morning LINE push — "Silent Concierge" edition.
 *
 * Old behaviour: every opted-in user got a generic morning push every day
 * asking them to record their condition. This violated the client's stated
 * vision of "the user wants someone they can call on, not someone who
 * pushes daily notifications".
 *
 * New behaviour:
 *  - The default after onboarding is morningPushEnabled = false.
 *  - The job only runs for users who have EXPLICITLY opted in.
 *  - The push is short, soft, name-aware, and contains no URL.
 *  - If the user has been silent for a long time, the message becomes
 *    a gentle check-in instead of a "please record" prompt.
 *  - LIFF links removed entirely — AXEL is LINE-only.
 */
import { prisma } from '../prisma';
import { pushText } from './lineService';
import { getOnboardingAnswers } from './lineConversationStore';
import { runVitaHearingReminders } from './vitaAlertService';

function softMorningMessage(name: string, lastLogDaysAgo: number | null): string {
  // Less is more. Close, warm, like a quick check-in from someone who knows you.
  const greet = name && name !== 'お客' ? `${name}さん、おはよう。` : 'おはよう。';
  if (lastLogDaysAgo == null || lastLogDaysAgo >= 7) {
    return (
      `${greet}\n\n` +
      'しばらく話せてなかったね。最近、体調やお仕事はどんな感じ？\n' +
      '何か気になることがあれば、いつでも話して。'
    );
  }
  return (
    `${greet}\n\n` +
    '今日も無理しないようにね。\n' +
    '相談ごとがあれば、いつでもどうぞ。'
  );
}

export async function runMorningLinePush(): Promise<void> {
  try {
    const lineUsers = await prisma.lineUser.findMany({
      where: { morningPushEnabled: true },
      include: { appUser: true },
    });

    if (lineUsers.length === 0) {
      console.log('[Morning AXEL push] No opted-in users (default is silent).');
      return;
    }

    let sent = 0;
    for (const lu of lineUsers) {
      try {
        // Personal name precedence: onboarding answer > linked app user > LINE display
        const onboarding = getOnboardingAnswers(lu.lineUserId);
        const name =
          onboarding?.name?.trim() ||
          lu.appUser?.name?.trim() ||
          lu.displayName?.trim() ||
          'お客';

        // How many days since the user's last daily log? Used to soften.
        const lastLog = await prisma.dailyLog.findFirst({
          where: { lineUserId: lu.lineUserId },
          orderBy: { logDate: 'desc' },
          select: { logDate: true },
        });
        const lastLogDaysAgo = lastLog
          ? Math.floor((Date.now() - lastLog.logDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const text = softMorningMessage(name, lastLogDaysAgo);
        await pushText(lu.lineUserId, text);
        sent++;
      } catch (err) {
        console.error(`[LINE] Failed to push to ${lu.lineUserId}:`, err);
      }
    }

    try {
      const reminded = await runVitaHearingReminders(14, 7);
      if (reminded > 0) {
        console.log(`[Morning LINE] VitaAI hearing reminders sent: ${reminded}`);
      }
    } catch (e) {
      console.error('[Morning LINE] Hearing reminders failed:', e);
    }

    console.log(`[Morning AXEL push] Soft morning push sent to ${sent} explicit opt-in users.`);
  } catch (err) {
    console.error('[Morning LINE] Push failed:', err);
  }
}
