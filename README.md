ビジネス経営サポートプラットフォーム

本プロジェクトは、40名以上の経営者を支援するために設計された統合型プラットフォームです。
フロントエンドには Next.js、バックエンドには Node.js（Express + Prisma + PostgreSQL） を採用したフルスタック構成となっており、外部ニュースAPIと連携することで、経営者に対してリアルタイムに情報を配信できる仕組みを備えています。

本システムには、以下の機能が統合されています：

自動スケジューリング機能
テキストチャット・ボイスチャット機能
AIによるデータ分析・インサイト提示機能
メールニュースダイジェスト配信機能

これらを通じて、経営者の日々の意思決定や業務効率化を総合的に支援するプラットフォームとなっています。

🗺️ システム構成図

    U -->|ブラウザ| FE
    FE -->|Supabase JS SDK| SB
    SB -->|JWT / セッション| FE
    FE -->|REST + Bearer JWT| API
    API -->|JWKS 検証| SB
    API -->|Prisma| DB
    API -->|キャッシュ| RD
    API -->|音声/添付| STORE
    API -->|ニュース取得| NEWS
    API -->|AIチャット/分析| OA
    API -->|レポート配信| SMTP
    SCHED -->|07:00 JST| NEWS
    SCHED -->|AI分析| OA
    SCHED -->|ニュース保存| DB
    SCHED -->|Digest送信| SMTP
    API -->|結果返却| FE

🚀 フロントエンドセットアップ（Next.js）
1. 依存パッケージのインストール
npm install

2. .env ファイルの作成

以下の環境変数を設定してください。

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEWSDATA_API_KEY=

🔧 バックエンドセットアップ（Node.js + Prisma + PostgreSQL）
1. 依存パッケージのインストール
npm install

2. PostgreSQL のインストール

推奨バージョン：PostgreSQL v15 以上

3. .env ファイルの作成

以下の環境変数を設定してください。

PORT=8080
NODE_ENV=development

# PostgreSQL
DATABASE_URL=

# Redis
REDIS_URL=

# Supabase Auth
SUPABASE_JWKS_URL=
SUPABASE_ISSUER=
SUPABASE_AUDIENCE=authenticated

# OpenAI
OPENAI_API_KEY=

🗄️ データベースセットアップ（Prisma）

/backend/prisma ディレクトリへ移動して実行します。

■ 開発環境：データベースをリセット
npx prisma migrate reset --force --skip-generate

■ ステージング／本番環境：マイグレーションを適用
npx prisma migrate deploy

■ ローカル開発：マイグレーション実行
npm run migrate:dev

■ Prisma Client の再生成
npx prisma generate

📰 外部ニュース API 一覧
■ 最新ニュース
https://newsdata.io/api/1/latest?apikey=${api_key}

■ 暗号通貨ニュース
https://newsdata.io/api/1/crypto?apikey=${api_key}

■ マーケットニュース
https://newsdata.io/api/1/market?apikey=${api_key}

▶️ 実行方法
■ Frontend
npm run build
npm start

■ Backend
npm run dev

🧩 技術スタック
Frontend: Next.js,Tailwind,React-Hook-Form,TypeScript
Backend: Express.js
Database: PostgreSQL（Prisma ORM 使用）
Cloud Services: Supabase