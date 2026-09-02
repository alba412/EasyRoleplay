# EasyRoleplay

日本語ネイティブのAIロールプレイクライアント兼キャラクターカード投稿基盤。

設計方針とスキーマは [CLAUDE.md](./CLAUDE.md) を参照。

## 動かす

```bash
npm install
cp .env.example .env.local   # OPENROUTER_API_KEY を記入する
npm run dev
```

`http://localhost:3000` を開く。

`.env.local` を書き換えたら開発サーバを再起動すること。

## 進捗

実装順序（CLAUDE.md）に対する現在地。

- [x] 1. チャットが動く（OpenRouter、IME処理、キャラは決め打ち）
- [ ] 2. カードスキーマをZodで定義
- [ ] 3. コンパイル層（カード → プロンプト）
- [ ] 4. カード管理UI（作成・編集・PNG入出力）
- [ ] 5. World Info
- [ ] 6. ComfyUI連携
- [ ] 7. 投稿機能

現状のキャラクターは `src/lib/prompt/temporaryCharacter.ts` に決め打ちで置いてある。
実装順序3のコンパイル層で置き換わる。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック |
