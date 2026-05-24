# FilmBeat

TextAlive App API を使った、フィルムカメラとターンテーブルをモチーフにしたリリックカメラアプリです。

楽曲再生中に歌詞アニメーションへシャッターを切って、撮った瞬間をフィルムのコマとして保存し、曲のあとでターンテーブル上に並べて鑑賞できます。


## 主な機能

- TextAlive と連携した歌詞同期表示
- 手動シャッターと自動シャッターの切り替え
- フィルム / レコード / 露光 / ヴィンテージの 4 フィルタ
- カメラ ON/OFF 切り替え
- Canvas での歌詞付きフレームキャプチャ
- 撮影結果を並べるターンテーブル鑑賞画面
- 撮影したフレームの保存

## 技術スタック

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- Framer Motion
- textalive-app-api
- Canvas API
- getUserMedia API

## 画面フロー

1. トークン入力・楽曲選択
2. 再生画面で歌詞にあわせてシャッター
3. 撮影結果をターンテーブル画面で再生・逆再生

## 必要なもの

- Node.js 18 以上
- TextAlive App Token
- カメラを使う場合はブラウザのカメラ許可

TextAlive App Token は TextAlive Developer Portal で取得します。

- https://developer.textalive.jp/

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 必要なら `.env.local` を作成

```bash
VITE_TEXTALIVE_TOKEN=your_textalive_token
```

`.env.local` は [.gitignore](.gitignore) に含まれているため、通常は Git に含まれません。

3. 開発サーバーを起動

```bash
npm run dev
```

4. ブラウザで表示された URL を開く

トークンを `.env.local` に入れていない場合は、起動後のセットアップ画面から直接入力できます。

## 利用できるコマンド

```bash
npm run dev
npm run build
npm run preview
```

## 開発時のメモ

- localhost 開発時は Songle への取得で CORS に引っかかるため、Vite の開発用 middleware で同一オリジンに寄せています
- そのため、ローカル開発では Vite の dev server 経由で起動する前提です
- カメラを許可しなくても、背景付きの表示モードで動作します

## 本番公開時の注意

- TextAlive 連携アプリは HTTPS 配信を前提にしたほうが安定します
- ローカル確認だけでなく、公開前に HTTPS 環境で再生確認してください
- TextAlive App Customizer や ngrok などを使った検証も有効です

## ディレクトリ構成

```text
src/
  App.tsx
  main.tsx
  index.css
  vite-env.d.ts
  types.ts
  components/
  hooks/
  utils/
```

主な役割は以下の通りです。

- [src/components](src/components) : 画面 UI
- [src/hooks](src/hooks) : TextAlive / カメラ制御
- [src/utils](src/utils) : キャプチャ処理
