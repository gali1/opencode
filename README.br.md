<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo do OpenCode">
    </picture>
  </a>
</p>
<p align="center">O agente de programação com IA de código aberto.</p>
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

### Instalação

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Gerenciadores de pacotes
npm i -g opencode-ai@latest        # ou bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS e Linux (recomendado, sempre atualizado)
brew install opencode              # macOS e Linux (fórmula oficial do brew, atualiza menos)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # qualquer sistema
nix run nixpkgs#opencode           # ou github:anomalyco/opencode para a branch dev mais recente
```

> [!TIP]
> Remova versões anteriores a 0.1.x antes de instalar.

### App desktop (BETA)

O OpenCode também está disponível como aplicativo desktop. Baixe diretamente pela [página de releases](https://github.com/anomalyco/opencode/releases) ou em [opencode.ai/download](https://opencode.ai/download).

| Plataforma            | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` ou AppImage         |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Diretório de instalação

O script de instalação respeita a seguinte ordem de prioridade para o caminho de instalação:

1. `$OPENCODE_INSTALL_DIR` - Diretório de instalação personalizado
2. `$XDG_BIN_DIR` - Caminho compatível com a especificação XDG Base Directory
3. `$HOME/bin` - Diretório binário padrão do usuário (se existir ou puder ser criado)
4. `$HOME/.opencode/bin` - Fallback padrão

```bash
# Exemplos
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Compilando a partir do código-fonte

Se você quiser executar este fork (com integração do MemPalace) em vez da versão oficial, compile e instale a partir do código-fonte. Isso substitui qualquer comando `opencode` existente no seu sistema.

#### Pré-requisitos

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (para `npm link`)
- [Python](https://python.org) 3.12+ (para suporte ao MemPalace)
- Git

#### Clone e instale

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Remova o OpenCode existente (se instalado)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Instalação manual (script curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Você deve remover a instalação existente primeiro. Executar `npm link` enquanto o pacote oficial ainda está instalado globalmente pode causar conflitos em que o sistema continua resolvendo o binário antigo.

#### Vincule globalmente

```bash
# A partir da raiz do repositório — vincule a CLI para que `opencode` aponte para o seu código-fonte local
cd packages/opencode
bun link
```

Se `bun link` não colocar o binário no seu `$PATH`, crie um wrapper manualmente:

```bash
# Ajuste o caminho para onde o seu clone está
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Caso a abordagem acima não funcione, tente os comandos abaixo:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Caso ambas as abordagens acima não funcionem, tente os comandos abaixo:

```bash
# 1. Compile o binário nativo linux-x64 (embute a Web UI) a partir de packages/opencode
bun run build -- --single

# 2. Faça backup do binário atual se quiser um ponto de rollback (opcional)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Instale o novo binário + seus scripts complementares do mempalace (obrigatório — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Verifique
opencode --version
```

#### Verifique

```bash
# Deve imprimir a versão do seu código-fonte local
opencode --version

# Deve resolver para o seu wrapper local ou caminho do bun link
which opencode
```

#### Executar sem instalação global (alternativa)

Se você preferir não substituir o comando global, execute diretamente a partir do código-fonte:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Isso deixa qualquer instalação global existente do `opencode` intacta.

#### Instale o MemPalace

```bash
pip install mempalace
```

Sem isso, o OpenCode ainda funciona — os agents apenas não terão memória persistente.

#### Atualizando

```bash
cd /path/to/opencode
git pull
bun install
```

O comando global `opencode` adota automaticamente a nova compilação, já que `npm link` cria um symlink.

#### Revertendo para a versão oficial

```bash
# Remova o link do código-fonte
cd /path/to/opencode/packages/opencode
bun unlink

# Se você criou o wrapper manual
sudo rm /usr/local/bin/opencode

# Reinstale a versão oficial
npm i -g opencode-ai@latest
```

### Memória Persistente (MemPalace)

O OpenCode inclui suporte integrado ao [MemPalace](https://github.com/anomalyco/mempalace) — um sistema de memória semântica, local-first, que dá aos agents recuperação persistente entre sessões.

Sem o MemPalace, cada sessão começa do zero. Com ele, os agents podem lembrar decisões anteriores, padrões de arquitetura, bugs descobertos e traços de raciocínio — e recuperá-los instantaneamente via busca semântica em vez de reler toda a sua codebase.

#### O que ele faz

- **Busca semântica** — os agents consultam o contexto passado por significado, não apenas por palavras-chave
- **Grafo de conhecimento** — rastreia relações entre entidades (por exemplo, "AuthService depende de DatabasePool")
- **Diário de sessão** — os agents registram no que trabalharam, permitindo continuidade entre sessões
- **Escopo por projeto** — cada projeto recebe memória isolada, armazenada localmente em `~/.local/share/opencode/`

#### Configuração

O MemPalace requer Python 3.12+ e é instalado separadamente:

```bash
pip install mempalace
```

É isso. Nenhuma configuração necessária — o OpenCode detecta e o inicializa automaticamente no primeiro uso.

> [!NOTE]
> O MemPalace é opcional. O OpenCode funciona exatamente da mesma forma sem ele — os agents simplesmente não terão memória entre sessões. Se `mempalace` não estiver instalado, a ferramenta relata um erro claro no primeiro uso e todas as outras ferramentas continuam funcionando normalmente.

#### Permissões

Por padrão, o agent perguntará antes de usar operações do MemPalace. Para permitir todas as operações de memória sem solicitações, adicione à sua configuração:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

O OpenCode inclui dois agents integrados, que você pode alternar com a tecla `Tab`.

- **build** - Padrão, agent com acesso total para trabalho de desenvolvimento
- **plan** - Agent somente leitura para análise e exploração de código
  - Nega edições de arquivos por padrão
  - Pede permissão antes de executar comandos bash
  - Ideal para explorar codebases desconhecidas ou planejar mudanças

Também há um subagent **general** para buscas complexas e tarefas em várias etapas.
Ele é usado internamente e pode ser invocado com `@general` nas mensagens.

Saiba mais sobre [agents](https://opencode.ai/docs/agents).

### Documentação

Para mais informações sobre como configurar o OpenCode, [**veja nossa documentação**](https://opencode.ai/docs).

### Contribuir

Se você tem interesse em contribuir com o OpenCode, leia os [contributing docs](./CONTRIBUTING.md) antes de enviar um pull request.

### Construindo com OpenCode

Se você estiver trabalhando em um projeto relacionado ao OpenCode e estiver usando "opencode" como parte do nome (por exemplo, "opencode-dashboard" ou "opencode-mobile"), adicione uma nota no README para deixar claro que não foi construído pela equipe do OpenCode e não é afiliado a nós de nenhuma forma.

### Perguntas frequentes

#### Como isso é diferente do Claude Code?

É muito semelhante ao Claude Code em termos de capacidade. Aqui estão as principais diferenças:

- 100% de código aberto
- Não está atrelado a nenhum provedor. Embora recomendemos os modelos que oferecemos através do [OpenCode Zen](https://opencode.ai/zen), o OpenCode pode ser usado com Claude, OpenAI, Google ou até mesmo modelos locais. À medida que os modelos evoluem, as diferenças entre eles diminuirão e os preços cairão, então ser agnóstico em relação ao provedor é importante.
- Suporte a LSP pronto para uso
- Um foco na TUI. O OpenCode é construído por usuários de neovim e pelos criadores da [terminal.shop](https://terminal.shop); vamos ultrapassar os limites do que é possível no terminal.
- Uma arquitetura cliente/servidor. Isso, por exemplo, pode permitir que o OpenCode rode no seu computador enquanto você o controla remotamente a partir de um app mobile, o que significa que a interface TUI é apenas um dos possíveis clientes.
- Memória persistente entre sessões via MemPalace. Os agents lembram o que aprenderam, reduzindo contexto redundante e uso de tokens ao longo do tempo.

---

**Junte-se à nossa comunidade** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
