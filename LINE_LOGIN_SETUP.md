# LINE Login (OAuth) セットアップガイド

## 🎯 概要

モダンな **LINE Login (OAuth 2.0)** を実装しました。これにより:

- ✅ **ワンクリック連携**: ユーザーは「LINEで連携する」ボタンを押すだけ
- ✅ **自動取得**: LINE User ID と displayName を自動取得
- ✅ **セキュア**: CSRF 保護、ID Token検証
- ✅ **業界標準**: OAuth 2.0 準拠
- ✅ **エラーフリー**: 手動入力不要でミス防止

---

## 📋 LINE Developers Console での設定手順

### Step 1: LINE Login チャネルを作成

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーを選択 (例: グリース)
3. **「新規チャネル作成」** → **「LINE Login」** を選択
4. チャネル情報を入力:
   - チャネル名: `ExecuWell / VitaAI Web連携`
   - チャネル説明: `Web アプリと LINE アカウントの連携用`
   - アプリタイプ: **Web app**

### Step 2: Callback URL を設定

**重要**: LINE Login チャネルの設定画面で:

1. **Callback URL** を追加:
   ```
   開発環境: http://localhost:3000/line-callback
   本番環境: https://execuwell.jp/line-callback
   ```
   ※ **両方登録することを推奨** (開発・本番で切り替え不要)

2. **スコープ設定** (自動で設定済み):
   - `profile` (ユーザー名、プロフィール画像)
   - `openid` (ID Token 取得)

### Step 3: チャネル情報を取得

LINE Login チャネルの **「Basic settings」** から:

- **Channel ID**: `1234567890` (例)
- **Channel secret**: `abcdef...` (例)

これらを `.env` に設定します。

---

## ⚙️ Backend 環境変数の設定

### `/backend/.env`

既存の LINE Messaging API 設定の下に追加:

```bash
# ─── LINE Login (OAuth) ───
LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=your_channel_secret_here
LINE_LOGIN_CALLBACK_URL=https://execuwell.jp/line-callback
```

**開発環境の場合:**

```bash
LINE_LOGIN_CALLBACK_URL=http://localhost:3000/line-callback
```

**重要事項:**
- `LINE_LOGIN_CHANNEL_ID` と `LINE_CHANNEL_ACCESS_TOKEN` は **別物** です
  - `LINE_CHANNEL_*` = Messaging API (Bot 用)
  - `LINE_LOGIN_*` = LINE Login (Web 連携用)
- 両方必要です (Bot と Web 連携は別チャネル)

---

## 🔄 連携フロー

### ユーザー視点

1. **Profile ページ** → **LINE連携タブ** を開く
2. **「LINEで連携する」** ボタンをクリック
3. LINE Login 画面に遷移 (自動)
4. LINE でログイン・認可 → 自動リダイレクト
5. **連携完了！** (displayName も自動取得)

### システムフロー (詳細)

```
[Frontend] Generate state → Store in sessionStorage
     ↓
[Frontend] GET /api/line/login-url?state=xxx
     ↓
[Backend]  Build LINE OAuth URL → Return
     ↓
[Frontend] Redirect to LINE Login (line.me/oauth2/v2.1/authorize)
     ↓
[LINE]     User logs in and authorizes
     ↓
[LINE]     Redirect back to /line-callback?code=ABC&state=xxx
     ↓
[Frontend] Validate state (CSRF check) → Extract code
     ↓
[Frontend] POST /api/line/link-oauth { code, state, expectedState }
     ↓
[Backend]  Exchange code for access_token + id_token
     ↓
[Backend]  Verify id_token → Extract lineUserId, displayName
     ↓
[Backend]  Upsert LineUser (link to appUserId)
     ↓
[Frontend] Show success → Redirect to profile
```

---

## 📁 実装ファイル一覧

### Backend

| ファイル | 内容 |
|---------|------|
| `backend/src/env.ts` | `LINE_LOGIN_*` 環境変数を追加 |
| `backend/src/services/lineLoginService.ts` | LINE Login OAuth ロジック (新規) |
| `backend/src/routes/line.ts` | `/line/login-url`, `/line/link-oauth` エンドポイント追加 |
| `backend/.env.example` | LINE Login 設定例を追加 |

### Frontend

| ファイル | 内容 |
|---------|------|
| `src/lib/api/api-client.ts` | `line.getLoginUrl()`, `line.linkOAuth()` メソッド追加 |
| `src/app/line-callback/page.tsx` | OAuth コールバックハンドラー (新規) |
| `src/app/profile/page.tsx` | 「LINEで連携する」ボタンに変更 |

---

## 🧪 テスト方法

### 1. 開発環境でテスト

```bash
# Backend 起動
cd backend
npm run dev

# Frontend 起動 (別ターミナル)
cd AI_vita
npm run dev
```

### 2. ブラウザで確認

1. `http://localhost:3000/profile?tab=line` を開く
2. 「LINEで連携する」ボタンをクリック
3. LINE Login 画面が開くことを確認
4. テスト用 LINE アカウントでログイン
5. 認可画面で「許可する」をクリック
6. `/line-callback` に戻り、成功メッセージを確認
7. Profile ページで連携状態が「連携済み」になることを確認

### 3. デバッグ用ログ

Backend のコンソールに以下が表示されます:

```
[LINE Login] URL generation: state=abc123
[LINE Login] OAuth callback: code=ABC...
[LINE Login] Token exchange successful
[LINE Login] ID token verified: lineUserId=U1234...
[LINE Login] Account linked: U1234...
```

---

## 🚨 よくあるエラーと対処法

### 1. `400 Bad Request: invalid redirect_uri`

**原因**: LINE Developers Console の Callback URL 設定が間違っている

**対処**:
- Callback URL に `http://localhost:3000/line-callback` を追加
- フロントエンドの URL と完全一致する必要があります (末尾 `/` も含めて)

### 2. `State mismatch (CSRF)`

**原因**: ブラウザの sessionStorage が消えた、または state が改ざんされた

**対処**:
- ブラウザのキャッシュ・Cookie をクリア
- sessionStorage を手動でクリア: `sessionStorage.removeItem('line_login_state')`
- もう一度「LINEで連携する」をクリック

### 3. `LINE Login failed. Code may be expired or invalid.`

**原因**: 認証コードの有効期限切れ (通常 10 分)

**対処**:
- もう一度「LINEで連携する」ボタンから開始

### 4. `Channel secret is invalid`

**原因**: `.env` の `LINE_LOGIN_CHANNEL_SECRET` が間違っている

**対処**:
- LINE Developers Console → Basic settings から Channel secret をコピー
- `.env` を再確認 (スペースや改行が入っていないか)

---

## 🔒 セキュリティ

実装済みのセキュリティ機能:

1. **CSRF 保護**: `state` パラメータで状態検証
2. **ID Token 検証**: LINE の `/oauth2/v2.1/verify` エンドポイントで検証
3. **認証必須**: `requireAuth()` ミドルウェアで appUserId を保護
4. **有効期限**: 認証コードは 10 分で期限切れ (LINE 側の制約)
5. **HTTPS 必須**: 本番環境では HTTPS のみ許可 (LINE 側の要件)

---

## 📌 メモ

- **既存の手動連携機能は削除していません** (後方互換性のため `POST /line/link` は残存)
- 本番環境では必ず **HTTPS** を使用してください
- Callback URL は LINE Developers Console に**事前登録**が必須です
- 連携後、MyAI との LINE チャットや朝のニュース配信が利用可能になります

---

## 🎉 完了！

これで、モダンな LINE Login 連携が完了しました。ユーザーは簡単・安全にアカウント連携できます。

問題があれば、Backend のログ (`console.log`) を確認してください。
