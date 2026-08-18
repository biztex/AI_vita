# Supabase 認証メールの日本語化（作業手順）

制作会社レビュー指摘「認証メールが英語で迷惑メールと間違えられる」への恒久対応。
コード側の対応（確認リンクを日本語のログインページ `/auth/login?verified=1` に着地させる・登録完了画面の案内強化）は実装済み。
**メール本文そのものは Supabase ダッシュボードでの設定変更が必要**（コードからは変更不可。所要 約10分）。

## 1. メールテンプレートを日本語にする

Supabase Dashboard → 対象プロジェクト → **Authentication → Emails（Email Templates）**

### Confirm signup（サインアップ確認）

**Subject:**

```
【ExecuWell / VitaAI】メールアドレスの確認をお願いします
```

**Body (HTML):**

```html
<div style="font-family:'Hiragino Sans','Yu Gothic',Meiryo,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h2 style="font-size:18px;color:#1E3A5F;">メールアドレスの確認</h2>
  <p>ExecuWell / VitaAI にご登録いただきありがとうございます。</p>
  <p>下のボタンをクリックして、メールアドレスの確認を完了してください。</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;">
      メールアドレスを確認する
    </a>
  </p>
  <p style="font-size:12px;color:#666;">ボタンが押せない場合は、次のURLをブラウザに貼り付けてください。<br>
  {{ .ConfirmationURL }}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;">
    このメールに心当たりがない場合は、破棄してください。<br>
    確認リンクの有効期限が切れた場合は、再度ログインをお試しいただくと新しい確認メールが届きます。
  </p>
</div>
```

### Reset password（パスワード再設定）※「パスワードをお忘れですか？」で使用

**Subject:** `【ExecuWell / VitaAI】パスワード再設定のご案内`

**Body:** 上と同じ構造で、本文を「パスワード再設定のリクエストを受け付けました。下のボタンから新しいパスワードを設定してください。」、ボタンを `{{ .ConfirmationURL }}`・「パスワードを再設定する」に変更。

## 2. リダイレクト先の許可（必須・1分）

Authentication → **URL Configuration** →
- **Site URL**: `https://execuwell.jp`
- **Redirect URLs** に追加: `https://execuwell.jp/**`

（コード側で確認後の着地先を `https://execuwell.jp/auth/login?verified=1` に指定済み。許可リストに無いと既定URLに飛ばされます。）

## 3. 【推奨】独自SMTPで送信元を日本語化・迷惑メール対策

既定では Supabase 共有ドメインから送信されるため、迷惑メール判定されやすい。
Authentication → Emails → **SMTP Settings** で独自SMTPを設定すると:
- 送信元を `noreply@execuwell.jp`／表示名「ExecuWell / VitaAI」にできる
- SPF/DKIM を自ドメインで整えられ、受信トレイ到達率が大きく改善

SMTP は SendGrid / Amazon SES / さくら等どれでも可。認証情報を共有いただければ設定値の作成まで代行します。

## 4. （任意・完全自前化）

`SUPABASE_SERVICE_ROLE_KEY` と SMTP 認証情報をバックエンドに追加すれば、
確認メールの生成（admin.generateLink）から送信まで完全に自前の日本語ブランドメールにできます（実装1〜2時間）。
ダッシュボード方式（上記1〜3）で十分なため、必要になった時のみ。
