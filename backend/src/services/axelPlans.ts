/**
 * LINE plan carousel (2026-08-13). Presents the 3 subscription plans as a
 * horizontally-scrollable Flex carousel in the chat. Each subscribe button
 * opens the web checkout entry carrying the recipient's lineUserId, so the
 * Stripe webhook auto-links the paying account to this LINE identity.
 *
 * Prices here mirror the web /subscription page and must stay in sync with the
 * Stripe price objects.
 */

type PlanKey = 'INTEGRATED' | 'EXECUWELL' | 'VITAAI';

interface PlanDisplay {
  key: PlanKey;
  name: string;
  subtitle: string;
  monthly: number;
  enrollment: number;
  features: string[];
  recommended?: boolean;
}

// Ordered with the recommended integrated plan first.
export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    key: 'INTEGRATED',
    name: '統合プラン',
    subtitle: '完全版インフラ',
    monthly: 18000,
    enrollment: 30000,
    features: ['ExecuWell と VitaAI の完全アクセス', '統合ダッシュボード', '優先サポート'],
    recommended: true,
  },
  {
    key: 'EXECUWELL',
    name: 'ExecuWell',
    subtitle: '意思決定支援',
    monthly: 10000,
    enrollment: 20000,
    features: ['経営・意思決定のアドバイス', '日々の相談相手', '週次エグゼクティブレポート'],
  },
  {
    key: 'VITAAI',
    name: 'VitaAI',
    subtitle: 'コンディション最適化',
    monthly: 10000,
    enrollment: 20000,
    features: ['コンディション最適化', '遺伝子解析と日々の助言', '月次パフォーマンスレビュー'],
  },
];

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

function bubble(p: PlanDisplay, frontendUrl: string, lineUserId: string): any {
  const uri = `${frontendUrl}/subscription?plan=${p.key}&lineUserId=${encodeURIComponent(lineUserId)}`;
  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: p.recommended ? '#C9A86A' : '#1E3A5F',
      paddingAll: '14px',
      contents: [
        ...(p.recommended
          ? [{ type: 'text', text: 'おすすめ', size: 'xxs', color: '#1E3A5F', weight: 'bold' }]
          : []),
        { type: 'text', text: p.name, size: 'lg', weight: 'bold', color: '#ffffff' },
        { type: 'text', text: p.subtitle, size: 'xs', color: '#ffffff' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '14px',
      contents: [
        {
          type: 'box',
          layout: 'baseline',
          contents: [
            { type: 'text', text: yen(p.monthly), size: 'xl', weight: 'bold', color: '#1E3A5F', flex: 0 },
            { type: 'text', text: '/月', size: 'sm', color: '#888888', margin: 'sm' },
          ],
        },
        { type: 'text', text: `入会金 ${yen(p.enrollment)}`, size: 'xxs', color: '#888888' },
        { type: 'separator', margin: 'md' },
        ...p.features.map((f) => ({
          type: 'box',
          layout: 'baseline',
          margin: 'md',
          contents: [
            { type: 'text', text: '・', size: 'sm', color: '#C9A86A', flex: 0 },
            { type: 'text', text: f, size: 'sm', color: '#333333', wrap: true },
          ],
        })),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: p.recommended ? '#C9A86A' : '#1E3A5F',
          action: { type: 'uri', label: '申し込む', uri },
        },
      ],
    },
  };
}

/** A Flex carousel message with the 3 plans, each linking to checkout w/ lineUserId. */
export function buildPlanCarousel(lineUserId: string, frontendUrl: string): any {
  return {
    type: 'flex',
    altText: 'AXELのプランをご案内します',
    contents: {
      type: 'carousel',
      contents: PLAN_DISPLAY.map((p) => bubble(p, frontendUrl, lineUserId)),
    },
  };
}
