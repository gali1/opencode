<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Otwartoźródłowy agent kodujący AI.</p>
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

### Instalacja

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Menedżery pakietów
npm i -g opencode-ai@latest        # albo bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS i Linux (polecane, zawsze aktualne)
brew install opencode              # macOS i Linux (oficjalna formuła brew, rzadziej aktualizowana)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # dowolny system
nix run nixpkgs#opencode           # lub github:anomalyco/opencode dla najnowszej gałęzi dev
```

> [!TIP]
> Przed instalacją usuń wersje starsze niż 0.1.x.

### Aplikacja desktopowa (BETA)

OpenCode jest także dostępny jako aplikacja desktopowa. Pobierz ją bezpośrednio ze strony [releases](https://github.com/anomalyco/opencode/releases) lub z [opencode.ai/download](https://opencode.ai/download).

| Platforma             | Pobieranie                         |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` lub AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Katalog instalacji

Skrypt instalacyjny stosuje następujący priorytet wyboru ścieżki instalacji:

1. `$OPENCODE_INSTALL_DIR` - Własny katalog instalacji
2. `$XDG_BIN_DIR` - Ścieżka zgodna ze specyfikacją XDG Base Directory
3. `$HOME/bin` - Standardowy katalog binarny użytkownika (jeśli istnieje lub można go utworzyć)
4. `$HOME/.opencode/bin` - Domyślny fallback

```bash
# Przykłady
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Budowanie ze źródeł

Jeśli chcesz uruchomić ten fork (z integracją MemPalace) zamiast oficjalnego wydania, zbuduj i zainstaluj go ze źródeł. Zastąpi to każdą istniejącą komendę `opencode` w twoim systemie.

#### Wymagania wstępne

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (dla `npm link`)
- [Python](https://python.org) 3.12+ (dla obsługi MemPalace)
- Git

#### Klonowanie i instalacja

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Usunięcie istniejącego OpenCode (jeśli zainstalowany)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Instalacja ręczna (skrypt curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Najpierw musisz usunąć istniejącą instalację. Uruchomienie `npm link`, gdy oficjalny pakiet jest wciąż zainstalowany globalnie, może powodować konflikty, w których system nadal używa starego binarium.

#### Linkowanie globalne

```bash
# Z katalogu głównego repozytorium — zlinkuj CLI, aby `opencode` wskazywał na twój lokalny kod źródłowy
cd packages/opencode
bun link
```

Jeśli `bun link` nie umieści binarium w twoim `$PATH`, utwórz wrapper ręcznie:

```bash
# Dostosuj ścieżkę do miejsca, w którym znajduje się twój klon
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Jeśli powyższe podejście nie zadziała, spróbuj poniższych komend:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Jeśli oba powyższe podejścia nie zadziałają, spróbuj poniższych komend:

```bash
# 1. Zbuduj natywne binarium linux-x64 (osadza Web UI) z packages/opencode
bun run build -- --single

# 2. Zrób kopię zapasową bieżącego binarium, jeśli chcesz mieć punkt przywracania (opcjonalnie)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Zainstaluj nowe binarium i towarzyszące mu skrypty mempalace (wymagane — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Weryfikacja
opencode --version
```

#### Weryfikacja

```bash
# Powinno wypisać wersję z twojego lokalnego kodu źródłowego
opencode --version

# Powinno wskazywać na twój lokalny wrapper lub ścieżkę bun link
which opencode
```

#### Uruchamianie bez instalacji globalnej (alternatywa)

Jeśli wolisz nie zastępować globalnej komendy, uruchom bezpośrednio ze źródeł:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Pozostawia to każdą istniejącą globalną instalację `opencode` nienaruszoną.

#### Instalacja MemPalace

```bash
pip install mempalace
```

Bez tego OpenCode nadal działa — agenci po prostu nie będą mieć trwałej pamięci.

#### Aktualizacja

```bash
cd /path/to/opencode
git pull
bun install
```

Globalna komenda `opencode` automatycznie podchwytuje nową kompilację, ponieważ `npm link` tworzy dowiązanie symboliczne.

#### Powrót do oficjalnego wydania

```bash
# Usuń dowiązanie do źródeł
cd /path/to/opencode/packages/opencode
bun unlink

# Jeśli utworzyłeś wrapper ręcznie
sudo rm /usr/local/bin/opencode

# Zainstaluj ponownie oficjalne wydanie
npm i -g opencode-ai@latest
```

### Pamięć trwała (MemPalace)

OpenCode zawiera wbudowane wsparcie dla [MemPalace](https://github.com/anomalyco/mempalace) — lokalnego, semantycznego systemu pamięci, który zapewnia agentom trwałe zapamiętywanie między sesjami.

Bez MemPalace każda sesja zaczyna się od zera. Z nim agenci mogą pamiętać wcześniejsze decyzje, wzorce architektoniczne, wykryte błędy i ślady rozumowania — oraz błyskawicznie je odzyskiwać dzięki wyszukiwaniu semantycznemu, zamiast ponownie czytać całą bazę kodu.

#### Co robi

- **Wyszukiwanie semantyczne** — agenci odpytują wcześniejszy kontekst według znaczenia, a nie tylko słów kluczowych
- **Graf wiedzy** — śledzi relacje między encjami (np. "AuthService zależy od DatabasePool")
- **Dziennik sesji** — agenci zapisują, nad czym pracowali, umożliwiając ciągłość między sesjami
- **Ograniczone do projektu** — każdy projekt otrzymuje izolowaną pamięć, przechowywaną lokalnie w `~/.local/share/opencode/`

#### Konfiguracja

MemPalace wymaga Python 3.12+ i jest instalowany osobno:

```bash
pip install mempalace
```

To wszystko. Nie jest potrzebna żadna konfiguracja — OpenCode wykrywa go i inicjalizuje automatycznie przy pierwszym użyciu.

> [!NOTE]
> MemPalace jest opcjonalny. OpenCode działa dokładnie tak samo bez niego — agenci po prostu nie będą mieć pamięci między sesjami. Jeśli `mempalace` nie jest zainstalowany, narzędzie zgłasza czytelny błąd przy pierwszym użyciu, a wszystkie pozostałe narzędzia działają normalnie.

#### Uprawnienia

Domyślnie agent zapyta przed użyciem operacji MemPalace. Aby zezwolić na wszystkie operacje pamięci bez pytań, dodaj do swojej konfiguracji:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode zawiera dwóch wbudowanych agentów, między którymi możesz przełączać się klawiszem `Tab`.

- **build** - Domyślny agent z pełnym dostępem do pracy developerskiej
- **plan** - Agent tylko do odczytu do analizy i eksploracji kodu
  - Domyślnie odmawia edycji plików
  - Pyta o zgodę przed uruchomieniem komend bash
  - Idealny do poznawania nieznanych baz kodu lub planowania zmian

Dodatkowo jest subagent **general** do złożonych wyszukiwań i wieloetapowych zadań.
Jest używany wewnętrznie i można go wywołać w wiadomościach przez `@general`.

Dowiedz się więcej o [agents](https://opencode.ai/docs/agents).

### Dokumentacja

Więcej informacji o konfiguracji OpenCode znajdziesz w [**dokumentacji**](https://opencode.ai/docs).

### Współtworzenie

Jeśli chcesz współtworzyć OpenCode, przeczytaj [contributing docs](./CONTRIBUTING.md) przed wysłaniem pull requesta.

### Budowanie na OpenCode

Jeśli pracujesz nad projektem związanym z OpenCode i używasz "opencode" jako części nazwy (na przykład "opencode-dashboard" lub "opencode-mobile"), dodaj proszę notatkę do swojego README, aby wyjaśnić, że projekt nie jest tworzony przez zespół OpenCode i nie jest z nami w żaden sposób powiązany.

### FAQ

#### Czym to się różni od Claude Code?

Pod względem możliwości jest bardzo podobny do Claude Code. Oto kluczowe różnice:

- 100% open source
- Nie jest przypisany do żadnego dostawcy. Chociaż polecamy modele, które udostępniamy przez [OpenCode Zen](https://opencode.ai/zen), OpenCode może być używany z Claude, OpenAI, Google, a nawet lokalnymi modelami. W miarę rozwoju modeli różnice między nimi będą się zmniejszać, a ceny spadać, więc niezależność od dostawcy jest ważna.
- Wsparcie LSP od razu po instalacji
- Nacisk na TUI. OpenCode jest tworzony przez użytkowników neovim i twórców [terminal.shop](https://terminal.shop); zamierzamy przesuwać granice tego, co możliwe w terminalu.
- Architektura klient/serwer. Pozwala to na przykład, aby OpenCode działał na twoim komputerze, podczas gdy sterujesz nim zdalnie z aplikacji mobilnej, co oznacza, że frontend TUI to tylko jeden z możliwych klientów.
- Trwała pamięć między sesjami dzięki MemPalace. Agenci pamiętają to, czego się nauczyli, z czasem redukując nadmiarowy kontekst i zużycie tokenów.

---

**Dołącz do naszej społeczności** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
