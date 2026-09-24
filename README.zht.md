<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">開源的 AI Coding Agent。</p>
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

### 安裝

```bash
# 直接安裝 (YOLO)
curl -fsSL https://opencode.ai/install | bash

# 套件管理員
npm i -g opencode-ai@latest        # 也可使用 bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS 與 Linux（推薦，始終保持最新）
brew install opencode              # macOS 與 Linux（官方 brew formula，更新頻率較低）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # 任何作業系統
nix run nixpkgs#opencode           # 或使用 github:anomalyco/opencode 以取得最新開發分支
```

> [!TIP]
> 安裝前請先移除 0.1.x 以前的舊版本。

### 桌面應用程式 (BETA)

OpenCode 也提供桌面版應用程式。您可以直接從 [發佈頁面 (releases page)](https://github.com/anomalyco/opencode/releases) 或 [opencode.ai/download](https://opencode.ai/download) 下載。

| 平台                  | 下載連結                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, 或 AppImage        |

```bash
# macOS (Homebrew Cask)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### 安裝目錄

安裝腳本會依據以下優先順序決定安裝路徑：

1. `$OPENCODE_INSTALL_DIR` - 自定義安裝目錄
2. `$XDG_BIN_DIR` - 符合 XDG 基礎目錄規範的路徑
3. `$HOME/bin` - 標準使用者執行檔目錄 (若存在或可建立)
4. `$HOME/.opencode/bin` - 預設備用路徑

```bash
# 範例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### 從原始碼建置

如果您想執行此 fork（整合了 MemPalace）而非官方發行版，請從原始碼建置並安裝。這會取代系統上已有的 `opencode` 指令。

#### 前置需求

- [Bun](https://bun.sh) v1.1+（`curl -fsSL https://bun.sh/install | bash`）
- [Node.js](https://nodejs.org) v20+（用於 `npm link`）
- [Python](https://python.org) 3.12+（用於 MemPalace 支援）
- Git

#### 複製並安裝

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### 移除已有的 OpenCode（若已安裝）

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# 手動安裝（curl 腳本）
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> 您必須先移除已有的安裝。在官方套件仍全域安裝的情況下執行 `npm link` 可能導致衝突，使系統繼續解析到舊的二進位檔案。

#### 全域連結

```bash
# 在儲存庫根目錄 —— 連結 CLI，使 `opencode` 解析到您的本機原始碼
cd packages/opencode
bun link
```

如果 `bun link` 沒有將二進位檔案放入您的 `$PATH`，請手動建立一個包裝腳本：

```bash
# 將路徑調整為您的複製所在位置
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
若上述方法無效，請改用下面的指令：

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
若上述兩種方法皆無效，請改用下面的指令：

```bash
# 1. 從 packages/opencode 建置原生 linux-x64 二進位檔案（內嵌 Web UI）
bun run build -- --single

# 2. 若您想保留回復點，先備份目前的二進位檔案（選用）
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. 安裝新的二進位檔案及其配套的 mempalace 腳本（必要 —— build.ts:160-161）
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. 驗證
opencode --version
```

#### 驗證

```bash
# 應印出來自您本機原始碼的版本號
opencode --version

# 應解析到您的本機包裝腳本或 bun link 路徑
which opencode
```

#### 無需全域安裝即可執行（替代方案）

如果您不想取代全域指令，可直接從原始碼執行：

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

這樣不會影響任何已有的全域 `opencode` 安裝。

#### 安裝 MemPalace

```bash
pip install mempalace
```

沒有它，OpenCode 仍可正常運作 —— 只是 Agent 不會擁有持久記憶。

#### 更新

```bash
cd /path/to/opencode
git pull
bun install
```

由於 `npm link` 建立的是符號連結，全域 `opencode` 指令會自動採用新的建置。

#### 恢復到官方發行版

```bash
# 移除原始碼連結
cd /path/to/opencode/packages/opencode
bun unlink

# 若您建立了手動包裝腳本
sudo rm /usr/local/bin/opencode

# 重新安裝官方發行版
npm i -g opencode-ai@latest
```

### 持久化記憶 (MemPalace)

OpenCode 內建了對 [MemPalace](https://github.com/anomalyco/mempalace) 的支援 —— 這是一個本機優先的語意記憶系統，讓 Agent 能夠跨工作階段持久回想。

沒有 MemPalace 時，每個工作階段都從零開始。有了它，Agent 可以記住先前的決策、架構模式、發現的 bug 以及推理過程 —— 並透過語意搜尋即時擷取，而無需重新閱讀您的整個程式碼庫。

#### 它能做什麼

- **語意搜尋** —— Agent 依含義而非僅關鍵字來查詢過去的情境
- **知識圖譜** —— 追蹤實體關係（例如「AuthService 依賴 DatabasePool」）
- **工作階段日誌** —— Agent 記錄自己所做的工作，實現跨工作階段的連續性
- **專案範圍隔離** —— 每個專案擁有獨立的記憶，本機儲存於 `~/.local/share/opencode/`

#### 設定

MemPalace 需要 Python 3.12+，並單獨安裝：

```bash
pip install mempalace
```

就這樣。無需設定 —— OpenCode 會在首次使用時自動偵測並初始化它。

> [!NOTE]
> MemPalace 是選用的。沒有它 OpenCode 也能完全正常運作 —— 只是 Agent 不會擁有跨工作階段記憶。如果未安裝 `mempalace`，該工具會在首次使用時回報一個明確的錯誤，其他所有工具將繼續正常運作。

#### 權限

預設情況下，Agent 在使用 MemPalace 操作前會先詢問。若要允許所有記憶操作而不再提示，請在您的設定中加入：

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode 內建了兩種 Agent，您可以使用 `Tab` 鍵快速切換。

- **build** - 預設模式，具備完整權限的 Agent，適用於開發工作。
- **plan** - 唯讀模式，適用於程式碼分析與探索。
  - 預設禁止修改檔案。
  - 執行 bash 指令前會詢問權限。
  - 非常適合用來探索陌生的程式碼庫或規劃變更。

此外，OpenCode 還包含一個 **general** 子 Agent，用於處理複雜搜尋與多步驟任務。此 Agent 供系統內部使用，亦可透過在訊息中輸入 `@general` 來呼叫。

了解更多關於 [Agents](https://opencode.ai/docs/agents) 的資訊。

### 線上文件

關於如何設定 OpenCode 的詳細資訊，請參閱我們的 [**官方文件**](https://opencode.ai/docs)。

### 參與貢獻

如果您有興趣參與 OpenCode 的開發，請在提交 Pull Request 前先閱讀我們的 [貢獻指南 (Contributing Docs)](./CONTRIBUTING.md)。

### 基於 OpenCode 進行開發

如果您正在開發與 OpenCode 相關的專案，並在名稱中使用了 "opencode"（例如 "opencode-dashboard" 或 "opencode-mobile"），請在您的 README 中加入聲明，說明該專案並非由 OpenCode 團隊開發，且與我們沒有任何隸屬關係。

### 常見問題

#### 它與 Claude Code 有何不同？

在能力方面，它與 Claude Code 非常相似。以下是主要區別：

- 100% 開源
- 不綁定任何服務供應商。雖然我們推薦透過 [OpenCode Zen](https://opencode.ai/zen) 提供的模型，但 OpenCode 也可以搭配 Claude、OpenAI、Google 甚至本機模型使用。隨著模型的發展，它們之間的差距會縮小、價格會下降，因此保持與服務供應商無關非常重要。
- 開箱即用的 LSP 支援
- 專注於 TUI。OpenCode 由 neovim 使用者以及 [terminal.shop](https://terminal.shop) 的創作者打造；我們將不斷突破終端機中可能實現的極限。
- 主從式（client/server）架構。例如，這可以讓 OpenCode 在您的電腦上執行，同時您透過行動應用程式遠端操控它，也就是說 TUI 前端只是眾多可能的用戶端之一。
- 透過 MemPalace 實現的跨工作階段持久記憶。Agent 會記住它們所學到的內容，隨著時間推移減少冗餘情境與 token 消耗。

---

**加入我們的社群** [飞书](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=52ao9352-5623-4fa0-b7dd-3407c392c1af&qr_code=true) | [X.com](https://x.com/opencode)
