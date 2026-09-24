<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Açık kaynaklı yapay zeka kodlama asistanı.</p>
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

### Kurulum

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Paket yöneticileri
npm i -g opencode-ai@latest        # veya bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS ve Linux (önerilir, her zaman güncel)
brew install opencode              # macOS ve Linux (resmi brew formülü, daha az güncellenir)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Tüm işletim sistemleri
nix run nixpkgs#opencode           # veya en güncel geliştirme dalı için github:anomalyco/opencode
```

> [!TIP]
> Kurulumdan önce 0.1.x'ten eski sürümleri kaldırın.

### Masaüstü Uygulaması (BETA)

OpenCode ayrıca masaüstü uygulaması olarak da mevcuttur. Doğrudan [sürüm sayfasından](https://github.com/anomalyco/opencode/releases) veya [opencode.ai/download](https://opencode.ai/download) adresinden indirebilirsiniz.

| Platform              | İndirme                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm` veya AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Kurulum Dizini (Installation Directory)

Kurulum betiği (install script), kurulum yolu (installation path) için aşağıdaki öncelik sırasını takip eder:

1. `$OPENCODE_INSTALL_DIR` - Özel kurulum dizini
2. `$XDG_BIN_DIR` - XDG Base Directory Specification uyumlu yol
3. `$HOME/bin` - Standart kullanıcı binary dizini (varsa veya oluşturulabiliyorsa)
4. `$HOME/.opencode/bin` - Varsayılan yedek konum

```bash
# Örnekler
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Kaynaktan Derleme

Bu fork'u (MemPalace entegrasyonuyla) resmi sürüm yerine çalıştırmak istiyorsanız, kaynaktan derleyip kurun. Bu, sisteminizdeki mevcut `opencode` komutunu değiştirir.

#### Ön Koşullar

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (`npm link` için)
- [Python](https://python.org) 3.12+ (MemPalace desteği için)
- Git

#### Klonlayın ve kurun

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Mevcut OpenCode'u kaldırın (kuruluysa)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Manuel kurulum (curl betiği)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Önce mevcut kurulumu kaldırmanız gerekir. Resmi paket hâlâ global olarak kuruluyken `npm link` çalıştırmak, sistemin eski ikili dosyayı çözmeye devam etmesine neden olan çakışmalara yol açabilir.

#### Global olarak bağlayın

```bash
# Repo kök dizininden — `opencode`'un yerel kaynağınıza çözümlenmesi için CLI'yi bağlayın
cd packages/opencode
bun link
```

`bun link` ikili dosyayı `$PATH`'inize yerleştirmezse, manuel olarak bir wrapper oluşturun:

```bash
# Yolu klonunuzun bulunduğu yere göre ayarlayın
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Yukarıdaki yaklaşım işe yaramazsa, bunun yerine aşağıdaki komutları deneyin:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Yukarıdaki her iki yaklaşım da işe yaramazsa, bunun yerine aşağıdaki komutları deneyin:

```bash
# 1. packages/opencode'dan native linux-x64 ikili dosyasını derleyin (Web UI'yi gömer)
bun run build -- --single

# 2. Bir geri alma noktası isterseniz mevcut ikili dosyayı yedekleyin (isteğe bağlı)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Yeni ikili dosyayı + beraberindeki mempalace betiklerini kurun (gerekli — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Doğrulayın
opencode --version
```

#### Doğrulayın

```bash
# Yerel kaynağınızdan sürümü yazdırmalıdır
opencode --version

# Yerel wrapper'ınıza veya bun link yoluna çözümlenmelidir
which opencode
```

#### Global kurulum olmadan çalıştırın (alternatif)

Global komutu değiştirmemeyi tercih ederseniz, doğrudan kaynaktan çalıştırın:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Bu, mevcut herhangi bir global `opencode` kurulumuna dokunmaz.

#### MemPalace'i kurun

```bash
pip install mempalace
```

Bu olmadan da OpenCode çalışır — yalnızca agent'ların kalıcı belleği olmaz.

#### Güncelleme

```bash
cd /path/to/opencode
git pull
bun install
```

`npm link` bir sembolik bağlantı oluşturduğu için global `opencode` komutu yeni derlemeyi otomatik olarak alır.

#### Resmi sürüme geri dönme

```bash
# Kaynak bağlantısını kaldırın
cd /path/to/opencode/packages/opencode
bun unlink

# Manuel wrapper'ı oluşturduysanız
sudo rm /usr/local/bin/opencode

# Resmi sürümü yeniden kurun
npm i -g opencode-ai@latest
```

### Kalıcı Bellek (MemPalace)

OpenCode, agent'lara oturumlar arasında kalıcı hatırlama sağlayan yerel-öncelikli, anlamsal bir bellek sistemi olan [MemPalace](https://github.com/anomalyco/mempalace) için yerleşik destek içerir.

MemPalace olmadan her oturum sıfırdan başlar. Onunla birlikte agent'lar önceki kararları, mimari desenleri, keşfedilen hataları ve akıl yürütme izlerini hatırlayabilir — ve tüm kod tabanınızı yeniden okumak yerine bunları anlamsal arama yoluyla anında getirebilir.

#### Ne yapar

- **Anlamsal arama** — agent'lar geçmiş bağlamı yalnızca anahtar kelimelerle değil, anlamla sorgular
- **Bilgi grafiği** — varlıklar arasındaki ilişkileri izler (ör. "AuthService, DatabasePool'a bağlıdır")
- **Oturum günlüğü** — agent'lar üzerinde çalıştıkları şeyleri kaydeder, bu da oturumlar arası süreklilik sağlar
- **Proje kapsamlı** — her proje, `~/.local/share/opencode/` altında yerel olarak depolanan izole bir bellek alır

#### Kurulum

MemPalace, Python 3.12+ gerektirir ve ayrı olarak kurulur:

```bash
pip install mempalace
```

Hepsi bu. Yapılandırma gerekmez — OpenCode onu ilk kullanımda otomatik olarak algılar ve başlatır.

> [!NOTE]
> MemPalace isteğe bağlıdır. OpenCode onsuz da tıpatıp aynı şekilde çalışır — agent'ların yalnızca oturumlar arası belleği olmaz. `mempalace` kurulu değilse, araç ilk kullanımda net bir hata bildirir ve diğer tüm araçlar normal şekilde çalışmaya devam eder.

#### İzinler

Varsayılan olarak, agent MemPalace işlemlerini kullanmadan önce sorar. Tüm bellek işlemlerine sormadan izin vermek için yapılandırmanıza ekleyin:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Ajanlar

OpenCode, `Tab` tuşuyla aralarında geçiş yapabileceğiniz iki yerleşik (built-in) ajan içerir.

- **build** - Varsayılan, geliştirme çalışmaları için tam erişimli ajan
- **plan** - Analiz ve kod keşfi için salt okunur ajan
  - Varsayılan olarak dosya düzenlemelerini reddeder
  - Bash komutlarını çalıştırmadan önce izin ister
  - Tanımadığınız kod tabanlarını keşfetmek veya değişiklikleri planlamak için ideal

Ayrıca, karmaşık aramalar ve çok adımlı görevler için bir **genel** alt ajan bulunmaktadır.
Bu dahili olarak kullanılır ve mesajlarda `@general` ile çağrılabilir.

[Ajanlar](https://opencode.ai/docs/agents) hakkında daha fazla bilgi edinin.

### Dokümantasyon

OpenCode'u nasıl yapılandıracağınız hakkında daha fazla bilgi için [**dokümantasyonumuza göz atın**](https://opencode.ai/docs).

### Katkıda Bulunma

OpenCode'a katkıda bulunmak istiyorsanız, lütfen bir pull request göndermeden önce [katkıda bulunma dokümanlarımızı](./CONTRIBUTING.md) okuyun.

### OpenCode Üzerine Geliştirme

OpenCode ile ilgili bir proje üzerinde çalışıyorsanız ve projenizin adının bir parçası olarak "opencode" kullanıyorsanız (örneğin, "opencode-dashboard" veya "opencode-mobile"), lütfen README dosyanıza projenin OpenCode ekibi tarafından geliştirilmediğini ve bizimle hiçbir şekilde bağlantılı olmadığını belirten bir not ekleyin.

### SSS

#### Bu, Claude Code'dan nasıl farklı?

Yetenek açısından Claude Code'a çok benzer. İşte temel farklar:

- %100 açık kaynak
- Hiçbir sağlayıcıya bağlı değil. [OpenCode Zen](https://opencode.ai/zen) aracılığıyla sunduğumuz modelleri önersek de, OpenCode; Claude, OpenAI, Google ve hatta yerel modellerle kullanılabilir. Modeller geliştikçe aralarındaki farklar kapanacak ve fiyatlandırma düşecek, bu yüzden sağlayıcıdan bağımsız olmak önemlidir.
- Kutudan çıktığı haliyle LSP desteği
- TUI'ye odaklanma. OpenCode, neovim kullanıcıları ve [terminal.shop](https://terminal.shop)'un yaratıcıları tarafından geliştirildi; terminalde mümkün olanın sınırlarını zorlayacağız.
- Bir istemci/sunucu mimarisi. Bu, örneğin, OpenCode'un bilgisayarınızda çalışmasına ve onu bir mobil uygulamadan uzaktan yönetmenize olanak tanır; yani TUI ön yüzü olası istemcilerden yalnızca biridir.
- MemPalace aracılığıyla oturumlar arası kalıcı bellek. Agent'lar öğrendiklerini hatırlar, zamanla gereksiz bağlamı ve token kullanımını azaltır.

---

**Topluluğumuza katılın** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
