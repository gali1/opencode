<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">오픈 소스 AI 코딩 에이전트.</p>
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

### 설치

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# 패키지 매니저
npm i -g opencode-ai@latest        # bun/pnpm/yarn 도 가능
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS 및 Linux (권장, 항상 최신)
brew install opencode              # macOS 및 Linux (공식 brew formula, 업데이트 빈도 낮음)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # 어떤 OS든
nix run nixpkgs#opencode           # 또는 github:anomalyco/opencode 로 최신 dev 브랜치
```

> [!TIP]
> 설치 전에 0.1.x 보다 오래된 버전을 제거하세요.

### 데스크톱 앱 (BETA)

OpenCode 는 데스크톱 앱으로도 제공됩니다. [releases page](https://github.com/anomalyco/opencode/releases) 에서 직접 다운로드하거나 [opencode.ai/download](https://opencode.ai/download) 를 이용하세요.

| 플랫폼                | 다운로드                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, 또는 AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### 설치 디렉터리

설치 스크립트는 설치 경로를 다음 우선순위로 결정합니다.

1. `$OPENCODE_INSTALL_DIR` - 사용자 지정 설치 디렉터리
2. `$XDG_BIN_DIR` - XDG Base Directory Specification 준수 경로
3. `$HOME/bin` - 표준 사용자 바이너리 디렉터리 (존재하거나 생성 가능할 경우)
4. `$HOME/.opencode/bin` - 기본 폴백

```bash
# 예시
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### 소스에서 빌드하기

(MemPalace 가 통합된) 이 fork 를 공식 릴리스 대신 실행하려면, 소스에서 빌드하여 설치하세요. 이는 시스템에 있는 기존 `opencode` 명령을 대체합니다.

#### 사전 요구 사항

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (`npm link` 용)
- [Python](https://python.org) 3.12+ (MemPalace 지원용)
- Git

#### 클론 및 설치

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### 기존 OpenCode 제거 (설치되어 있는 경우)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# 수동 설치 (curl 스크립트)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> 먼저 기존 설치를 제거해야 합니다. 공식 패키지가 여전히 전역에 설치된 상태에서 `npm link` 를 실행하면 시스템이 계속 이전 바이너리를 해석하는 충돌이 발생할 수 있습니다.

#### 전역으로 링크

```bash
# 저장소 루트에서 —— `opencode` 가 로컬 소스를 해석하도록 CLI 를 링크합니다
cd packages/opencode
bun link
```

`bun link` 가 바이너리를 `$PATH` 에 배치하지 않으면, 수동으로 래퍼를 생성하세요:

```bash
# 클론이 위치한 경로에 맞게 조정하세요
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
위 방법이 동작하지 않으면, 대신 아래 명령을 시도하세요:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
위 두 방법 모두 동작하지 않으면, 대신 아래 명령을 시도하세요:

```bash
# 1. packages/opencode 에서 네이티브 linux-x64 바이너리 (Web UI 내장) 를 빌드
bun run build -- --single

# 2. 롤백 지점이 필요하면, 현재 바이너리를 백업 (선택)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. 새 바이너리와 함께 제공되는 mempalace 스크립트를 설치 (필수 —— build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. 확인
opencode --version
```

#### 확인

```bash
# 로컬 소스의 버전이 출력되어야 합니다
opencode --version

# 로컬 래퍼 또는 bun link 경로로 해석되어야 합니다
which opencode
```

#### 전역 설치 없이 실행 (대안)

전역 명령을 대체하고 싶지 않다면, 소스에서 직접 실행하세요:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

이렇게 하면 기존 전역 `opencode` 설치는 그대로 유지됩니다.

#### MemPalace 설치

```bash
pip install mempalace
```

이것이 없어도 OpenCode 는 여전히 동작합니다 —— 단지 에이전트가 영속적인 메모리를 갖지 못할 뿐입니다.

#### 업데이트

```bash
cd /path/to/opencode
git pull
bun install
```

`npm link` 는 심볼릭 링크를 생성하므로, 전역 `opencode` 명령은 새 빌드를 자동으로 반영합니다.

#### 공식 릴리스로 되돌리기

```bash
# 소스 링크 제거
cd /path/to/opencode/packages/opencode
bun unlink

# 수동 래퍼를 생성한 경우
sudo rm /usr/local/bin/opencode

# 공식 릴리스 재설치
npm i -g opencode-ai@latest
```

### 영속 메모리 (MemPalace)

OpenCode 에는 [MemPalace](https://github.com/anomalyco/mempalace) 에 대한 내장 지원이 포함되어 있습니다 —— 이는 로컬 우선의 시맨틱 메모리 시스템으로, 에이전트에게 세션 간 영속적인 회상 능력을 제공합니다.

MemPalace 가 없으면 각 세션은 처음부터 시작합니다. 있으면 에이전트는 이전 결정, 아키텍처 패턴, 발견한 버그, 추론 과정을 기억할 수 있으며 —— 전체 코드베이스를 다시 읽는 대신 시맨틱 검색으로 즉시 검색할 수 있습니다.

#### 무엇을 하나요

- **시맨틱 검색** —— 에이전트는 단순 키워드가 아니라 의미로 과거 컨텍스트를 조회합니다
- **지식 그래프** —— 엔티티 관계를 추적합니다 (예: "AuthService 는 DatabasePool 에 의존")
- **세션 일기** —— 에이전트가 작업한 내용을 기록하여 세션 간 연속성을 가능하게 합니다
- **프로젝트 범위** —— 각 프로젝트는 격리된 메모리를 가지며 `~/.local/share/opencode/` 아래에 로컬로 저장됩니다

#### 설정

MemPalace 는 Python 3.12+ 가 필요하며 별도로 설치합니다:

```bash
pip install mempalace
```

이것이 전부입니다. 설정은 필요 없습니다 —— OpenCode 가 최초 사용 시 자동으로 감지하고 초기화합니다.

> [!NOTE]
> MemPalace 는 선택 사항입니다. 없어도 OpenCode 는 완전히 동일하게 동작합니다 —— 단지 에이전트가 세션 간 메모리를 갖지 못할 뿐입니다. `mempalace` 가 설치되어 있지 않으면, 도구는 최초 사용 시 명확한 오류를 보고하고 다른 모든 도구는 정상적으로 계속 작동합니다.

#### 권한

기본적으로 에이전트는 MemPalace 작업을 사용하기 전에 묻습니다. 프롬프트 없이 모든 메모리 작업을 허용하려면 설정에 다음을 추가하세요:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode 에는 내장 에이전트 2개가 있으며 `Tab` 키로 전환할 수 있습니다.

- **build** - 기본값, 개발 작업을 위한 전체 권한 에이전트
- **plan** - 분석 및 코드 탐색을 위한 읽기 전용 에이전트
  - 기본적으로 파일 편집을 거부
  - bash 명령 실행 전에 권한을 요청
  - 낯선 코드베이스를 탐색하거나 변경을 계획할 때 적합

또한 복잡한 검색과 여러 단계 작업을 위한 **general** 서브 에이전트가 포함되어 있습니다.
내부적으로 사용되며, 메시지에서 `@general` 로 호출할 수 있습니다.

[agents](https://opencode.ai/docs/agents) 에 대해 더 알아보세요.

### 문서

OpenCode 설정에 대한 자세한 내용은 [**문서**](https://opencode.ai/docs) 를 참고하세요.

### 기여하기

OpenCode 에 기여하고 싶다면, Pull Request 를 제출하기 전에 [contributing docs](./CONTRIBUTING.md) 를 읽어주세요.

### OpenCode 기반으로 만들기

OpenCode 와 관련된 프로젝트를 진행하면서 이름에 "opencode"(예: "opencode-dashboard" 또는 "opencode-mobile") 를 포함한다면, README 에 해당 프로젝트가 OpenCode 팀이 만든 것이 아니며 어떤 방식으로도 우리와 제휴되어 있지 않다는 점을 명시해 주세요.

### FAQ

#### Claude Code 와 무엇이 다른가요?

기능 면에서는 Claude Code 와 매우 유사합니다. 주요 차이점은 다음과 같습니다:

- 100% 오픈 소스
- 어떤 프로바이더에도 종속되지 않습니다. [OpenCode Zen](https://opencode.ai/zen) 을 통해 제공하는 모델을 권장하지만, OpenCode 는 Claude, OpenAI, Google, 심지어 로컬 모델과도 함께 사용할 수 있습니다. 모델이 발전함에 따라 그 격차는 좁혀지고 가격은 내려가므로, 프로바이더에 종속되지 않는 것이 중요합니다.
- 기본 제공되는 LSP 지원
- TUI 에 집중. OpenCode 는 neovim 사용자와 [terminal.shop](https://terminal.shop) 의 제작자들이 만들었으며, 우리는 터미널에서 가능한 것의 한계를 밀어붙일 것입니다.
- 클라이언트/서버 아키텍처. 예를 들어 이를 통해 OpenCode 를 자신의 컴퓨터에서 실행하면서 모바일 앱에서 원격으로 조작할 수 있습니다. 즉, TUI 프런트엔드는 가능한 클라이언트 중 하나일 뿐입니다.
- MemPalace 를 통한 세션 간 영속 메모리. 에이전트는 학습한 내용을 기억하여 시간이 지남에 따라 중복 컨텍스트와 토큰 사용량을 줄입니다.

---

**커뮤니티에 참여하기** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
