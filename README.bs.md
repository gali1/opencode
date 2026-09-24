<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">OpenCode je open source AI agent za programiranje.</p>
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

### Instalacija

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package manageri
npm i -g opencode-ai@latest        # ili bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS i Linux (preporučeno, uvijek ažurno)
brew install opencode              # macOS i Linux (zvanična brew formula, rjeđe se ažurira)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Bilo koji OS
nix run nixpkgs#opencode           # ili github:anomalyco/opencode za najnoviji dev branch
```

> [!TIP]
> Ukloni verzije starije od 0.1.x prije instalacije.

### Desktop aplikacija (BETA)

OpenCode je dostupan i kao desktop aplikacija. Preuzmi je direktno sa [stranice izdanja](https://github.com/anomalyco/opencode/releases) ili sa [opencode.ai/download](https://opencode.ai/download).

| Platforma             | Preuzimanje                        |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, ili AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Instalacijski direktorij

Instalacijska skripta koristi sljedeći redoslijed prioriteta za putanju instalacije:

1. `$OPENCODE_INSTALL_DIR` - Prilagođeni instalacijski direktorij
2. `$XDG_BIN_DIR` - Putanja usklađena sa XDG Base Directory specifikacijom
3. `$HOME/bin` - Standardni korisnički bin direktorij (ako postoji ili se može kreirati)
4. `$HOME/.opencode/bin` - Podrazumijevana rezervna lokacija

```bash
# Primjeri
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Gradnja iz izvornog koda

Ako želiš pokrenuti ovaj fork (sa MemPalace integracijom) umjesto zvaničnog izdanja, izgradi ga i instaliraj iz izvornog koda. Ovo zamjenjuje bilo koju postojeću `opencode` komandu na tvom sistemu.

#### Preduslovi

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (za `npm link`)
- [Python](https://python.org) 3.12+ (za MemPalace podršku)
- Git

#### Kloniranje i instalacija

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Uklanjanje postojećeg OpenCode-a (ako je instaliran)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Ručna instalacija (curl skripta)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Prvo moraš ukloniti postojeću instalaciju. Pokretanje `npm link` dok je zvanični paket još uvijek globalno instaliran može izazvati konflikte gdje sistem nastavlja koristiti stari binarni fajl.

#### Globalno povezivanje

```bash
# Iz korijena repozitorija — poveži CLI tako da `opencode` pokazuje na tvoj lokalni izvorni kod
cd packages/opencode
bun link
```

Ako `bun link` ne postavi binarni fajl u tvoj `$PATH`, kreiraj wrapper ručno:

```bash
# Prilagodi putanju do mjesta gdje se nalazi tvoj klon
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Ako gornji pristup ne radi, pokušaj sa komandama ispod:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Ako oba gornja pristupa ne rade, pokušaj sa komandama ispod:

```bash
# 1. Izgradi nativni linux-x64 binarni fajl (ugrađuje Web UI) iz packages/opencode
bun run build -- --single

# 2. Napravi rezervnu kopiju trenutnog binarnog fajla ako želiš tačku za vraćanje (opcionalno)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Instaliraj novi binarni fajl + prateće mempalace skripte (obavezno — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Provjera
opencode --version
```

#### Provjera

```bash
# Trebalo bi da ispiše verziju iz tvog lokalnog izvornog koda
opencode --version

# Trebalo bi da pokazuje na tvoj lokalni wrapper ili bun link putanju
which opencode
```

#### Pokretanje bez globalne instalacije (alternativa)

Ako ne želiš zamijeniti globalnu komandu, pokreni direktno iz izvornog koda:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Ovo ostavlja bilo koju postojeću globalnu `opencode` instalaciju netaknutom.

#### Instalacija MemPalace-a

```bash
pip install mempalace
```

Bez ovoga OpenCode i dalje radi — agenti jednostavno neće imati trajnu memoriju.

#### Ažuriranje

```bash
cd /path/to/opencode
git pull
bun install
```

Globalna `opencode` komanda automatski preuzima novu gradnju jer `npm link` kreira simbolički link.

#### Vraćanje na zvanično izdanje

```bash
# Ukloni vezu sa izvornim kodom
cd /path/to/opencode/packages/opencode
bun unlink

# Ako si ručno kreirao wrapper
sudo rm /usr/local/bin/opencode

# Ponovo instaliraj zvanično izdanje
npm i -g opencode-ai@latest
```

### Trajna memorija (MemPalace)

OpenCode uključuje ugrađenu podršku za [MemPalace](https://github.com/anomalyco/mempalace) — lokalni, semantički memorijski sistem koji agentima daje trajno pamćenje kroz sesije.

Bez MemPalace-a svaka sesija počinje iz početka. Sa njim, agenti mogu pamtiti prethodne odluke, arhitektonske obrasce, otkrivene bugove i tragove rezonovanja — te ih trenutno dohvatiti putem semantičke pretrage umjesto ponovnog čitanja cijele tvoje baze koda.

#### Šta radi

- **Semantička pretraga** — agenti pretražuju prošli kontekst po značenju, a ne samo po ključnim riječima
- **Graf znanja** — prati odnose između entiteta (npr. "AuthService zavisi od DatabasePool")
- **Dnevnik sesija** — agenti bilježe na čemu su radili, omogućavajući kontinuitet kroz sesije
- **Ograničeno na projekat** — svaki projekat dobija izolovanu memoriju, pohranjenu lokalno u `~/.local/share/opencode/`

#### Postavljanje

MemPalace zahtijeva Python 3.12+ i instalira se zasebno:

```bash
pip install mempalace
```

To je to. Nije potrebna nikakva konfiguracija — OpenCode ga detektuje i inicijalizuje automatski pri prvom korištenju.

> [!NOTE]
> MemPalace je opcionalan. OpenCode radi potpuno isto i bez njega — agenti jednostavno neće imati memoriju kroz sesije. Ako `mempalace` nije instaliran, alat prijavljuje jasnu grešku pri prvom korištenju, a svi ostali alati nastavljaju normalno funkcionisati.

#### Dozvole

Podrazumijevano, agent će pitati prije korištenja MemPalace operacija. Da dozvoliš sve memorijske operacije bez upita, dodaj u svoju konfiguraciju:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agenti

OpenCode uključuje dva ugrađena agenta između kojih možeš prebacivati tasterom `Tab`.

- **build** - Podrazumijevani agent sa punim pristupom za razvoj
- **plan** - Agent samo za čitanje za analizu i istraživanje koda
  - Podrazumijevano zabranjuje izmjene datoteka
  - Traži dozvolu prije pokretanja bash komandi
  - Idealan za istraživanje nepoznatih codebase-ova ili planiranje izmjena

Uključen je i **general** pod-agent za složene pretrage i višekoračne zadatke.
Koristi se interno i može se pozvati pomoću `@general` u porukama.

Saznaj više o [agentima](https://opencode.ai/docs/agents).

### Dokumentacija

Za više informacija o konfiguraciji OpenCode-a, [**pogledaj dokumentaciju**](https://opencode.ai/docs).

### Doprinosi

Ako želiš doprinositi OpenCode-u, pročitaj [upute za doprinošenje](./CONTRIBUTING.md) prije slanja pull requesta.

### Gradnja na OpenCode-u

Ako radiš na projektu koji je povezan s OpenCode-om i koristi "opencode" kao dio naziva, npr. "opencode-dashboard" ili "opencode-mobile", dodaj napomenu u svoj README da projekat nije napravio OpenCode tim i da nije povezan s nama.

### FAQ

#### Po čemu se ovo razlikuje od Claude Code?

Po mogućnostima je vrlo sličan Claude Code. Evo ključnih razlika:

- 100% open source
- Nije vezan ni za jednog provajdera. Iako preporučujemo modele koje pružamo kroz [OpenCode Zen](https://opencode.ai/zen), OpenCode se može koristiti sa Claude, OpenAI, Google, ili čak lokalnim modelima. Kako se modeli razvijaju, razlike među njima će se smanjivati, a cijene padati, pa je nezavisnost od provajdera važna.
- LSP podrška odmah po instalaciji
- Fokus na TUI. OpenCode grade korisnici neovim-a i tvorci [terminal.shop](https://terminal.shop); namjeravamo pomjeriti granice onoga što je moguće u terminalu.
- Klijent/server arhitektura. Ovo, na primjer, omogućava da OpenCode radi na tvom računaru dok njime upravljaš daljinski putem mobilne aplikacije, što znači da je TUI frontend samo jedan od mogućih klijenata.
- Trajna memorija između sesija putem MemPalace-a. Agenti pamte ono što su naučili, smanjujući suvišan kontekst i potrošnju tokena tokom vremena.

---

**Pridruži se našoj zajednici** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
