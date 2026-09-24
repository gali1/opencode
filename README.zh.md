<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">开源的 AI Coding Agent。</p>
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

### 安装

```bash
# 直接安装 (YOLO)
curl -fsSL https://opencode.ai/install | bash

# 软件包管理器
npm i -g opencode-ai@latest        # 也可使用 bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS 和 Linux（推荐，始终保持最新）
brew install opencode              # macOS 和 Linux（官方 brew formula，更新频率较低）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # 任意系统
nix run nixpkgs#opencode           # 或用 github:anomalyco/opencode 获取最新 dev 分支
```

> [!TIP]
> 安装前请先移除 0.1.x 之前的旧版本。

### 桌面应用程序 (BETA)

OpenCode 也提供桌面版应用。可直接从 [发布页 (releases page)](https://github.com/anomalyco/opencode/releases) 或 [opencode.ai/download](https://opencode.ai/download) 下载。

| 平台                  | 下载文件                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`、`.rpm` 或 AppImage         |

```bash
# macOS (Homebrew Cask)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### 安装目录

安装脚本按照以下优先级决定安装路径：

1. `$OPENCODE_INSTALL_DIR` - 自定义安装目录
2. `$XDG_BIN_DIR` - 符合 XDG 基础目录规范的路径
3. `$HOME/bin` - 如果存在或可创建的用户二进制目录
4. `$HOME/.opencode/bin` - 默认备用路径

```bash
# 示例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### 从源码构建

如果你想运行此 fork（集成了 MemPalace）而非官方发行版，请从源码构建并安装。这会替换系统上已有的 `opencode` 命令。

#### 前置条件

- [Bun](https://bun.sh) v1.1+（`curl -fsSL https://bun.sh/install | bash`）
- [Node.js](https://nodejs.org) v20+（用于 `npm link`）
- [Python](https://python.org) 3.12+（用于 MemPalace 支持）
- Git

#### 克隆并安装

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### 移除已有的 OpenCode（如果已安装）

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# 手动安装（curl 脚本）
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> 你必须先移除已有的安装。在官方包仍全局安装的情况下运行 `npm link` 可能导致冲突，使系统继续解析到旧的二进制文件。

#### 全局链接

```bash
# 在仓库根目录 —— 链接 CLI，使 `opencode` 解析到你的本地源码
cd packages/opencode
bun link
```

如果 `bun link` 没有把二进制文件放入你的 `$PATH`，请手动创建一个包装脚本：

```bash
# 将路径调整为你的克隆所在位置
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
如果上述方法无效，请改用下面的命令：

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
如果上述两种方法都无效，请改用下面的命令：

```bash
# 1. 从 packages/opencode 构建原生 linux-x64 二进制文件（内嵌 Web UI）
bun run build -- --single

# 2. 如果你想保留回滚点，先备份当前二进制文件（可选）
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. 安装新的二进制文件及其配套的 mempalace 脚本（必需 —— build.ts:160-161）
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. 验证
opencode --version
```

#### 验证

```bash
# 应打印来自你本地源码的版本号
opencode --version

# 应解析到你的本地包装脚本或 bun link 路径
which opencode
```

#### 无需全局安装即可运行（备选方案）

如果你不想替换全局命令，可直接从源码运行：

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

这样不会影响任何已有的全局 `opencode` 安装。

#### 安装 MemPalace

```bash
pip install mempalace
```

没有它，OpenCode 仍可正常工作 —— 只是 Agent 不会拥有持久记忆。

#### 更新

```bash
cd /path/to/opencode
git pull
bun install
```

由于 `npm link` 创建的是符号链接，全局 `opencode` 命令会自动使用新的构建。

#### 恢复到官方发行版

```bash
# 移除源码链接
cd /path/to/opencode/packages/opencode
bun unlink

# 如果你创建了手动包装脚本
sudo rm /usr/local/bin/opencode

# 重新安装官方发行版
npm i -g opencode-ai@latest
```

### 持久化记忆 (MemPalace)

OpenCode 内置了对 [MemPalace](https://github.com/anomalyco/mempalace) 的支持 —— 这是一个本地优先的语义记忆系统，让 Agent 能够跨会话持久回忆。

没有 MemPalace 时，每个会话都从零开始。有了它，Agent 可以记住先前的决策、架构模式、发现的 bug 以及推理过程 —— 并通过语义搜索即时检索，而无需重新阅读你的整个代码库。

#### 它能做什么

- **语义搜索** —— Agent 按含义而非仅仅关键词来查询过去的上下文
- **知识图谱** —— 追踪实体关系（例如 “AuthService 依赖 DatabasePool”）
- **会话日记** —— Agent 记录自己所做的工作，实现跨会话的连续性
- **项目级隔离** —— 每个项目拥有独立的记忆，本地存储于 `~/.local/share/opencode/`

#### 设置

MemPalace 需要 Python 3.12+，并单独安装：

```bash
pip install mempalace
```

就这样。无需配置 —— OpenCode 会在首次使用时自动检测并初始化它。

> [!NOTE]
> MemPalace 是可选的。没有它 OpenCode 也能完全正常工作 —— 只是 Agent 不会拥有跨会话记忆。如果未安装 `mempalace`，该工具会在首次使用时报告一个明确的错误，其他所有工具将继续正常运行。

#### 权限

默认情况下，Agent 在使用 MemPalace 操作前会先询问。若要允许所有记忆操作而不再提示，请在你的配置中添加：

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode 内置两种 Agent，可用 `Tab` 键快速切换：

- **build** - 默认模式，具备完整权限，适合开发工作
- **plan** - 只读模式，适合代码分析与探索
  - 默认拒绝修改文件
  - 运行 bash 命令前会询问
  - 便于探索未知代码库或规划改动

另外还包含一个 **general** 子 Agent，用于复杂搜索和多步任务，内部使用，也可在消息中输入 `@general` 调用。

了解更多 [Agents](https://opencode.ai/docs/agents) 相关信息。

### 文档

更多配置说明请查看我们的 [**官方文档**](https://opencode.ai/docs)。

### 参与贡献

如有兴趣贡献代码，请在提交 PR 前阅读 [贡献指南 (Contributing Docs)](./CONTRIBUTING.md)。

### 基于 OpenCode 进行开发

如果你在项目名中使用了 “opencode”（如 “opencode-dashboard” 或 “opencode-mobile”），请在 README 里注明该项目不是 OpenCode 团队官方开发，且不存在隶属关系。

### 常见问题

#### 它与 Claude Code 有何不同？

在能力方面，它与 Claude Code 非常相似。以下是主要区别：

- 100% 开源
- 不绑定任何服务提供商。虽然我们推荐通过 [OpenCode Zen](https://opencode.ai/zen) 提供的模型，但 OpenCode 也可以配合 Claude、OpenAI、Google 甚至本地模型使用。随着模型的发展，它们之间的差距会缩小、价格会下降，因此保持与服务提供商无关非常重要。
- 开箱即用的 LSP 支持
- 专注于 TUI。OpenCode 由 neovim 用户以及 [terminal.shop](https://terminal.shop) 的创作者打造；我们将不断突破终端中可能实现的极限。
- 客户端/服务器架构。例如，这可以让 OpenCode 在你的电脑上运行，同时你通过移动应用远程操控它，也就是说 TUI 前端只是众多可能的客户端之一。
- 通过 MemPalace 实现的跨会话持久记忆。Agent 会记住它们所学到的内容，随着时间推移减少冗余上下文和 token 消耗。

---

**加入我们的社区** [飞书](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=52ao9352-5623-4fa0-b7dd-3407c392c1af&qr_code=true) | [X.com](https://x.com/opencode)
