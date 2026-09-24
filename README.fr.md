<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo OpenCode">
    </picture>
  </a>
</p>
<p align="center">L'agent de codage IA open source.</p>
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

# Gestionnaires de paquets
npm i -g opencode-ai@latest        # ou bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS et Linux (recommandé, toujours à jour)
brew install opencode              # macOS et Linux (formule officielle brew, mise à jour moins fréquente)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # n'importe quel OS
nix run nixpkgs#opencode           # ou github:anomalyco/opencode pour la branche dev la plus récente
```

> [!TIP]
> Supprimez les versions antérieures à 0.1.x avant d'installer.

### Application de bureau (BETA)

OpenCode est aussi disponible en application de bureau. Téléchargez-la directement depuis la [page des releases](https://github.com/anomalyco/opencode/releases) ou [opencode.ai/download](https://opencode.ai/download).

| Plateforme            | Téléchargement                     |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, ou AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Répertoire d'installation

Le script d'installation respecte l'ordre de priorité suivant pour le chemin d'installation :

1. `$OPENCODE_INSTALL_DIR` - Répertoire d'installation personnalisé
2. `$XDG_BIN_DIR` - Chemin conforme à la spécification XDG Base Directory
3. `$HOME/bin` - Répertoire binaire utilisateur standard (s'il existe ou peut être créé)
4. `$HOME/.opencode/bin` - Repli par défaut

```bash
# Exemples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Compiler depuis les sources

Si vous voulez exécuter ce fork (avec l'intégration MemPalace) plutôt que la version officielle, compilez et installez depuis les sources. Cela remplace toute commande `opencode` existante sur votre système.

#### Prérequis

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (pour `npm link`)
- [Python](https://python.org) 3.12+ (pour la prise en charge de MemPalace)
- Git

#### Cloner et installer

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Supprimer OpenCode existant (si installé)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Installation manuelle (script curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Vous devez d'abord supprimer l'installation existante. Exécuter `npm link` alors que le paquet officiel est encore installé globalement peut provoquer des conflits où le système continue de résoudre l'ancien binaire.

#### Lier globalement

```bash
# Depuis la racine du dépôt — liez la CLI afin que `opencode` pointe vers vos sources locales
cd packages/opencode
bun link
```

Si `bun link` ne place pas le binaire dans votre `$PATH`, créez un wrapper manuellement :

```bash
# Ajustez le chemin vers l'emplacement de votre clone
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Si l'approche ci-dessus ne fonctionne pas, essayez plutôt les commandes ci-dessous :

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Si les deux approches ci-dessus ne fonctionnent pas, essayez plutôt les commandes ci-dessous :

```bash
# 1. Compilez le binaire natif linux-x64 (intègre l'interface Web) depuis packages/opencode
bun run build -- --single

# 2. Sauvegardez le binaire actuel si vous voulez un point de restauration (optionnel)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Installez le nouveau binaire + ses scripts mempalace associés (requis — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Vérifiez
opencode --version
```

#### Vérifier

```bash
# Devrait afficher la version de vos sources locales
opencode --version

# Devrait pointer vers votre wrapper local ou le chemin de bun link
which opencode
```

#### Exécuter sans installation globale (alternative)

Si vous préférez ne pas remplacer la commande globale, exécutez directement depuis les sources :

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Cela laisse intacte toute installation globale existante d'`opencode`.

#### Installer MemPalace

```bash
pip install mempalace
```

Sans cela, OpenCode fonctionne quand même — les agents n'auront simplement pas de mémoire persistante.

#### Mettre à jour

```bash
cd /path/to/opencode
git pull
bun install
```

La commande globale `opencode` prend automatiquement en compte le nouveau build puisque `npm link` crée un lien symbolique.

#### Revenir à la version officielle

```bash
# Supprimez le lien vers les sources
cd /path/to/opencode/packages/opencode
bun unlink

# Si vous avez créé le wrapper manuel
sudo rm /usr/local/bin/opencode

# Réinstallez la version officielle
npm i -g opencode-ai@latest
```

### Mémoire persistante (MemPalace)

OpenCode inclut une prise en charge intégrée de [MemPalace](https://github.com/anomalyco/mempalace) — un système de mémoire sémantique local-first qui donne aux agents un rappel persistant entre les sessions.

Sans MemPalace, chaque session repart de zéro. Avec lui, les agents peuvent se souvenir des décisions antérieures, des modèles d'architecture, des bugs découverts et des traces de raisonnement — et les récupérer instantanément via une recherche sémantique au lieu de relire toute votre base de code.

#### Ce qu'il fait

- **Recherche sémantique** — les agents interrogent le contexte passé par le sens, pas seulement par mots-clés
- **Graphe de connaissances** — suit les relations entre entités (par exemple, « AuthService dépend de DatabasePool »)
- **Journal de session** — les agents consignent ce sur quoi ils ont travaillé, permettant la continuité entre les sessions
- **Portée projet** — chaque projet dispose d'une mémoire isolée, stockée localement sous `~/.local/share/opencode/`

#### Configuration

MemPalace nécessite Python 3.12+ et s'installe séparément :

```bash
pip install mempalace
```

C'est tout. Aucune configuration nécessaire — OpenCode le détecte et l'initialise automatiquement à la première utilisation.

> [!NOTE]
> MemPalace est optionnel. OpenCode fonctionne exactement de la même manière sans lui — les agents n'auront simplement pas de mémoire entre les sessions. Si `mempalace` n'est pas installé, l'outil signale une erreur claire à la première utilisation et tous les autres outils continuent de fonctionner normalement.

#### Permissions

Par défaut, l'agent demandera avant d'utiliser les opérations MemPalace. Pour autoriser toutes les opérations de mémoire sans invite, ajoutez à votre configuration :

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

OpenCode inclut deux agents intégrés que vous pouvez basculer avec la touche `Tab`.

- **build** - Par défaut, agent avec accès complet pour le travail de développement
- **plan** - Agent en lecture seule pour l'analyse et l'exploration du code
  - Refuse les modifications de fichiers par défaut
  - Demande l'autorisation avant d'exécuter des commandes bash
  - Idéal pour explorer une base de code inconnue ou planifier des changements

Un sous-agent **general** est aussi inclus pour les recherches complexes et les tâches en plusieurs étapes.
Il est utilisé en interne et peut être invoqué via `@general` dans les messages.

En savoir plus sur les [agents](https://opencode.ai/docs/agents).

### Documentation

Pour plus d'informations sur la configuration d'OpenCode, [**consultez notre documentation**](https://opencode.ai/docs).

### Contribuer

Si vous souhaitez contribuer à OpenCode, lisez nos [docs de contribution](./CONTRIBUTING.md) avant de soumettre une pull request.

### Construire avec OpenCode

Si vous travaillez sur un projet lié à OpenCode et que vous utilisez "opencode" dans le nom du projet (par exemple, "opencode-dashboard" ou "opencode-mobile"), ajoutez une note dans votre README pour préciser qu'il n'est pas construit par l'équipe OpenCode et qu'il n'est pas affilié à nous.

### FAQ

#### En quoi est-ce différent de Claude Code ?

C'est très similaire à Claude Code en termes de capacités. Voici les principales différences :

- 100% open source
- Non couplé à un fournisseur. Bien que nous recommandions les modèles que nous proposons via [OpenCode Zen](https://opencode.ai/zen), OpenCode peut être utilisé avec Claude, OpenAI, Google, ou même des modèles locaux. À mesure que les modèles évoluent, les écarts entre eux se réduiront et les prix baisseront, il est donc important d'être agnostique vis-à-vis du fournisseur.
- Prise en charge de LSP prête à l'emploi
- Une focalisation sur la TUI. OpenCode est développé par des utilisateurs de neovim et les créateurs de [terminal.shop](https://terminal.shop) ; nous allons repousser les limites de ce qui est possible dans le terminal.
- Une architecture client/serveur. Cela peut par exemple permettre à OpenCode de s'exécuter sur votre ordinateur pendant que vous le pilotez à distance depuis une application mobile, ce qui signifie que le frontend TUI n'est qu'un des clients possibles.
- Mémoire persistante entre les sessions via MemPalace. Les agents se souviennent de ce qu'ils ont appris, réduisant le contexte redondant et l'utilisation de tokens au fil du temps.

---

**Rejoignez notre communauté** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
