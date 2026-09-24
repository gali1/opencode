<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">オープンソースのAIコーディングエージェント。</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### インストール

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# パッケージマネージャー
npm i -g opencode-ai@latest        # bun/pnpm/yarn でもOK
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS と Linux（推奨。常に最新）
brew install opencode              # macOS と Linux（公式 brew formula。更新頻度は低め）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # どのOSでも
nix run nixpkgs#opencode           # または github:anomalyco/opencode で最新 dev ブランチ
```

> [!TIP]
> インストール前に 0.1.x より古いバージョンを削除してください。

### デスクトップアプリ (BETA)

OpenCode はデスクトップアプリとしても利用できます。[releases page](https://github.com/anomalyco/opencode/releases) から直接ダウンロードするか、[opencode.ai/download](https://opencode.ai/download) を利用してください。

| プラットフォーム      | ダウンロード                       |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`、`.rpm`、または AppImage    |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### インストールディレクトリ

インストールスクリプトは、インストール先パスを次の優先順位で決定します。

1. `$OPENCODE_INSTALL_DIR` - カスタムのインストールディレクトリ
2. `$XDG_BIN_DIR` - XDG Base Directory Specification に準拠したパス
3. `$HOME/bin` - 標準のユーザー用バイナリディレクトリ（存在する場合、または作成できる場合）
4. `$HOME/.opencode/bin` - デフォルトのフォールバック

```bash
# 例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### ソースからのビルド

（MemPalace を統合した）このフォークを公式リリースの代わりに実行したい場合は、ソースからビルドしてインストールします。これはシステム上の既存の `opencode` コマンドを置き換えます。

#### 前提条件

- [Bun](https://bun.sh) v1.1+（`curl -fsSL https://bun.sh/install | bash`）
- [Node.js](https://nodejs.org) v20+（`npm link` 用）
- [Python](https://python.org) 3.12+（MemPalace サポート用）
- Git

#### クローンとインストール

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### 既存の OpenCode を削除（インストール済みの場合）

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# 手動インストール（curl スクリプト）
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> 先に既存のインストールを削除する必要があります。公式パッケージがグローバルにインストールされたまま `npm link` を実行すると、システムが古いバイナリを解決し続ける競合が発生することがあります。

#### グローバルにリンク

```bash
# リポジトリのルートから —— `opencode` がローカルソースを解決するよう CLI をリンクします
cd packages/opencode
bun link
```

`bun link` がバイナリを `$PATH` に配置しない場合は、手動でラッパーを作成してください:

```bash
# パスをクローンの場所に合わせて調整してください
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
上記の方法がうまくいかない場合は、代わりに以下のコマンドを試してください:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
上記の両方の方法がうまくいかない場合は、代わりに以下のコマンドを試してください:

```bash
# 1. packages/opencode からネイティブの linux-x64 バイナリ（Web UI を埋め込み）をビルド
bun run build -- --single

# 2. ロールバックポイントが欲しい場合は、現在のバイナリをバックアップ（任意）
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. 新しいバイナリとその付属の mempalace スクリプトをインストール（必須 —— build.ts:160-161）
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. 検証
opencode --version
```

#### 検証

```bash
# ローカルソースのバージョンが表示されるはずです
opencode --version

# ローカルのラッパーまたは bun link のパスに解決されるはずです
which opencode
```

#### グローバルインストールなしで実行（代替方法）

グローバルコマンドを置き換えたくない場合は、ソースから直接実行します:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

これにより、既存のグローバルな `opencode` インストールはそのまま維持されます。

#### MemPalace のインストール

```bash
pip install mempalace
```

これがなくても OpenCode は動作します —— ただし Agent が永続的なメモリを持たないだけです。

#### 更新

```bash
cd /path/to/opencode
git pull
bun install
```

`npm link` はシンボリックリンクを作成するため、グローバルな `opencode` コマンドは新しいビルドを自動的に取り込みます。

#### 公式リリースに戻す

```bash
# ソースリンクを削除
cd /path/to/opencode/packages/opencode
bun unlink

# 手動でラッパーを作成した場合
sudo rm /usr/local/bin/opencode

# 公式リリースを再インストール
npm i -g opencode-ai@latest
```

### 永続メモリ (MemPalace)

OpenCode には [MemPalace](https://github.com/anomalyco/mempalace) の組み込みサポートが含まれています —— これはローカルファーストのセマンティックメモリシステムで、Agent にセッションをまたぐ永続的な想起を与えます。

MemPalace がないと、各セッションはゼロから始まります。あると、Agent は以前の決定、アーキテクチャパターン、発見したバグ、推論の経緯を記憶でき —— コードベース全体を読み直す代わりに、セマンティック検索で即座に取り出せます。

#### 何ができるのか

- **セマンティック検索** —— Agent はキーワードだけでなく意味で過去のコンテキストを問い合わせます
- **ナレッジグラフ** —— エンティティ間の関係を追跡します（例: 「AuthService は DatabasePool に依存する」）
- **セッション日記** —— Agent は取り組んだ内容を記録し、セッションをまたぐ継続性を可能にします
- **プロジェクト単位** —— 各プロジェクトは分離されたメモリを持ち、`~/.local/share/opencode/` 配下にローカル保存されます

#### セットアップ

MemPalace には Python 3.12+ が必要で、別途インストールします:

```bash
pip install mempalace
```

これだけです。設定は不要です —— OpenCode は初回使用時に自動的に検出して初期化します。

> [!NOTE]
> MemPalace は任意です。なくても OpenCode はまったく同じように動作します —— 単に Agent がセッションをまたぐメモリを持たないだけです。`mempalace` がインストールされていない場合、このツールは初回使用時に明確なエラーを報告し、他のすべてのツールは通常どおり機能し続けます。

#### 権限

デフォルトでは、Agent は MemPalace 操作を使用する前に確認します。プロンプトなしですべてのメモリ操作を許可するには、設定に次を追加します:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode には組み込みの Agent が2つあり、`Tab` キーで切り替えられます。

- **build** - デフォルト。開発向けのフルアクセス Agent
- **plan** - 分析とコード探索向けの読み取り専用 Agent
  - デフォルトでファイル編集を拒否
  - bash コマンド実行前に確認
  - 未知のコードベース探索や変更計画に最適

また、複雑な検索やマルチステップのタスク向けに **general** サブ Agent も含まれています。
内部的に使用されており、メッセージで `@general` と入力して呼び出せます。

[agents](https://opencode.ai/docs/agents) の詳細はこちら。

### ドキュメント

OpenCode の設定については [**ドキュメント**](https://opencode.ai/docs) を参照してください。

### コントリビュート

OpenCode に貢献したい場合は、Pull Request を送る前に [contributing docs](./CONTRIBUTING.md) を読んでください。

### OpenCode の上に構築する

OpenCode に関連するプロジェクトで、名前に "opencode"（例: "opencode-dashboard" や "opencode-mobile"）を含める場合は、そのプロジェクトが OpenCode チームによって作られたものではなく、いかなる形でも関係がないことを README に明記してください。

### FAQ

#### Claude Code とは何が違いますか？

機能面では Claude Code と非常によく似ています。主な違いは次のとおりです。

- 100% オープンソース
- どのプロバイダーにも縛られません。[OpenCode Zen](https://opencode.ai/zen) を通じて提供するモデルを推奨していますが、OpenCode は Claude、OpenAI、Google、さらにはローカルモデルとも併用できます。モデルが進化するにつれてそれらの差は縮まり、価格も下がるため、プロバイダーに依存しないことは重要です。
- すぐに使える LSP サポート
- TUI への注力。OpenCode は neovim ユーザーと [terminal.shop](https://terminal.shop) の作者によって作られており、ターミナルで可能なことの限界を押し広げていきます。
- クライアント/サーバーアーキテクチャ。これにより、たとえば OpenCode を自分のコンピューター上で実行しつつ、モバイルアプリからリモートで操作することができます。つまり TUI フロントエンドは、可能なクライアントのひとつにすぎません。
- MemPalace によるセッションをまたぐ永続メモリ。Agent は学んだことを記憶し、時間とともに冗長なコンテキストとトークン使用量を削減します。

---

**コミュニティに参加** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
