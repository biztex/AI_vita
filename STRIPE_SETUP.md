# Stripe Subscription Setup Guide

このドキュメントは、Stripeサブスクリプション決済システムのセットアップ手順を説明します。

## 1. Stripeアカウントのセットアップ

1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. テストモードまたは本番モードで作業

## 2. 価格（Price）の作成

Stripe Dashboardで以下の3つの価格を作成してください：

### VitaAI プラン
- **価格ID**: `price_xxxxx` (後で環境変数に設定)
- **金額**: ¥10,000/月
- **請求頻度**: 毎月
- **通貨**: JPY

### ExecuWell プラン
- **価格ID**: `price_xxxxx` (後で環境変数に設定)
- **金額**: ¥10,000/月
- **請求頻度**: 毎月
- **通貨**: JPY

### 統合プラン
- **価格ID**: `price_xxxxx` (後で環境変数に設定)
- **金額**: ¥18,000/月
- **請求頻度**: 毎月
- **通貨**: JPY

## 3. 環境変数の設定

### バックエンド (`.env`)

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxx  # または sk_live_xxxxx (本番環境)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs (上記で作成した価格ID)
STRIPE_PRICE_VITAAI=price_xxxxx
STRIPE_PRICE_EXECUWELL=price_xxxxx
STRIPE_PRICE_INTEGRATED=price_xxxxx

# Frontend URL
FRONTEND_URL=http://localhost:3000  # 本番環境では実際のURL
```

### フロントエンド

フロントエンドはStripe Checkoutを使用するため、追加の設定は不要です。

## 4. Webhookの設定

1. Stripe Dashboard → Developers → Webhooks
2. "Add endpoint" をクリック
3. エンドポイントURLを入力: `https://your-backend-url.com/stripe/webhook`
4. イベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Webhookシークレットをコピーして環境変数に設定

### ローカル開発用 (Stripe CLI)

```bash
# Stripe CLIをインストール
stripe listen --forward-to localhost:8080/stripe/webhook

# Webhookシークレットが表示されるので、それを環境変数に設定
```

## 5. データベースマイグレーション

```bash
cd backend
npx prisma migrate dev --name add_stripe_subscriptions
```

## 6. テスト

### テストカード番号

Stripeのテストモードでは以下のカード番号を使用できます：

- **成功**: `4242 4242 4242 4242`
- **3Dセキュア認証が必要**: `4000 0025 0000 3155`
- **決済失敗**: `4000 0000 0000 0002`

有効期限: 任意の未来の日付 (例: 12/34)
CVC: 任意の3桁 (例: 123)
ZIP: 任意の5桁 (例: 12345)

## 7. 本番環境への移行

1. Stripe Dashboardで本番モードに切り替え
2. 本番環境の価格を作成
3. 環境変数を本番用に更新:
   - `STRIPE_SECRET_KEY` → `sk_live_xxxxx`
   - 本番環境の価格IDを設定
   - `FRONTEND_URL` → 本番環境のURL
4. Webhookエンドポイントを本番URLに設定

## 8. トラブルシューティング

### Webhookが届かない

- Webhook URLが正しいか確認
- Webhookシークレットが正しいか確認
- Stripe DashboardのWebhookログを確認

### サブスクリプションがアクティベートされない

- Webhookイベントが正しく処理されているか確認
- データベースのログを確認
- Stripe Dashboardでサブスクリプションの状態を確認

### エラーメッセージ

- バックエンドのログを確認
- Stripe Dashboardのログを確認
- 環境変数が正しく設定されているか確認

## 9. セキュリティ

- **絶対に** StripeシークレットキーをGitにコミットしない
- 環境変数ファイル (`.env`) を `.gitignore` に追加
- Webhookシークレットは必ず使用する
- HTTPSを使用（本番環境）

## 10. サポート

問題が発生した場合:
1. Stripe Dashboardのログを確認
2. バックエンドのログを確認
3. [Stripe Documentation](https://stripe.com/docs) を参照

