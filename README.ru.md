<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Открытый AI-агент для программирования.</p>
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

### Установка

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Менеджеры пакетов
npm i -g opencode-ai@latest        # или bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS и Linux (рекомендуем, всегда актуально)
brew install opencode              # macOS и Linux (официальная формула brew, обновляется реже)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # любая ОС
nix run nixpkgs#opencode           # или github:anomalyco/opencode для самой свежей ветки dev
```

> [!TIP]
> Перед установкой удалите версии старше 0.1.x.

### Десктопное приложение (BETA)

OpenCode также доступен как десктопное приложение. Скачайте его со [страницы релизов](https://github.com/anomalyco/opencode/releases) или с [opencode.ai/download](https://opencode.ai/download).

| Платформа             | Загрузка                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` или AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Каталог установки

Скрипт установки выбирает путь установки в следующем порядке приоритета:

1. `$OPENCODE_INSTALL_DIR` - Пользовательский каталог установки
2. `$XDG_BIN_DIR` - Путь, совместимый со спецификацией XDG Base Directory
3. `$HOME/bin` - Стандартный каталог пользовательских бинарников (если существует или можно создать)
4. `$HOME/.opencode/bin` - Fallback по умолчанию

```bash
# Примеры
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Сборка из исходного кода

Если вы хотите использовать этот форк (с интеграцией MemPalace) вместо официального релиза, соберите и установите его из исходного кода. Это заменит любую существующую команду `opencode` в вашей системе.

#### Предварительные требования

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (для `npm link`)
- [Python](https://python.org) 3.12+ (для поддержки MemPalace)
- Git

#### Клонирование и установка

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Удаление существующего OpenCode (если установлен)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Ручная установка (скрипт curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Сначала необходимо удалить существующую установку. Запуск `npm link`, пока официальный пакет всё ещё установлен глобально, может вызвать конфликты, при которых система продолжает использовать старый бинарник.

#### Глобальное связывание

```bash
# Из корня репозитория — свяжите CLI, чтобы `opencode` указывал на ваш локальный исходный код
cd packages/opencode
bun link
```

Если `bun link` не помещает бинарник в ваш `$PATH`, создайте обёртку вручную:

```bash
# Настройте путь до места, где находится ваш клон
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Если описанный выше подход не сработает, попробуйте команды ниже:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Если оба описанных выше подхода не сработают, попробуйте команды ниже:

```bash
# 1. Соберите нативный бинарник linux-x64 (встраивает Web UI) из packages/opencode
bun run build -- --single

# 2. Сделайте резервную копию текущего бинарника, если хотите иметь точку отката (необязательно)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Установите новый бинарник и сопутствующие скрипты mempalace (обязательно — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Проверка
opencode --version
```

#### Проверка

```bash
# Должна вывести версию из вашего локального исходного кода
opencode --version

# Должна указывать на вашу локальную обёртку или путь bun link
which opencode
```

#### Запуск без глобальной установки (альтернатива)

Если вы предпочитаете не заменять глобальную команду, запускайте прямо из исходного кода:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Это оставит любую существующую глобальную установку `opencode` нетронутой.

#### Установка MemPalace

```bash
pip install mempalace
```

Без этого OpenCode по-прежнему работает — просто агенты не будут иметь постоянной памяти.

#### Обновление

```bash
cd /path/to/opencode
git pull
bun install
```

Глобальная команда `opencode` автоматически подхватывает новую сборку, поскольку `npm link` создаёт символическую ссылку.

#### Возврат к официальному релизу

```bash
# Удалите связь с исходным кодом
cd /path/to/opencode/packages/opencode
bun unlink

# Если вы создавали обёртку вручную
sudo rm /usr/local/bin/opencode

# Переустановите официальный релиз
npm i -g opencode-ai@latest
```

### Постоянная память (MemPalace)

OpenCode включает встроенную поддержку [MemPalace](https://github.com/anomalyco/mempalace) — локальной, семантической системы памяти, которая обеспечивает агентам постоянное запоминание между сессиями.

Без MemPalace каждая сессия начинается с чистого листа. С ним агенты могут запоминать прежние решения, архитектурные паттерны, обнаруженные баги и трассировки рассуждений — и мгновенно извлекать их с помощью семантического поиска вместо повторного чтения всей вашей кодовой базы.

#### Что он делает

- **Семантический поиск** — агенты запрашивают прошлый контекст по смыслу, а не только по ключевым словам
- **Граф знаний** — отслеживает связи между сущностями (например, "AuthService зависит от DatabasePool")
- **Дневник сессий** — агенты записывают, над чем они работали, обеспечивая непрерывность между сессиями
- **Ограничение областью проекта** — каждый проект получает изолированную память, хранимую локально в `~/.local/share/opencode/`

#### Настройка

MemPalace требует Python 3.12+ и устанавливается отдельно:

```bash
pip install mempalace
```

Вот и всё. Настройка не нужна — OpenCode обнаруживает и инициализирует его автоматически при первом использовании.

> [!NOTE]
> MemPalace является необязательным. OpenCode работает точно так же и без него — просто агенты не будут иметь память между сессиями. Если `mempalace` не установлен, инструмент сообщает о чёткой ошибке при первом использовании, а все остальные инструменты продолжают работать нормально.

#### Разрешения

По умолчанию агент будет спрашивать перед использованием операций MemPalace. Чтобы разрешить все операции с памятью без запросов, добавьте в вашу конфигурацию:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

В OpenCode есть два встроенных агента, между которыми можно переключаться клавишей `Tab`.

- **build** - По умолчанию, агент с полным доступом для разработки
- **plan** - Агент только для чтения для анализа и изучения кода
  - По умолчанию запрещает редактирование файлов
  - Запрашивает разрешение перед выполнением bash-команд
  - Идеален для изучения незнакомых кодовых баз или планирования изменений

Также включен сабагент **general** для сложных поисков и многошаговых задач.
Он используется внутренне и может быть вызван в сообщениях через `@general`.

Подробнее об [agents](https://opencode.ai/docs/agents).

### Документация

Больше информации о том, как настроить OpenCode: [**наши docs**](https://opencode.ai/docs).

### Вклад

Если вы хотите внести вклад в OpenCode, прочитайте [contributing docs](./CONTRIBUTING.md) перед тем, как отправлять pull request.

### Разработка на базе OpenCode

Если вы делаете проект, связанный с OpenCode, и используете "opencode" как часть имени (например, "opencode-dashboard" или "opencode-mobile"), добавьте примечание в README, чтобы уточнить, что проект не создан командой OpenCode и не аффилирован с нами.

### FAQ

#### Чем это отличается от Claude Code?

По возможностям это очень похоже на Claude Code. Вот ключевые отличия:

- 100% открытый исходный код
- Не привязан ни к одному провайдеру. Хотя мы рекомендуем модели, которые предоставляем через [OpenCode Zen](https://opencode.ai/zen), OpenCode можно использовать с Claude, OpenAI, Google или даже локальными моделями. По мере развития моделей разрыв между ними будет сокращаться, а цены снижаться, поэтому независимость от провайдера важна.
- Поддержка LSP «из коробки»
- Фокус на TUI. OpenCode создан пользователями neovim и создателями [terminal.shop](https://terminal.shop); мы намерены раздвинуть границы возможного в терминале.
- Архитектура клиент/сервер. Это, например, позволяет OpenCode работать на вашем компьютере, пока вы управляете им удалённо из мобильного приложения, то есть TUI-фронтенд — лишь один из возможных клиентов.
- Постоянная память между сессиями через MemPalace. Агенты помнят то, что узнали, снижая избыточный контекст и расход токенов со временем.

---

**Присоединяйтесь к нашему сообществу** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
