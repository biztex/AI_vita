# Stripe Webhook セットアップガイド

このガイドでは、Stripe Webhookをローカル開発環境と本番環境で設定する方法を説明します。

## 方法1: ローカル開発環境（Stripe CLI推奨）

### ステップ1: Stripe CLIのインストール

#### macOS
```bash
brew install stripe/stripe-cli/stripe
```

#### Linux
```bash
# 最新バージョンを確認: https://github.com/stripe/stripe-cli/releases
wget https://github.com/stripe/stripe-cli/releases/download/v1.21.9/stripe_1.21.9_linux_x86_64.tar.gz
tar -xvf stripe_1.21.9_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Windows
```powershell
# Chocolateyを使用
choco install stripe-cli

# または、GitHubから直接ダウンロード
# https://github.com/stripe/stripe-cli/releases
```

### ステップ2: Stripe CLIにログイン

```bash
stripe login
```

ブラウザが開き、Stripeアカウントで認証します。

### ステップ3: Webhookをローカルに転送

```bash
# バックエンドが localhost:8080 で実行されている場合
stripe listen --forward-to localhost:8080/stripe/webhook
```

このコマンドを実行すると、以下のような出力が表示されます：

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**重要**: この `whsec_xxxxxxxxxxxxx` をコピーして、バックエンドの `.env` ファイルに設定してください：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### ステップ4: テストイベントをトリガー

別のターミナルで、テストイベントを送信できます：

```bash
# テストイベントを送信
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

## 方法2: Stripe DashboardでWebhookを設定（本番環境）

### ステップ1: Stripe Dashboardにアクセス

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. **Developers** → **Webhooks** に移動

### ステップ2: エンドポイントを追加

1. **"Add endpoint"** ボタンをクリック
2. **Endpoint URL** を入力:
   ```
   https://your-backend-domain.com/stripe/webhook
   ```
   例: `https://api.yourapp.com/stripe/webhook`

### ステップ3: イベントを選択

以下のイベントを選択してください：

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### ステップ4: Webhookシークレットを取得

1. エンドポイントを作成後、**"Reveal"** をクリック
2. **Signing secret** をコピー（`whsec_` で始まる）
3. バックエンドの `.env` ファイルに設定：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### ステップ5: テストイベントを送信

1. Webhookエンドポイントのページで **"Send test webhook"** をクリック
2. イベントタイプを選択（例: `checkout.session.completed`）
3. **"Send test webhook"** をクリック

## 方法3: ngrokを使用したローカル開発（代替方法）

Stripe CLIが使えない場合、ngrokを使用できます。

### ステップ1: ngrokをインストール

```bash
# macOS
brew install ngrok

# または公式サイトから: https://ngrok.com/download
```

### ステップ2: ngrokトンネルを開始

```bash
# バックエンドが localhost:8080 で実行されている場合
ngrok http 8080
```

出力例：
```
Forwarding  https://xxxx-xx-xx-xx-xx.ngrok.io -> http://localhost:8080
```

### ステップ3: Stripe DashboardでWebhookを設定

1. Stripe Dashboard → Developers → Webhooks
2. **"Add endpoint"** をクリック
3. **Endpoint URL** に ngrok URL を入力:
   ```
   https://xxxx-xx-xx-xx-xx.ngrok.io/stripe/webhook
   ```
4. イベントを選択（上記と同じ）
5. Webhookシークレットをコピーして `.env` に設定

**注意**: ngrokの無料版では、URLが再起動のたびに変わります。

## Webhookの検証

### 1. Webhookログを確認

Stripe Dashboard → Developers → Webhooks → エンドポイントを選択 → **"Webhook attempts"** タブ

成功したリクエストは緑色、失敗は赤色で表示されます。

### 2. バックエンドログを確認

Webhookが正常に処理されているか、バックエンドのログを確認：

```bash
# バックエンドを実行中に、ログを確認
# Webhookイベントが処理されると、ログに表示されます
```

### 3. データベースを確認

Webhookが正常に処理されると、`StripeSubscription` テーブルにデータが保存されます：

```bash
cd backend
npx prisma studio
```

## トラブルシューティング

### Webhookが届かない

1. **URLが正しいか確認**
   - エンドポイントURLが正確か
   - バックエンドサーバーが実行中か

2. **Webhookシークレットが正しいか確認**
   - `.env` ファイルの `STRIPE_WEBHOOK_SECRET` が正しいか
   - ローカル開発と本番環境で異なるシークレットを使用しているか

3. **CORS設定を確認**
   - バックエンドのCORS設定が正しいか

### Webhookの署名検証エラー

```
Webhook Error: No signatures found matching the expected signature
```

**解決方法**:
- Webhookシークレットが正しいか確認
- リクエストボディがraw形式で処理されているか確認（`express.raw()` を使用）

### イベントが処理されない

1. **イベントタイプを確認**
   - 必要なイベントが選択されているか
   - バックエンドのコードでイベントタイプが正しく処理されているか

2. **エラーログを確認**
   - バックエンドのコンソールログ
   - Stripe DashboardのWebhook attempts

## 本番環境への移行チェックリスト

- [ ] 本番環境のStripeアカウントでWebhookエンドポイントを作成
- [ ] 本番環境のWebhookシークレットを `.env` に設定
- [ ] 本番環境のURLでWebhookエンドポイントを設定
- [ ] 必要なイベントがすべて選択されているか確認
- [ ] テストイベントを送信して動作確認
- [ ] エラーログの監視を設定

## セキュリティのベストプラクティス

1. **Webhookシークレットは絶対に公開しない**
   - `.env` ファイルを `.gitignore` に追加
   - 環境変数として安全に管理

2. **HTTPSを使用**
   - 本番環境では必ずHTTPSを使用
   - ngrokは自動的にHTTPSを提供

3. **署名検証を必ず実装**
   - すべてのWebhookリクエストの署名を検証
   - 実装済み（`stripe.webhooks.constructEvent()` を使用）

4. **イベントの冪等性を考慮**
   - 同じイベントが複数回送信される可能性がある
   - 実装済み（`upsert` を使用）

## 参考リンク

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

