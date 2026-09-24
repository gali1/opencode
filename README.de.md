<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Der Open-Source KI-Coding-Agent.</p>
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

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Paketmanager
npm i -g opencode-ai@latest        # oder bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS und Linux (empfohlen, immer aktuell)
brew install opencode              # macOS und Linux (offizielle Brew-Formula, seltener aktualisiert)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # jedes Betriebssystem
nix run nixpkgs#opencode           # oder github:anomalyco/opencode für den neuesten dev-Branch
```

> [!TIP]
> Entferne Versionen älter als 0.1.x vor der Installation.

### Desktop-App (BETA)

OpenCode ist auch als Desktop-Anwendung verfügbar. Lade sie direkt von der [Releases-Seite](https://github.com/anomalyco/opencode/releases) oder [opencode.ai/download](https://opencode.ai/download) herunter.

| Plattform             | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` oder AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installationsverzeichnis

Das Installationsskript beachtet die folgende Prioritätsreihenfolge für den Installationspfad:

1. `$OPENCODE_INSTALL_DIR` - Benutzerdefiniertes Installationsverzeichnis
2. `$XDG_BIN_DIR` - XDG Base Directory Specification-konformer Pfad
3. `$HOME/bin` - Standard-Binärverzeichnis des Users (falls vorhanden oder erstellbar)
4. `$HOME/.opencode/bin` - Standard-Fallback

```bash
# Beispiele
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Aus dem Quellcode bauen

Wenn du diesen Fork (mit MemPalace-Integration) statt des offiziellen Release ausführen möchtest, baue und installiere aus dem Quellcode. Dies ersetzt jeden vorhandenen `opencode`-Befehl auf deinem System.

#### Voraussetzungen

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (für `npm link`)
- [Python](https://python.org) 3.12+ (für MemPalace-Unterstützung)
- Git

#### Klonen und installieren

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Vorhandenes OpenCode entfernen (falls installiert)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Manuelle Installation (curl-Skript)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Du musst zuerst die vorhandene Installation entfernen. Wenn du `npm link` ausführst, während das offizielle Paket noch global installiert ist, kann dies zu Konflikten führen, bei denen das System weiterhin die alte Binärdatei auflöst.

#### Global verlinken

```bash
# Vom Repo-Root aus — verlinke die CLI, sodass `opencode` auf deinen lokalen Quellcode zeigt
cd packages/opencode
bun link
```

Falls `bun link` die Binärdatei nicht in deinen `$PATH` legt, erstelle manuell einen Wrapper:

```bash
# Passe den Pfad an den Ort deines Klons an
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Falls der obige Ansatz nicht funktioniert, versuche stattdessen die folgenden Befehle:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Falls beide obigen Ansätze nicht funktionieren, versuche stattdessen die folgenden Befehle:

```bash
# 1. Baue die native linux-x64-Binärdatei (bettet die Web-UI ein) aus packages/opencode
bun run build -- --single

# 2. Sichere die aktuelle Binärdatei, falls du einen Rollback-Punkt möchtest (optional)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Installiere die neue Binärdatei + die zugehörigen mempalace-Skripte (erforderlich — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Überprüfen
opencode --version
```

#### Überprüfen

```bash
# Sollte die Version aus deinem lokalen Quellcode ausgeben
opencode --version

# Sollte auf deinen lokalen Wrapper oder den bun-link-Pfad zeigen
which opencode
```

#### Ohne globale Installation ausführen (Alternative)

Wenn du den globalen Befehl lieber nicht ersetzen möchtest, führe direkt aus dem Quellcode aus:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Dies lässt jede vorhandene globale `opencode`-Installation unberührt.

#### MemPalace installieren

```bash
pip install mempalace
```

Ohne dies funktioniert OpenCode weiterhin — die Agents haben nur kein persistentes Gedächtnis.

#### Aktualisieren

```bash
cd /path/to/opencode
git pull
bun install
```

Der globale `opencode`-Befehl übernimmt automatisch den neuen Build, da `npm link` einen Symlink erstellt.

#### Zurück zum offiziellen Release

```bash
# Entferne den Quellcode-Link
cd /path/to/opencode/packages/opencode
bun unlink

# Falls du den manuellen Wrapper erstellt hast
sudo rm /usr/local/bin/opencode

# Installiere das offizielle Release erneut
npm i -g opencode-ai@latest
```

### Persistentes Gedächtnis (MemPalace)

OpenCode enthält eingebaute Unterstützung für [MemPalace](https://github.com/anomalyco/mempalace) — ein local-first, semantisches Gedächtnissystem, das Agents persistentes Erinnern über Sitzungen hinweg ermöglicht.

Ohne MemPalace beginnt jede Sitzung von vorn. Mit ihm können sich Agents an frühere Entscheidungen, Architekturmuster, entdeckte Bugs und Argumentationsspuren erinnern — und diese sofort über semantische Suche abrufen, anstatt deine gesamte Codebase erneut zu lesen.

#### Was es tut

- **Semantische Suche** — Agents fragen früheren Kontext nach Bedeutung ab, nicht nur nach Schlüsselwörtern
- **Wissensgraph** — verfolgt Beziehungen zwischen Entitäten (z.B. „AuthService hängt von DatabasePool ab")
- **Sitzungstagebuch** — Agents protokollieren, woran sie gearbeitet haben, was Kontinuität über Sitzungen hinweg ermöglicht
- **Projektbezogen** — jedes Projekt erhält isoliertes Gedächtnis, lokal gespeichert unter `~/.local/share/opencode/`

#### Einrichtung

MemPalace erfordert Python 3.12+ und wird separat installiert:

```bash
pip install mempalace
```

Das war's. Keine Konfiguration nötig — OpenCode erkennt und initialisiert es automatisch bei der ersten Nutzung.

> [!NOTE]
> MemPalace ist optional. OpenCode funktioniert exakt genauso ohne es — die Agents haben einfach kein Gedächtnis über Sitzungen hinweg. Wenn `mempalace` nicht installiert ist, meldet das Tool bei der ersten Nutzung einen klaren Fehler und alle anderen Tools funktionieren weiterhin normal.

#### Berechtigungen

Standardmäßig fragt der Agent, bevor er MemPalace-Operationen nutzt. Um alle Gedächtnisoperationen ohne Nachfragen zu erlauben, füge Folgendes zu deiner Konfiguration hinzu:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode enthält zwei eingebaute Agents, zwischen denen du mit der `Tab`-Taste wechseln kannst.

- **build** - Standard-Agent mit vollem Zugriff für Entwicklungsarbeit
- **plan** - Nur-Lese-Agent für Analyse und Code-Exploration
  - Verweigert Datei-Edits standardmäßig
  - Fragt vor dem Ausführen von bash-Befehlen nach
  - Ideal zum Erkunden unbekannter Codebases oder zum Planen von Änderungen

Außerdem ist ein **general**-Subagent für komplexe Suchen und mehrstufige Aufgaben enthalten.
Dieser wird intern genutzt und kann in Nachrichten mit `@general` aufgerufen werden.

Mehr dazu unter [Agents](https://opencode.ai/docs/agents).

### Dokumentation

Mehr Infos zur Konfiguration von OpenCode findest du in unseren [**Docs**](https://opencode.ai/docs).

### Beitragen

Wenn du zu OpenCode beitragen möchtest, lies bitte unsere [Contributing Docs](./CONTRIBUTING.md), bevor du einen Pull Request einreichst.

### Auf OpenCode aufbauen

Wenn du an einem Projekt arbeitest, das mit OpenCode zusammenhängt und "opencode" als Teil seines Namens verwendet (z.B. "opencode-dashboard" oder "opencode-mobile"), füge bitte einen Hinweis in deine README ein, dass es nicht vom OpenCode-Team gebaut wird und nicht in irgendeiner Weise mit uns verbunden ist.

### FAQ

#### Wie unterscheidet sich das von Claude Code?

Es ist Claude Code in Bezug auf die Fähigkeiten sehr ähnlich. Hier sind die wichtigsten Unterschiede:

- 100% Open Source
- Nicht an einen bestimmten Anbieter gebunden. Obwohl wir die Modelle empfehlen, die wir über [OpenCode Zen](https://opencode.ai/zen) bereitstellen, kann OpenCode mit Claude, OpenAI, Google oder sogar lokalen Modellen genutzt werden. Da sich Modelle weiterentwickeln, werden die Unterschiede zwischen ihnen schrumpfen und die Preise sinken, daher ist Anbieterunabhängigkeit wichtig.
- Sofort einsatzbereite LSP-Unterstützung
- Fokus auf TUI. OpenCode wird von neovim-Usern und den Machern von [terminal.shop](https://terminal.shop) entwickelt; wir werden die Grenzen des im Terminal Möglichen ausreizen.
- Eine Client/Server-Architektur. Dies erlaubt es OpenCode zum Beispiel, auf deinem Computer zu laufen, während du es aus der Ferne über eine mobile App steuerst — das TUI-Frontend ist also nur einer der möglichen Clients.
- Persistentes sitzungsübergreifendes Gedächtnis über MemPalace. Agents erinnern sich an das, was sie gelernt haben, wodurch redundanter Kontext und der Token-Verbrauch mit der Zeit reduziert werden.

---

**Tritt unserer Community bei** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
