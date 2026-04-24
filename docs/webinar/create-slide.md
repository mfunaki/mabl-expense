# Slide Creation Guide (スライド作成ガイド)

このドキュメントは、Marpを使用してMarkdownスライドを作成・管理・生成するための総合的なガイドです。

## 概要

このプロジェクトでは、Marp（Markdown Presentation）を使用して、高品質なスライドデッキ（HTML・PDF）を生成します。

**例:**
- ソース: `/docs/webinar/slide-ja.md`
- 出力: `/docs/webinar/slide-ja.html`, `/docs/webinar/slide-ja.pdf`

---

## 1. プロジェクト情報

### 概要
このは、mablテスト自動化向けのデモアプリケーション（経費管理システム）のドキュメント用スライド生成に使用されます。

### アプリケーション構成
- **Backend API** (`apps/api`): Express + TypeScript + PostgreSQL
- **Web Frontend** (`apps/web`): Next.js 14 App Router + Tailwind CSS
- **Mobile App** (`apps/mobile`): Expo + React Native

---

## 2. ディレクトリ構造と命名規則

スライド資産は、言語別・種別別に以下の構造で管理します:

```
docs/
├── assets/                           # グローバルアセット（全webinarで共有）
│   └── common/
│       ├── bg_title.jpg             # 表紙背景画像
│       ├── bg_body.jpg              # 本文背景画像
│       └── bg_blank.jpg             # 最終ページ背景画像
└── webinar/                          # ウェビナー/プレゼンテーション
    ├── create-slide.md              # スライド作成ガイド（本ファイル）
    ├── slide-ja.md                  # 日本語スライドソース
    ├── slide-ja.html                # 生成済みHTML
    ├── slide-ja.pdf                 # 生成済みPDF
    ├── script-ja.md                 # 日本語スクリプト/ナレーション
    └── assets/
        └── ja/                      # 日本語アセット
            ├── images/              # スクリーンショット
            ├── videos/              # デモ動画 (.mp4)
            └── narration/           # ナレーションテキスト
```

**注意:** 背景画像 (`bg_*.jpg`) は `/docs/assets/common/` に配置し、全てのスライドから共通で参照します。スライドファイルからは `../assets/common/bg_*.jpg` のような相対パスで参照してください。

---

## 3. スライドレイアウトシステム

Marpのクラス指定（HTMLコメント形式）を使用して、デザインを制御します。

| スライド種別 | 適用クラス | 記述方法 | 説明 |
|:---|:---|:---|:---|
| **表紙** | `title-layout` | `<!-- _class: title-layout -->` | 背景に `bg_title.jpg` を使用。タイトルを中央に配置。 |
| **本文** | `body-layout` | `<!-- class: body-layout -->` | 背景に `bg_body.jpg` を使用。タイトルを固定位置に配置。**初出ページのみ `_` なし** |
| **最終ページ** | `blank-layout` | `<!-- _class: blank-layout -->` | 背景に `bg_blank.jpg` を使用。メッセージを中央上部に配置。 |

### クラス指定の重要なルール

- **単発のページ設定**: `_class` （アンダースコア付き）を使用
  ```markdown
  <!-- _class: title-layout -->
  ```
  
- **継続的な設定**: `class` （アンダースコアなし）を使用
  ```markdown
  <!-- class: body-layout -->
  ```

---

## 4. Markdownスタイリング規則

### 強調表現
- **強調テキスト**: `**テキスト**` を使用（自動的にmabl紫色が適用）

### コード表示
- **コードブロック**: ` ```javascript ` などのフェンス形式を使用

### ページ区切り
- **改ページ**: `---` を使用してスライドを区切る

### ページ番号制御
- Front-matter で `paginate: true` が設定されている場合、不要なページ（表紙・最終ページ）では以下を記述:
  ```markdown
  <!-- _paginate: false -->
  ```

---

## 5. Front-matter 整合性チェック

スライドファイルを作成・更新する際は、以下の整合性チェックを**必ず**実施してください。

### 5.1 Header とスライドタイトルの一致
- Front-matter の `header` 値と、表紙スライド（`title-layout`）の `# タイトル` が一致していることを確認
- 一致していない場合は、表紙スライドのタイトルを `header` に設定

```yaml
---
header: "mabl 101: テスト自動化の基礎"  # ← 表紙タイトルと一致
---
```

### 5.2 Footer の年号更新
- Front-matter の `footer` に含まれる年号が**現在の年**であることを確認
- 異なる場合は更新

```yaml
footer: "Copyright © 2026 mabl Inc."  # ← 現在の年（2026年1月時点）
```

### 5.3 保護領域
- Front-matter 内の **`style` 定義（CSS）は変更・削除しない**
- `header` と `footer` は上記ルールに従って更新可能

---

## 6. スライド生成・管理ワークフロー

### 6.1 ソーススクリプトの確認
1. `docs/webinar/script-ja.md` などのスクリプトファイルを正読
2. セクション、スライド番号、デモの順序を確認

### 6.2 スライドファイルの作成・更新
1. `docs/webinar/slide-ja.md` を作成または更新
2. Front-matter の整合性チェック（セクション5）を実施
3. 以下のクラス適用ルールを遵守:
   - 表紙: `title-layout` を適用
   - 本文: `body-layout` を適用
   - 最終ページ: `blank-layout` を適用

### 6.3 ナレーション抽出
1. `script-ja.md` の「ナレーション:」項目を抽出
2. `docs/webinar/assets/ja/narration/` ディレクトリに以下の形式で保存:
   ```
   {通し番号}_{種類}_{ID}.txt
   ```
   例: `01_slide_01.txt`, `03_demo_01.txt`

### 6.4 出力ファイル生成
以下のコマンドを実行して HTML と PDF を生成

**HTML 出力:**
```bash
npx @marp-team/marp-cli docs/webinar/slide-ja.md --html -o docs/webinar/slide-ja.html
```

**PDF 出力（背景画像必須）:**
```bash
npx @marp-team/marp-cli docs/webinar/slide-ja.md --pdf --allow-local-files -o docs/webinar/slide-ja.pdf
```

**重要:** PDF 生成時は **`--allow-local-files`** オプションが必須です。このオプションがないと背景画像が表示されません。

---

## 7. 出力ファイル命名規則

| ソース | HTML 出力 | PDF 出力 |
|:---|:---|:---|
| `slide-ja.md` | `slide-ja.html` | `slide-ja.pdf` |

---

## 8. Marp セットアップと実行

### 依存関係のインストール
```bash
npm install @marp-team/marp-cli --save-dev
```

### CLI コマンド例
```bash
# 特定のMarkdownファイルをHTMLに変換
npx @marp-team/marp-cli slide-ja.md --html -o slide-ja.html

# PDFに変換（背景画像含める）
npx @marp-team/marp-cli slide-ja.md --pdf --allow-local-files -o slide-ja.pdf

# Watch モード（自動再生成）
npx @marp-team/marp-cli --watch docs/webinar/
```

---

## 9. 最小限のスライド例

```markdown
---
marp: true
theme: default
header: "サンプルスライド"
footer: "Copyright © 2026 mabl Inc."
paginate: true
---

<!-- _class: title-layout -->

# サンプルスライド

2026年1月

---

<!-- class: body-layout -->

## セクション1

- ポイント1
- ポイント2

---

<!-- class: body-layout -->

## セクション2

**重要な情報**を記述

---

<!-- _class: blank-layout -->

# Thank you!
```

---

## 10. 実装例: /docs/webinar/ でスライド生成

### ディレクトリ構成
```
docs/
├── assets/
│   └── common/
│       ├── bg_title.jpg     # ← 共通背景画像（全スライドで使用）
│       ├── bg_body.jpg
│       └── bg_blank.jpg
└── webinar/
    ├── create-slide.md      # ← スライド作成ガイド
    ├── slide-ja.md          # ← ソースファイル
    ├── script-ja.md         # ← スクリプト参考資料
    ├── slide-ja.html        # ← 生成出力（HTML）
    ├── slide-ja.pdf         # ← 生成出力（PDF）
    └── assets/
        └── ja/
            ├── images/      # スクリーンショット
            ├── videos/      # デモ動画
            └── narration/   # ナレーションテキスト
```

### 使用例
`/docs/webinar/slide-ja.md` ファイルを完成させた後:

```bash
# HTML と PDF を同時生成
cd /docs/webinar
npx @marp-team/marp-cli slide-ja.md --html -o slide-ja.html
npx @marp-team/marp-cli slide-ja.md --pdf --allow-local-files -o slide-ja.pdf
```

結果:
- `docs/webinar/slide-ja.html` ✅ 生成完了
- `docs/webinar/slide-ja.pdf` ✅ 生成完了（背景画像含む）

---

## 11. チェックリスト

スライド作成時に確認:

- [ ] Front-matter の `header` と表紙タイトルが一致している
- [ ] Front-matter の `footer` の年号が正確である
- [ ] 表紙に `<!-- _class: title-layout -->` が適用されている
- [ ] 本文スライドに `<!-- class: body-layout -->` が適用されている
- [ ] 最終ページに `<!-- _class: blank-layout -->` が適用されている
- [ ] `---` でページが正しく区切られている
- [ ] ページ番号不要なページに `<!-- _paginate: false -->` が記述されている
- [ ] ナレーションが `assets/ja/narration/` に抽出されている
- [ ] HTML/PDF が正常に生成されている
- [ ] 背景画像がPDFに含まれている（`--allow-local-files` 使用確認）

---

## 12. トラブルシューティング

### Q: PDF に背景画像が表示されない
**A:** `--allow-local-files` オプションを忘れています。以下のコマンドを使用:
```bash
npx @marp-team/marp-cli slide-ja.md --pdf --allow-local-files -o slide-ja.pdf
```

### Q: `@marp-team/marp-cli` が見つからない
**A:** 依存関係をインストール:
```bash
npm install @marp-team/marp-cli --save-dev
```

### Q: 背景画像が見つからないエラー
**A:** 以下を確認:
1. 画像ファイルが正しいパスに存在するか
2. Markdown ファイルから相対パスが正しいか
3. ファイル名が正確か（大文字小文字を区別）

---

## 参考資料

- **Marp 公式ドキュメント**: https://marp.app/
- **Marp CLI**: https://github.com/marp-team/marp-cli
- **プロジェクトリポジトリ**: https://github.com/mfunaki/mabl-expense
