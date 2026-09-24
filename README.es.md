<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">El agente de programación con IA de código abierto.</p>
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

### Instalación

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Gestores de paquetes
npm i -g opencode-ai@latest        # o bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS y Linux (recomendado, siempre al día)
brew install opencode              # macOS y Linux (fórmula oficial de brew, se actualiza menos)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # cualquier sistema
nix run nixpkgs#opencode           # o github:anomalyco/opencode para la rama dev más reciente
```

> [!TIP]
> Elimina versiones anteriores a 0.1.x antes de instalar.

### App de escritorio (BETA)

OpenCode también está disponible como aplicación de escritorio. Descárgala directamente desde la [página de releases](https://github.com/anomalyco/opencode/releases) o desde [opencode.ai/download](https://opencode.ai/download).

| Plataforma            | Descarga                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, o AppImage         |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Directorio de instalación

El script de instalación respeta el siguiente orden de prioridad para la ruta de instalación:

1. `$OPENCODE_INSTALL_DIR` - Directorio de instalación personalizado
2. `$XDG_BIN_DIR` - Ruta compatible con la especificación XDG Base Directory
3. `$HOME/bin` - Directorio binario estándar del usuario (si existe o se puede crear)
4. `$HOME/.opencode/bin` - Alternativa por defecto

```bash
# Ejemplos
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Compilar desde el código fuente

Si quieres ejecutar este fork (con integración de MemPalace) en lugar del release oficial, compila e instala desde el código fuente. Esto reemplaza cualquier comando `opencode` existente en tu sistema.

#### Requisitos previos

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (para `npm link`)
- [Python](https://python.org) 3.12+ (para el soporte de MemPalace)
- Git

#### Clonar e instalar

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Eliminar OpenCode existente (si está instalado)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Instalación manual (script curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Debes eliminar primero la instalación existente. Ejecutar `npm link` mientras el paquete oficial sigue instalado globalmente puede causar conflictos en los que el sistema continúe resolviendo el binario antiguo.

#### Enlazar globalmente

```bash
# Desde la raíz del repo — enlaza la CLI para que `opencode` apunte a tu código fuente local
cd packages/opencode
bun link
```

Si `bun link` no coloca el binario en tu `$PATH`, crea un wrapper manualmente:

```bash
# Ajusta la ruta al lugar donde esté tu clon
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Si el enfoque anterior no funciona, prueba en su lugar los siguientes comandos:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Si ambos enfoques anteriores no funcionan, prueba en su lugar los siguientes comandos:

```bash
# 1. Compila el binario nativo linux-x64 (incorpora la interfaz Web) desde packages/opencode
bun run build -- --single

# 2. Respalda el binario actual si quieres un punto de reversión (opcional)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Instala el nuevo binario + sus scripts complementarios de mempalace (requerido — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Verifica
opencode --version
```

#### Verificar

```bash
# Debería imprimir la versión de tu código fuente local
opencode --version

# Debería apuntar a tu wrapper local o a la ruta de bun link
which opencode
```

#### Ejecutar sin instalación global (alternativa)

Si prefieres no reemplazar el comando global, ejecuta directamente desde el código fuente:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Esto deja intacta cualquier instalación global existente de `opencode`.

#### Instalar MemPalace

```bash
pip install mempalace
```

Sin esto, OpenCode sigue funcionando — los agentes simplemente no tendrán memoria persistente.

#### Actualizar

```bash
cd /path/to/opencode
git pull
bun install
```

El comando global `opencode` toma automáticamente la nueva compilación, ya que `npm link` crea un enlace simbólico.

#### Volver al release oficial

```bash
# Elimina el enlace al código fuente
cd /path/to/opencode/packages/opencode
bun unlink

# Si creaste el wrapper manual
sudo rm /usr/local/bin/opencode

# Reinstala el release oficial
npm i -g opencode-ai@latest
```

### Memoria persistente (MemPalace)

OpenCode incluye soporte integrado para [MemPalace](https://github.com/anomalyco/mempalace) — un sistema de memoria semántica local-first que da a los agentes recuerdo persistente entre sesiones.

Sin MemPalace, cada sesión comienza desde cero. Con él, los agentes pueden recordar decisiones previas, patrones de arquitectura, bugs descubiertos y trazas de razonamiento — y recuperarlos al instante mediante búsqueda semántica en lugar de releer toda tu codebase.

#### Qué hace

- **Búsqueda semántica** — los agentes consultan el contexto pasado por significado, no solo por palabras clave
- **Grafo de conocimiento** — rastrea relaciones entre entidades (por ejemplo, "AuthService depende de DatabasePool")
- **Diario de sesión** — los agentes registran en qué trabajaron, permitiendo la continuidad entre sesiones
- **Ámbito por proyecto** — cada proyecto obtiene memoria aislada, almacenada localmente en `~/.local/share/opencode/`

#### Configuración

MemPalace requiere Python 3.12+ y se instala por separado:

```bash
pip install mempalace
```

Eso es todo. No se necesita configuración — OpenCode lo detecta e inicializa automáticamente en el primer uso.

> [!NOTE]
> MemPalace es opcional. OpenCode funciona exactamente igual sin él — los agentes simplemente no tendrán memoria entre sesiones. Si `mempalace` no está instalado, la herramienta informa de un error claro en el primer uso y todas las demás herramientas siguen funcionando con normalidad.

#### Permisos

Por defecto, el agente preguntará antes de usar operaciones de MemPalace. Para permitir todas las operaciones de memoria sin preguntas, añade a tu configuración:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agentes

OpenCode incluye dos agentes integrados que puedes alternar con la tecla `Tab`.

- **build** - Por defecto, agente con acceso completo para tareas de desarrollo
- **plan** - Agente de solo lectura para análisis y exploración de código
  - Deniega ediciones de archivos por defecto
  - Pide permiso antes de ejecutar comandos bash
  - Ideal para explorar codebases desconocidas o planificar cambios

Además, incluye un subagente **general** para búsquedas complejas y tareas de varios pasos.
Se usa internamente y se puede invocar con `@general` en los mensajes.

Más información sobre [agentes](https://opencode.ai/docs/agents).

### Documentación

Para más información sobre cómo configurar OpenCode, [**ve a nuestra documentación**](https://opencode.ai/docs).

### Contribuir

Si te interesa contribuir a OpenCode, lee nuestras [docs de contribución](./CONTRIBUTING.md) antes de enviar un pull request.

### Proyectos basados en OpenCode

Si estás trabajando en un proyecto basado en OpenCode y usas "opencode" como parte del nombre, por ejemplo, "opencode-dashboard" u "opencode-mobile", agrega una nota en tu README para aclarar que no está hecho por el equipo de OpenCode y que no está afiliado con nosotros de ninguna manera.

### FAQ

#### ¿En qué se diferencia de Claude Code?

Es muy similar a Claude Code en cuanto a capacidades. Estas son las diferencias clave:

- 100% código abierto
- No está acoplado a ningún proveedor. Aunque recomendamos los modelos que ofrecemos a través de [OpenCode Zen](https://opencode.ai/zen), OpenCode se puede usar con Claude, OpenAI, Google, o incluso modelos locales. A medida que los modelos evolucionen, las diferencias entre ellos se reducirán y los precios bajarán, por lo que ser agnóstico respecto al proveedor es importante.
- Soporte de LSP listo para usar
- Un enfoque en la TUI. OpenCode está construido por usuarios de neovim y los creadores de [terminal.shop](https://terminal.shop); vamos a llevar al límite lo que es posible en la terminal.
- Una arquitectura cliente/servidor. Esto, por ejemplo, permite que OpenCode se ejecute en tu computadora mientras lo controlas de forma remota desde una app móvil, lo que significa que el frontend TUI es solo uno de los clientes posibles.
- Memoria persistente entre sesiones mediante MemPalace. Los agentes recuerdan lo que aprendieron, reduciendo el contexto redundante y el uso de tokens con el tiempo.

---

**Únete a nuestra comunidad** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
