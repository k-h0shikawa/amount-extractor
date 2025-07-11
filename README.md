# Discord Amount Extractor Bot

スクリーンショット画像から「ご利用金額合計」などの金額をOCRで自動抽出し、その半額を計算・返信するDiscord Botです。

## 特徴
- 画像内の金額を抽出
- 半額の整数値を自動計算し、コピー用に返信

## セットアップ手順
1. **リポジトリをクローン**
2. **依存パッケージをインストール**
   ```bash
   npm install
   ```
3. **Discord Botを作成し、トークンを取得**
   - [Discord Developer Portal](https://discord.com/developers/applications)でBotを作成
   - Botの「MESSAGE CONTENT INTENT」を有効化
4. **.envファイルを作成**
   プロジェクトルートに`.env`ファイルを作成し、以下のように記載：
   ```env
   DISCORD_AMOUNT_EXTRACTOR_TOKEN=あなたのBotトークン
   ```
5. **Botを起動**
   ```bash
   npm start
   ```

## Dockerでの起動方法

### 1. Docker単体で起動
```bash
docker build -t discord-amount-extractor-bot .
docker run --env-file .env discord-amount-extractor-bot
```

### 2. docker composeで簡単起動
```bash
docker compose up --build -d
```
- `.env`ファイルにBotトークンを記載しておけば自動で読み込まれます。
- 停止は `docker compose down` でOKです。

## 使い方
- Botをサーバーに招待し、画像（スクリーンショット）を投稿すると自動で金額を抽出し、半額も返信します。
- 2つ目のメッセージで「半額の整数値（点なし）」のみをコピー用に送信します。
- `!help` または `!ヘルプ` で使い方ガイドを表示します。

## 環境変数
| 変数名                              | 用途                |
|--------------------------------------|---------------------|
| DISCORD_AMOUNT_EXTRACTOR_TOKEN       | Discord Botトークン |

## 依存パッケージ
- discord.js
- tesseract.js
- axios
- sharp
- dotenv
- nodemon（開発用）

## ライセンス
MIT 