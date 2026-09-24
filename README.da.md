<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Den open source AI-kodeagent.</p>
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

# Pakkehåndteringer
npm i -g opencode-ai@latest        # eller bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS og Linux (anbefalet, altid up to date)
brew install opencode              # macOS og Linux (officiel brew formula, opdateres sjældnere)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # alle OS
nix run nixpkgs#opencode           # eller github:anomalyco/opencode for nyeste dev-branch
```

> [!TIP]
> Fjern versioner ældre end 0.1.x før installation.

### Desktop-app (BETA)

OpenCode findes også som desktop-app. Download direkte fra [releases-siden](https://github.com/anomalyco/opencode/releases) eller [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, eller AppImage     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installationsmappe

Installationsscriptet bruger følgende prioriteringsrækkefølge for installationsstien:

1. `$OPENCODE_INSTALL_DIR` - Tilpasset installationsmappe
2. `$XDG_BIN_DIR` - Sti der følger XDG Base Directory Specification
3. `$HOME/bin` - Standard bruger-bin-mappe (hvis den findes eller kan oprettes)
4. `$HOME/.opencode/bin` - Standard fallback

```bash
# Eksempler
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Byg fra kildekode

Hvis du vil køre denne fork (med MemPalace-integration) i stedet for den officielle udgivelse, så byg og installer fra kildekode. Dette erstatter enhver eksisterende `opencode`-kommando på dit system.

#### Forudsætninger

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (til `npm link`)
- [Python](https://python.org) 3.12+ (til MemPalace-understøttelse)
- Git

#### Klon og installer

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Fjern eksisterende OpenCode (hvis installeret)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Manuel installation (curl-script)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Du skal fjerne den eksisterende installation først. At køre `npm link`, mens den officielle pakke stadig er installeret globalt, kan skabe konflikter, hvor systemet fortsat bruger den gamle binærfil.

#### Link globalt

```bash
# Fra repo-roden — link CLI'en, så `opencode` peger på din lokale kildekode
cd packages/opencode
bun link
```

Hvis `bun link` ikke placerer binærfilen på din `$PATH`, så opret en wrapper manuelt:

```bash
# Tilpas stien til hvor din klon ligger
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Hvis ovenstående metode ikke virker, så prøv kommandoerne nedenfor i stedet:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Hvis begge ovenstående metoder ikke virker, så prøv kommandoerne nedenfor i stedet:

```bash
# 1. Byg den native linux-x64-binærfil (indlejrer Web UI) fra packages/opencode
bun run build -- --single

# 2. Sikkerhedskopiér den nuværende binærfil, hvis du vil have et tilbagerulningspunkt (valgfrit)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Installer den nye binærfil + dens tilhørende mempalace-scripts (påkrævet — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Verificer
opencode --version
```

#### Verificer

```bash
# Bør udskrive versionen fra din lokale kildekode
opencode --version

# Bør pege på din lokale wrapper eller bun link-sti
which opencode
```

#### Kør uden global installation (alternativ)

Hvis du foretrækker ikke at erstatte den globale kommando, så kør direkte fra kildekode:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Dette lader enhver eksisterende global `opencode`-installation være urørt.

#### Installer MemPalace

```bash
pip install mempalace
```

Uden dette virker OpenCode stadig — agents får bare ikke persistent hukommelse.

#### Opdatering

```bash
cd /path/to/opencode
git pull
bun install
```

Den globale `opencode`-kommando anvender automatisk den nye build, da `npm link` opretter et symlink.

#### Tilbage til den officielle udgivelse

```bash
# Fjern kildekode-linket
cd /path/to/opencode/packages/opencode
bun unlink

# Hvis du oprettede den manuelle wrapper
sudo rm /usr/local/bin/opencode

# Geninstaller den officielle udgivelse
npm i -g opencode-ai@latest
```

### Persistent hukommelse (MemPalace)

OpenCode har indbygget understøttelse af [MemPalace](https://github.com/anomalyco/mempalace) — et lokalt-først, semantisk hukommelsessystem, der giver agents persistent genkaldelse på tvers af sessioner.

Uden MemPalace starter hver session forfra. Med det kan agents huske tidligere beslutninger, arkitekturmønstre, opdagede fejl og ræsonnementsspor — og hente dem øjeblikkeligt via semantisk søgning i stedet for at genlæse hele din kodebase.

#### Hvad det gør

- **Semantisk søgning** — agents søger tidligere kontekst efter betydning, ikke kun nøgleord
- **VidenGraf** — sporer relationer mellem entiteter (f.eks. "AuthService afhænger af DatabasePool")
- **Sessionsdagbog** — agents logger, hvad de arbejdede på, hvilket muliggør kontinuitet på tvers af sessioner
- **Projektafgrænset** — hvert projekt får isoleret hukommelse, gemt lokalt under `~/.local/share/opencode/`

#### Opsætning

MemPalace kræver Python 3.12+ og installeres separat:

```bash
pip install mempalace
```

Det er det hele. Ingen konfiguration nødvendig — OpenCode registrerer og initialiserer det automatisk ved første brug.

> [!NOTE]
> MemPalace er valgfrit. OpenCode virker præcis ens uden det — agents har bare ikke hukommelse på tvers af sessioner. Hvis `mempalace` ikke er installeret, rapporterer værktøjet en tydelig fejl ved første brug, og alle andre værktøjer fungerer fortsat normalt.

#### Tilladelser

Som standard spørger agenten, før den bruger MemPalace-operationer. For at tillade alle hukommelsesoperationer uden forespørgsler, tilføj til din konfiguration:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode har to indbyggede agents, som du kan skifte mellem med `Tab`-tasten.

- **build** - Standard, agent med fuld adgang til udviklingsarbejde
- **plan** - Skrivebeskyttet agent til analyse og kodeudforskning
  - Afviser filredigering som standard
  - Spørger om tilladelse før bash-kommandoer
  - Ideel til at udforske ukendte kodebaser eller planlægge ændringer

Derudover findes der en **general**-subagent til komplekse søgninger og flertrinsopgaver.
Den bruges internt og kan kaldes via `@general` i beskeder.

Læs mere om [agents](https://opencode.ai/docs/agents).

### Dokumentation

For mere info om konfiguration af OpenCode, [**se vores docs**](https://opencode.ai/docs).

### Bidrag

Hvis du vil bidrage til OpenCode, så læs vores [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygget på OpenCode

Hvis du arbejder på et projekt der er relateret til OpenCode og bruger "opencode" som en del af navnet; f.eks. "opencode-dashboard" eller "opencode-mobile", så tilføj en note i din README, der tydeliggør at projektet ikke er bygget af OpenCode-teamet og ikke er tilknyttet os på nogen måde.

### FAQ

#### Hvordan adskiller dette sig fra Claude Code?

Det ligner meget Claude Code med hensyn til kapabilitet. Her er de vigtigste forskelle:

- 100 % open source
- Ikke bundet til nogen udbyder. Selvom vi anbefaler de modeller, vi tilbyder gennem [OpenCode Zen](https://opencode.ai/zen), kan OpenCode bruges med Claude, OpenAI, Google eller endda lokale modeller. Efterhånden som modellerne udvikler sig, vil forskellene mellem dem mindskes, og priserne falde, så det er vigtigt at være udbyderuafhængig.
- Indbygget LSP-understøttelse
- Et fokus på TUI. OpenCode er bygget af neovim-brugere og skaberne af [terminal.shop](https://terminal.shop); vi vil skubbe grænserne for, hvad der er muligt i terminalen.
- En klient/server-arkitektur. Dette kan for eksempel lade OpenCode køre på din computer, mens du styrer det eksternt fra en mobilapp, hvilket betyder, at TUI-frontenden blot er én af de mulige klienter.
- Persistent hukommelse på tværs af sessioner via MemPalace. Agents husker, hvad de har lært, hvilket reducerer overflødig kontekst og token-forbrug over tid.

---

**Bliv en del af vores community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
