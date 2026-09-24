<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo OpenCode">
    </picture>
  </a>
</p>
<p align="center">L’agente di coding AI open source.</p>
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

### Installazione

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package manager
npm i -g opencode-ai@latest        # oppure bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS e Linux (consigliato, sempre aggiornato)
brew install opencode              # macOS e Linux (formula brew ufficiale, aggiornata meno spesso)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Qualsiasi OS
nix run nixpkgs#opencode           # oppure github:anomalyco/opencode per l’ultima branch di sviluppo
```

> [!TIP]
> Rimuovi le versioni precedenti alla 0.1.x prima di installare.

### App Desktop (BETA)

OpenCode è disponibile anche come applicazione desktop. Puoi scaricarla direttamente dalla [pagina delle release](https://github.com/anomalyco/opencode/releases) oppure da [opencode.ai/download](https://opencode.ai/download).

| Piattaforma           | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, oppure AppImage    |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Directory di installazione

Lo script di installazione rispetta il seguente ordine di priorità per il percorso di installazione:

1. `$OPENCODE_INSTALL_DIR` – Directory di installazione personalizzata
2. `$XDG_BIN_DIR` – Percorso conforme alla XDG Base Directory Specification
3. `$HOME/bin` – Directory binaria standard dell’utente (se esiste o può essere creata)
4. `$HOME/.opencode/bin` – Fallback predefinito

```bash
# Esempi
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Compilare dai sorgenti

Se vuoi eseguire questo fork (con l'integrazione di MemPalace) invece della release ufficiale, compila e installa dai sorgenti. Questo sostituisce qualsiasi comando `opencode` esistente sul tuo sistema.

#### Prerequisiti

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (per `npm link`)
- [Python](https://python.org) 3.12+ (per il supporto a MemPalace)
- Git

#### Clonare e installare

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Rimuovere OpenCode esistente (se installato)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Installazione manuale (script curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Devi prima rimuovere l'installazione esistente. Eseguire `npm link` mentre il pacchetto ufficiale è ancora installato globalmente può causare conflitti in cui il sistema continua a risolvere il vecchio binario.

#### Collegare globalmente

```bash
# Dalla radice del repo — collega la CLI così che `opencode` punti ai tuoi sorgenti locali
cd packages/opencode
bun link
```

Se `bun link` non colloca il binario nel tuo `$PATH`, crea manualmente un wrapper:

```bash
# Adatta il percorso a dove risiede il tuo clone
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Se l'approccio precedente non funziona, prova invece i comandi qui sotto:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Se entrambi gli approcci precedenti non funzionano, prova invece i comandi qui sotto:

```bash
# 1. Compila il binario nativo linux-x64 (incorpora la Web UI) da packages/opencode
bun run build -- --single

# 2. Fai un backup del binario attuale se vuoi un punto di rollback (opzionale)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Installa il nuovo binario + i suoi script mempalace complementari (richiesto — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Verifica
opencode --version
```

#### Verificare

```bash
# Dovrebbe stampare la versione dai tuoi sorgenti locali
opencode --version

# Dovrebbe puntare al tuo wrapper locale o al percorso di bun link
which opencode
```

#### Eseguire senza installazione globale (alternativa)

Se preferisci non sostituire il comando globale, esegui direttamente dai sorgenti:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Questo lascia intatta qualsiasi installazione globale esistente di `opencode`.

#### Installare MemPalace

```bash
pip install mempalace
```

Senza questo, OpenCode funziona comunque — gli agenti semplicemente non avranno memoria persistente.

#### Aggiornare

```bash
cd /path/to/opencode
git pull
bun install
```

Il comando globale `opencode` recepisce automaticamente la nuova build poiché `npm link` crea un collegamento simbolico.

#### Tornare alla release ufficiale

```bash
# Rimuovi il collegamento ai sorgenti
cd /path/to/opencode/packages/opencode
bun unlink

# Se hai creato il wrapper manuale
sudo rm /usr/local/bin/opencode

# Reinstalla la release ufficiale
npm i -g opencode-ai@latest
```

### Memoria persistente (MemPalace)

OpenCode include il supporto integrato per [MemPalace](https://github.com/anomalyco/mempalace) — un sistema di memoria semantica local-first che offre agli agenti un richiamo persistente tra le sessioni.

Senza MemPalace, ogni sessione riparte da zero. Con esso, gli agenti possono ricordare decisioni precedenti, pattern architetturali, bug scoperti e tracce di ragionamento — e recuperarli istantaneamente tramite ricerca semantica invece di rileggere l'intera codebase.

#### Cosa fa

- **Ricerca semantica** — gli agenti interrogano il contesto passato per significato, non solo per parole chiave
- **Grafo della conoscenza** — traccia le relazioni tra entità (ad esempio, "AuthService dipende da DatabasePool")
- **Diario di sessione** — gli agenti annotano ciò su cui hanno lavorato, permettendo la continuità tra le sessioni
- **Ambito di progetto** — ogni progetto ottiene una memoria isolata, memorizzata localmente in `~/.local/share/opencode/`

#### Configurazione

MemPalace richiede Python 3.12+ e si installa separatamente:

```bash
pip install mempalace
```

Tutto qui. Nessuna configurazione necessaria — OpenCode lo rileva e lo inizializza automaticamente al primo utilizzo.

> [!NOTE]
> MemPalace è opzionale. OpenCode funziona esattamente allo stesso modo senza di esso — gli agenti semplicemente non avranno memoria tra le sessioni. Se `mempalace` non è installato, lo strumento segnala un errore chiaro al primo utilizzo e tutti gli altri strumenti continuano a funzionare normalmente.

#### Autorizzazioni

Per impostazione predefinita, l'agente chiederà prima di usare le operazioni MemPalace. Per consentire tutte le operazioni di memoria senza richieste, aggiungi alla tua configurazione:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agenti

OpenCode include due agenti integrati tra cui puoi passare usando il tasto `Tab`.

- **build** – Predefinito, agente con accesso completo per il lavoro di sviluppo
- **plan** – Agente in sola lettura per analisi ed esplorazione del codice
  - Nega le modifiche ai file per impostazione predefinita
  - Chiede il permesso prima di eseguire comandi bash
  - Ideale per esplorare codebase sconosciute o pianificare modifiche

È inoltre incluso un sotto-agente **general** per ricerche complesse e attività multi-step.
Viene utilizzato internamente e può essere invocato usando `@general` nei messaggi.

Scopri di più sugli [agenti](https://opencode.ai/docs/agents).

### Documentazione

Per maggiori informazioni su come configurare OpenCode, [**consulta la nostra documentazione**](https://opencode.ai/docs).

### Contribuire

Se sei interessato a contribuire a OpenCode, leggi la nostra [guida alla contribuzione](./CONTRIBUTING.md) prima di inviare una pull request.

### Costruire su OpenCode

Se stai lavorando a un progetto correlato a OpenCode e che utilizza “opencode” come parte del nome (ad esempio “opencode-dashboard” o “opencode-mobile”), aggiungi una nota nel tuo README per chiarire che non è sviluppato dal team OpenCode e che non è affiliato in alcun modo con noi.

### FAQ

#### In cosa è diverso da Claude Code?

È molto simile a Claude Code in termini di capacità. Ecco le differenze principali:

- 100% open source
- Non vincolato ad alcun provider. Anche se consigliamo i modelli che forniamo tramite [OpenCode Zen](https://opencode.ai/zen), OpenCode può essere usato con Claude, OpenAI, Google, o persino modelli locali. Man mano che i modelli si evolvono, i divari tra loro si ridurranno e i prezzi caleranno, quindi essere agnostici rispetto al provider è importante.
- Supporto LSP pronto all'uso
- Un focus sulla TUI. OpenCode è sviluppato da utenti di neovim e dai creatori di [terminal.shop](https://terminal.shop); intendiamo spingere i limiti di ciò che è possibile nel terminale.
- Un'architettura client/server. Questo, ad esempio, può consentire a OpenCode di girare sul tuo computer mentre lo controlli da remoto tramite un'app mobile, il che significa che il frontend TUI è solo uno dei client possibili.
- Memoria persistente tra le sessioni tramite MemPalace. Gli agenti ricordano ciò che hanno imparato, riducendo il contesto ridondante e l'uso di token nel tempo.

---

**Unisciti alla nostra community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
