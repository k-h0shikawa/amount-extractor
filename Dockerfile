# Node.js公式イメージをベースにする
FROM node:20

# 作業ディレクトリを作成
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm install

# アプリ本体と学習データをコピー
COPY . .

# .envファイルはビルド時に含めないことを推奨
# 必要に応じてdocker run時にマウントや環境変数で渡す

# Botを起動
CMD ["npm", "start"] 