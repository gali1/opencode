<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">AI-агент для програмування з відкритим кодом.</p>
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

### Встановлення

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Менеджери пакетів
npm i -g opencode-ai@latest        # або bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS і Linux (рекомендовано, завжди актуально)
brew install opencode              # macOS і Linux (офіційна формула Homebrew, оновлюється рідше)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Будь-яка ОС
nix run nixpkgs#opencode           # або github:anomalyco/opencode для найновішої dev-гілки
```

> [!TIP]
> Перед встановленням видаліть версії старші за 0.1.x.

### Десктопний застосунок (BETA)

OpenCode також доступний як десктопний застосунок. Завантажуйте напряму зі [сторінки релізів](https://github.com/anomalyco/opencode/releases) або [opencode.ai/download](https://opencode.ai/download).

| Платформа             | Завантаження                       |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` або AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Каталог встановлення

Скрипт встановлення дотримується такого порядку пріоритету для шляху встановлення:

1. `$OPENCODE_INSTALL_DIR` - Користувацький каталог встановлення
2. `$XDG_BIN_DIR` - Шлях, сумісний зі специфікацією XDG Base Directory
3. `$HOME/bin` - Стандартний каталог користувацьких бінарників (якщо існує або його можна створити)
4. `$HOME/.opencode/bin` - Резервний варіант за замовчуванням

```bash
# Приклади
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Збірка з вихідного коду

Якщо ви хочете використовувати цей форк (з інтеграцією MemPalace) замість офіційного релізу, зберіть та встановіть його з вихідного коду. Це замінить будь-яку наявну команду `opencode` у вашій системі.

#### Передумови

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (для `npm link`)
- [Python](https://python.org) 3.12+ (для підтримки MemPalace)
- Git

#### Клонування та встановлення

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Видалення наявного OpenCode (якщо встановлено)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Ручне встановлення (скрипт curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Спершу потрібно видалити наявне встановлення. Запуск `npm link`, поки офіційний пакет усе ще встановлено глобально, може спричинити конфлікти, за яких система продовжує використовувати старий бінарник.

#### Глобальне зв'язування

```bash
# З кореня репозиторію — зв'яжіть CLI, щоб `opencode` вказував на ваш локальний вихідний код
cd packages/opencode
bun link
```

Якщо `bun link` не розміщує бінарник у вашому `$PATH`, створіть обгортку вручну:

```bash
# Налаштуйте шлях до місця, де знаходиться ваш клон
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Якщо описаний вище підхід не спрацює, спробуйте команди нижче:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Якщо обидва описані вище підходи не спрацюють, спробуйте команди нижче:

```bash
# 1. Зберіть нативний бінарник linux-x64 (вбудовує Web UI) з packages/opencode
bun run build -- --single

# 2. Зробіть резервну копію поточного бінарника, якщо хочете мати точку відкату (необов'язково)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Встановіть новий бінарник і супутні скрипти mempalace (обов'язково — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Перевірка
opencode --version
```

#### Перевірка

```bash
# Має вивести версію з вашого локального вихідного коду
opencode --version

# Має вказувати на вашу локальну обгортку або шлях bun link
which opencode
```

#### Запуск без глобального встановлення (альтернатива)

Якщо ви віддаєте перевагу не замінювати глобальну команду, запускайте безпосередньо з вихідного коду:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Це залишає будь-яке наявне глобальне встановлення `opencode` недоторканим.

#### Встановлення MemPalace

```bash
pip install mempalace
```

Без цього OpenCode усе одно працює — просто агенти не матимуть постійної пам'яті.

#### Оновлення

```bash
cd /path/to/opencode
git pull
bun install
```

Глобальна команда `opencode` автоматично підхоплює нову збірку, оскільки `npm link` створює символічне посилання.

#### Повернення до офіційного релізу

```bash
# Видаліть зв'язок із вихідним кодом
cd /path/to/opencode/packages/opencode
bun unlink

# Якщо ви створювали обгортку вручну
sudo rm /usr/local/bin/opencode

# Перевстановіть офіційний реліз
npm i -g opencode-ai@latest
```

### Постійна пам'ять (MemPalace)

OpenCode містить вбудовану підтримку [MemPalace](https://github.com/anomalyco/mempalace) — локальної, семантичної системи пам'яті, яка надає агентам постійне запам'ятовування між сесіями.

Без MemPalace кожна сесія починається з нуля. З ним агенти можуть запам'ятовувати попередні рішення, архітектурні патерни, виявлені баги та трасування міркувань — і миттєво отримувати їх за допомогою семантичного пошуку замість повторного читання всієї вашої кодової бази.

#### Що він робить

- **Семантичний пошук** — агенти запитують минулий контекст за змістом, а не лише за ключовими словами
- **Граф знань** — відстежує зв'язки між сутностями (наприклад, "AuthService залежить від DatabasePool")
- **Щоденник сесій** — агенти записують, над чим вони працювали, забезпечуючи безперервність між сесіями
- **Обмеження областю проєкту** — кожен проєкт отримує ізольовану пам'ять, що зберігається локально в `~/.local/share/opencode/`

#### Налаштування

MemPalace потребує Python 3.12+ і встановлюється окремо:

```bash
pip install mempalace
```

Ось і все. Налаштування не потрібне — OpenCode виявляє та ініціалізує його автоматично при першому використанні.

> [!NOTE]
> MemPalace є необов'язковим. OpenCode працює точно так само і без нього — просто агенти не матимуть пам'яті між сесіями. Якщо `mempalace` не встановлено, інструмент повідомляє про чітку помилку при першому використанні, а всі інші інструменти продовжують працювати нормально.

#### Дозволи

За замовчуванням агент запитуватиме перед використанням операцій MemPalace. Щоб дозволити всі операції з пам'яттю без запитів, додайте до вашої конфігурації:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Агенти

OpenCode містить два вбудовані агенти, між якими можна перемикатися клавішею `Tab`.

- **build** - Агент за замовчуванням із повним доступом для завдань розробки
- **plan** - Агент лише для читання для аналізу та дослідження коду
  - За замовчуванням забороняє редагування файлів
  - Запитує дозвіл перед запуском bash-команд
  - Ідеально підходить для дослідження незнайомих кодових баз або планування змін

Також доступний допоміжний агент **general** для складного пошуку та багатокрокових завдань.
Він використовується всередині системи й може бути викликаний у повідомленнях через `@general`.

Дізнайтеся більше про [agents](https://opencode.ai/docs/agents).

### Документація

Щоб дізнатися більше про налаштування OpenCode, [**перейдіть до нашої документації**](https://opencode.ai/docs).

### Внесок

Якщо ви хочете зробити внесок в OpenCode, будь ласка, прочитайте нашу [документацію для контриб'юторів](./CONTRIBUTING.md) перед надсиланням pull request.

### Проєкти на базі OpenCode

Якщо ви працюєте над проєктом, пов'язаним з OpenCode, і використовуєте "opencode" у назві, наприклад "opencode-dashboard" або "opencode-mobile", додайте примітку до свого README.
Уточніть, що цей проєкт не створений командою OpenCode і жодним чином не афілійований із нами.

### FAQ

#### Чим це відрізняється від Claude Code?

За можливостями це дуже схоже на Claude Code. Ось ключові відмінності:

- 100% відкритий вихідний код
- Не прив'язаний до жодного провайдера. Хоча ми рекомендуємо моделі, які надаємо через [OpenCode Zen](https://opencode.ai/zen), OpenCode можна використовувати з Claude, OpenAI, Google або навіть локальними моделями. У міру розвитку моделей розрив між ними скорочуватиметься, а ціни знижуватимуться, тому незалежність від провайдера важлива.
- Підтримка LSP «з коробки»
- Фокус на TUI. OpenCode створений користувачами neovim і творцями [terminal.shop](https://terminal.shop); ми маємо намір розсунути межі можливого в терміналі.
- Архітектура клієнт/сервер. Це, наприклад, дозволяє OpenCode працювати на вашому комп'ютері, поки ви керуєте ним віддалено з мобільного застосунку, тобто TUI-фронтенд — лише один із можливих клієнтів.
- Постійна пам'ять між сесіями через MemPalace. Агенти пам'ятають те, що вивчили, зменшуючи надлишковий контекст і витрати токенів із часом.

---

**Приєднуйтеся до нашої спільноти** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
