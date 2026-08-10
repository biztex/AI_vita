/**
 * Formats the nutritionist plan and the personality diagnosis into readable
 * blocks for the DAILY AXEL engine (2026-08-11).
 *
 * Before this, respondAsAxel only saw a 400-char dietitian note + gene data;
 * the structured VitaNutritionPlan and MyAIDiagnostic reached users only via a
 * secondary path (alerts / advice button). The client's whole premise is that
 * AXEL uses everything it knows in daily support, so these are now folded into
 * the daily prompt — humanized (never raw type codes, per the persona rule).
 */

const ENNEAGRAM_NAMES: Record<number, string> = {
  1: '改革者', 2: '援助者', 3: '達成者', 4: '個性派', 5: '観察者',
  6: '忠実家', 7: '楽天家', 8: '挑戦者', 9: '調停者',
};

/**
 * Humanized personality block from a MyAIDiagnostic row. Returns null if there
 * isn't enough to say. Deliberately omits raw type codes (INTJ/D/…) — the
 * persona forbids speaking them; AXEL uses the natural-language tendencies.
 */
export function formatDiagnosticBlock(d: any | null): string | null {
  if (!d) return null;
  const lines: string[] = [];
  const tendency = (d.summary && String(d.summary).trim()) || (d.mbtiLabel && String(d.mbtiLabel).trim());
  if (tendency) lines.push(`思考・行動の傾向：${tendency}`);
  if (d.discLabel) lines.push(`対人・仕事のスタイル：${d.discLabel}`);
  if (d.cognitiveTrend) lines.push(`物事の捉え方：${d.cognitiveTrend}`);
  const top3 = Array.isArray(d.enneagramTop3) ? d.enneagramTop3 : [];
  const names = top3.map((n: any) => ENNEAGRAM_NAMES[Number(n)]).filter(Boolean);
  if (names.length) lines.push(`内面の動機：${names.join('・')}の傾向`);
  if (lines.length === 0) return null;
  return (
    `【性格診断からの理解】\n` +
    lines.join('\n') +
    `\n※ 診断名やタイプ記号（アルファベットの型など）は口にしない。この傾向を自然な言葉に翻訳し、伝え方・提案の仕方に滲ませる。`
  );
}

/** Renders an untyped plan payload readably, robust to any shape. */
function renderPayload(payload: any): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.slice(0, 1200);
  if (typeof payload !== 'object') return String(payload).slice(0, 1200);
  const lines: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'alert_thresholds') continue; // internal, not for conversation
    let val: string;
    if (v == null) continue;
    else if (Array.isArray(v)) val = v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('、');
    else if (typeof v === 'object') val = JSON.stringify(v);
    else val = String(v);
    if (val.trim()) lines.push(`・${k}：${val}`.slice(0, 300));
  }
  return lines.join('\n').slice(0, 1600);
}

/**
 * Nutritionist plan block from an active VitaNutritionPlan row. Returns null if
 * there's no plan. Instructs AXEL to treat it as the top-priority ground for
 * health/lifestyle advice and to keep using the latest plan between reviews.
 */
export function formatNutritionPlanBlock(plan: any | null): string | null {
  if (!plan) return null;
  const body = renderPayload(plan.payload);
  if (!body.trim()) return null;
  const review = plan.nextReviewAt ? new Date(plan.nextReviewAt).toLocaleDateString('ja-JP') : '未設定';
  return (
    `【管理栄養士の個別プラン（健康・生活の相談で最優先に反映）】次回見直し目安：${review}\n` +
    body +
    `\n※ 食事・睡眠・運動・体調・会食や出張の相談では、このプランを前提に助言する。` +
    `見直し前でも最新のプランを継続して参照し、必要に応じて見直し時期を穏やかに案内する。`
  );
}
