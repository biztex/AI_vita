# LIFF 設定（ExecuWell「詳細を見る」ボタン用）

Phase1 では、LINE で ExecuWell が返信する際に「3〜6行の要約」＋「詳細を見る」ボタンを表示します。  
ボタンをタップすると LIFF（LINE 内ブラウザ）で詳細（要点整理・判断軸・リスク・推奨アクション）が開きます。

## 手順

1. **LINE Developers Console** で、Messaging API チャネル（または LINE Login チャネル）を開く。
2. **LIFF** タブで「追加」→ 新規 LIFF アプリを作成。
3. 設定:
   - **LIFF app name**: 例）ExecuWell 詳細
   - **Size**: Full（または Compact）
   - **Endpoint URL**: 本番の詳細ページ  
     例）`https://execuwell.jp/liff/detail`  
     （開発時は `https://<ngrokなど>/liff/detail` でも可）
   - **Scope**: 必要に応じて（profile は必須でない場合あり）
4. 発行された **LIFF ID** をコピーし、バックエンドの環境変数に設定:
   ```bash
   LIFF_ID=1234567890-xxxxxxxxxx
   ```
5. バックエンドを再起動。  
   `LIFF_ID` が未設定の場合は、ExecuWell の返信は従来どおり全文が LINE に送信されます（ボタンなし）。

## 動作

- ユーザーが LINE で ExecuWell にメッセージを送る → 短い要約（3〜6行）＋「詳細を見る」が届く。
- 「詳細を見る」タップ → `https://liff.line.me/{LIFF_ID}?messageId=...&lineUserId=...` が開く → LINE が Endpoint URL（`/liff/detail`）を読み込み、同一クエリで表示。
- `/liff/detail` は `messageId` と `lineUserId` で API を呼び出し、要点整理・判断軸・リスク・推奨アクション・補足を表示します。
