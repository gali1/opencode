<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">AI-kodeagent med åpen kildekode.</p>
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

### Installasjon

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Pakkehåndterere
npm i -g opencode-ai@latest        # eller bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS og Linux (anbefalt, alltid oppdatert)
brew install opencode              # macOS og Linux (offisiell brew-formel, oppdateres sjeldnere)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # alle OS
nix run nixpkgs#opencode           # eller github:anomalyco/opencode for nyeste dev-branch
```

> [!TIP]
> Fjern versjoner eldre enn 0.1.x før du installerer.

### Desktop-app (BETA)

OpenCode er også tilgjengelig som en desktop-app. Last ned direkte fra [releases-siden](https://github.com/anomalyco/opencode/releases) eller [opencode.ai/download](https://opencode.ai/download).

| Plattform             | Nedlasting                         |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` eller AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installasjonsmappe

Installasjonsskriptet bruker følgende prioritet for installasjonsstien:

1. `$OPENCODE_INSTALL_DIR` - Egendefinert installasjonsmappe
2. `$XDG_BIN_DIR` - Sti som følger XDG Base Directory Specification
3. `$HOME/bin` - Standard brukerbinar-mappe (hvis den finnes eller kan opprettes)
4. `$HOME/.opencode/bin` - Standard fallback

```bash
# Eksempler
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Bygge fra kildekode

Hvis du vil kjøre denne forken (med MemPalace-integrasjon) i stedet for den offisielle utgivelsen, bygg og installer fra kildekode. Dette erstatter enhver eksisterende `opencode`-kommando på systemet ditt.

#### Forutsetninger

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (for `npm link`)
- [Python](https://python.org) 3.12+ (for MemPalace-støtte)
- Git

#### Klon og installer

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Fjern eksisterende OpenCode (hvis installert)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Manuell installasjon (curl-skript)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Du må fjerne den eksisterende installasjonen først. Å kjøre `npm link` mens den offisielle pakken fortsatt er installert globalt kan forårsake konflikter der systemet fortsetter å bruke den gamle binærfilen.

#### Lenk globalt

```bash
# Fra repo-roten — lenk CLI-en slik at `opencode` peker til din lokale kildekode
cd packages/opencode
bun link
```

Hvis `bun link` ikke plasserer binærfilen på din `$PATH`, opprett en wrapper manuelt:

```bash
# Juster stien til der klonen din ligger
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Hvis metoden ovenfor ikke fungerer, prøv kommandoene nedenfor i stedet:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Hvis begge metodene ovenfor ikke fungerer, prøv kommandoene nedenfor i stedet:

```bash
# 1. Bygg den native linux-x64-binærfilen (bygger inn Web UI) fra packages/opencode
bun run build -- --single

# 2. Sikkerhetskopier den nåværende binærfilen hvis du vil ha et tilbakerullingspunkt (valgfritt)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Installer den nye binærfilen + tilhørende mempalace-skript (påkrevd — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Verifiser
opencode --version
```

#### Verifiser

```bash
# Skal skrive ut versjonen fra din lokale kildekode
opencode --version

# Skal peke til din lokale wrapper eller bun link-sti
which opencode
```

#### Kjør uten global installasjon (alternativ)

Hvis du foretrekker å ikke erstatte den globale kommandoen, kjør direkte fra kildekode:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Dette lar enhver eksisterende global `opencode`-installasjon være urørt.

#### Installer MemPalace

```bash
pip install mempalace
```

Uten dette fungerer OpenCode fortsatt — agents får bare ikke persistent minne.

#### Oppdatering

```bash
cd /path/to/opencode
git pull
bun install
```

Den globale `opencode`-kommandoen tar automatisk i bruk den nye byggingen siden `npm link` oppretter en symlenke.

#### Tilbake til den offisielle utgivelsen

```bash
# Fjern kildekode-lenken
cd /path/to/opencode/packages/opencode
bun unlink

# Hvis du opprettet den manuelle wrapperen
sudo rm /usr/local/bin/opencode

# Installer den offisielle utgivelsen på nytt
npm i -g opencode-ai@latest
```

### Persistent minne (MemPalace)

OpenCode har innebygd støtte for [MemPalace](https://github.com/anomalyco/mempalace) — et lokalt-først, semantisk minnesystem som gir agents persistent gjenkalling på tvers av økter.

Uten MemPalace starter hver økt fra bunnen av. Med det kan agents huske tidligere beslutninger, arkitekturmønstre, oppdagede feil og resonneringsspor — og hente dem umiddelbart via semantisk søk i stedet for å lese hele kodebasen din på nytt.

#### Hva det gjør

- **Semantisk søk** — agents spør etter tidligere kontekst basert på mening, ikke bare nøkkelord
- **Kunnskapsgraf** — sporer relasjoner mellom entiteter (f.eks. "AuthService avhenger av DatabasePool")
- **Øktdagbok** — agents loggfører hva de jobbet med, noe som muliggjør kontinuitet på tvers av økter
- **Prosjektavgrenset** — hvert prosjekt får isolert minne, lagret lokalt under `~/.local/share/opencode/`

#### Oppsett

MemPalace krever Python 3.12+ og installeres separat:

```bash
pip install mempalace
```

Det er alt. Ingen konfigurasjon nødvendig — OpenCode oppdager og initialiserer det automatisk ved første bruk.

> [!NOTE]
> MemPalace er valgfritt. OpenCode fungerer nøyaktig likt uten det — agents vil bare ikke ha minne på tvers av økter. Hvis `mempalace` ikke er installert, rapporterer verktøyet en tydelig feil ved første bruk, og alle andre verktøy fortsetter å fungere som normalt.

#### Tillatelser

Som standard vil agenten spørre før den bruker MemPalace-operasjoner. For å tillate alle minneoperasjoner uten forespørsler, legg til i konfigurasjonen din:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode har to innebygde agents du kan bytte mellom med `Tab`-tasten.

- **build** - Standard, agent med full tilgang for utviklingsarbeid
- **plan** - Skrivebeskyttet agent for analyse og kodeutforsking
  - Nekter filendringer som standard
  - Spør om tillatelse før bash-kommandoer
  - Ideell for å utforske ukjente kodebaser eller planlegge endringer

Det finnes også en **general**-subagent for komplekse søk og flertrinnsoppgaver.
Den brukes internt og kan kalles via `@general` i meldinger.

Les mer om [agents](https://opencode.ai/docs/agents).

### Dokumentasjon

For mer info om hvordan du konfigurerer OpenCode, [**se dokumentasjonen**](https://opencode.ai/docs).

### Bidra

Hvis du vil bidra til OpenCode, les [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygge på OpenCode

Hvis du jobber med et prosjekt som er relatert til OpenCode og bruker "opencode" som en del av navnet; for eksempel "opencode-dashboard" eller "opencode-mobile", legg inn en merknad i README som presiserer at det ikke er bygget av OpenCode-teamet og ikke er tilknyttet oss på noen måte.

### FAQ

#### Hvordan skiller dette seg fra Claude Code?

Det er svært likt Claude Code når det gjelder kapabilitet. Her er de viktigste forskjellene:

- 100 % åpen kildekode
- Ikke bundet til noen leverandør. Selv om vi anbefaler modellene vi tilbyr gjennom [OpenCode Zen](https://opencode.ai/zen), kan OpenCode brukes med Claude, OpenAI, Google eller til og med lokale modeller. Etter hvert som modellene utvikler seg, vil forskjellene mellom dem bli mindre og prisene falle, så det er viktig å være leverandøruavhengig.
- Innebygd LSP-støtte
- Et fokus på TUI. OpenCode er bygget av neovim-brukere og skaperne av [terminal.shop](https://terminal.shop); vi kommer til å flytte grensene for hva som er mulig i terminalen.
- En klient/tjener-arkitektur. Dette kan for eksempel la OpenCode kjøre på datamaskinen din mens du styrer det eksternt fra en mobilapp, noe som betyr at TUI-frontenden bare er én av de mulige klientene.
- Persistent minne på tvers av økter via MemPalace. Agents husker hva de har lært, noe som reduserer overflødig kontekst og token-bruk over tid.

---

**Bli med i fellesskapet** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
