<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">เอเจนต์การเขียนโค้ดด้วย AI แบบโอเพนซอร์ส</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="สถานะการสร้าง" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
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

### การติดตั้ง

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# ตัวจัดการแพ็กเกจ
npm i -g opencode-ai@latest        # หรือ bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS และ Linux (แนะนำ อัปเดตเสมอ)
brew install opencode              # macOS และ Linux (brew formula อย่างเป็นทางการ อัปเดตน้อยกว่า)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # ระบบปฏิบัติการใดก็ได้
nix run nixpkgs#opencode           # หรือ github:anomalyco/opencode สำหรับสาขาพัฒนาล่าสุด
```

> [!TIP]
> ลบเวอร์ชันที่เก่ากว่า 0.1.x ก่อนติดตั้ง

### แอปพลิเคชันเดสก์ท็อป (เบต้า)

OpenCode มีให้ใช้งานเป็นแอปพลิเคชันเดสก์ท็อป ดาวน์โหลดโดยตรงจาก [หน้ารุ่น](https://github.com/anomalyco/opencode/releases) หรือ [opencode.ai/download](https://opencode.ai/download)

| แพลตฟอร์ม             | ดาวน์โหลด                          |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, หรือ AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### ไดเรกทอรีการติดตั้ง

สคริปต์การติดตั้งจะใช้ลำดับความสำคัญตามเส้นทางการติดตั้ง:

1. `$OPENCODE_INSTALL_DIR` - ไดเรกทอรีการติดตั้งที่กำหนดเอง
2. `$XDG_BIN_DIR` - เส้นทางที่สอดคล้องกับ XDG Base Directory Specification
3. `$HOME/bin` - ไดเรกทอรีไบนารีผู้ใช้มาตรฐาน (หากมีอยู่หรือสามารถสร้างได้)
4. `$HOME/.opencode/bin` - ค่าสำรองเริ่มต้น

```bash
# ตัวอย่าง
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### การสร้างจากซอร์ส

หากคุณต้องการรัน fork นี้ (พร้อมการผสานรวม MemPalace) แทนรุ่นทางการ ให้สร้างและติดตั้งจากซอร์ส สิ่งนี้จะแทนที่คำสั่ง `opencode` ที่มีอยู่บนระบบของคุณ

#### ข้อกำหนดเบื้องต้น

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (สำหรับ `npm link`)
- [Python](https://python.org) 3.12+ (สำหรับการรองรับ MemPalace)
- Git

#### โคลนและติดตั้ง

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### ลบ OpenCode ที่มีอยู่ (หากติดตั้งไว้)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# การติดตั้งด้วยตนเอง (สคริปต์ curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> คุณต้องลบการติดตั้งที่มีอยู่ก่อน การรัน `npm link` ในขณะที่แพ็กเกจทางการยังคงติดตั้งแบบ global อยู่อาจทำให้เกิดความขัดแย้งที่ระบบยังคงรีโซลฟ์ไปยังไบนารีเก่า

#### ลิงก์แบบ global

```bash
# จากรากของ repo — ลิงก์ CLI เพื่อให้ `opencode` รีโซลฟ์ไปยังซอร์สในเครื่องของคุณ
cd packages/opencode
bun link
```

หาก `bun link` ไม่ได้วางไบนารีไว้บน `$PATH` ของคุณ ให้สร้าง wrapper ด้วยตนเอง:

```bash
# ปรับ path ให้ตรงกับตำแหน่งที่โคลนของคุณอยู่
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
ในกรณีที่วิธีข้างต้นไม่ได้ผล ให้ลองใช้คำสั่งด้านล่างแทน:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
ในกรณีที่ทั้งสองวิธีข้างต้นไม่ได้ผล ให้ลองใช้คำสั่งด้านล่างแทน:

```bash
# 1. สร้างไบนารี linux-x64 แบบเนทีฟ (ฝัง Web UI) จาก packages/opencode
bun run build -- --single

# 2. สำรองไบนารีปัจจุบันหากคุณต้องการจุดย้อนกลับ (ไม่บังคับ)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. ติดตั้งไบนารีใหม่ + สคริปต์ mempalace ที่มาคู่กัน (จำเป็น — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. ตรวจสอบ
opencode --version
```

#### ตรวจสอบ

```bash
# ควรพิมพ์เวอร์ชันจากซอร์สในเครื่องของคุณ
opencode --version

# ควรรีโซลฟ์ไปยัง wrapper ในเครื่องหรือ path ของ bun link
which opencode
```

#### รันโดยไม่ติดตั้งแบบ global (ทางเลือก)

หากคุณไม่ต้องการแทนที่คำสั่ง global ให้รันจากซอร์สโดยตรง:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

วิธีนี้จะไม่แตะต้องการติดตั้ง `opencode` แบบ global ที่มีอยู่

#### ติดตั้ง MemPalace

```bash
pip install mempalace
```

หากไม่มีสิ่งนี้ OpenCode ยังคงทำงานได้ — เพียงแต่เอเจนต์จะไม่มีหน่วยความจำแบบถาวรเท่านั้น

#### การอัปเดต

```bash
cd /path/to/opencode
git pull
bun install
```

คำสั่ง `opencode` แบบ global จะรับ build ใหม่โดยอัตโนมัติ เนื่องจาก `npm link` สร้าง symlink

#### การย้อนกลับไปยังรุ่นทางการ

```bash
# ลบลิงก์ซอร์ส
cd /path/to/opencode/packages/opencode
bun unlink

# หากคุณสร้าง wrapper ด้วยตนเอง
sudo rm /usr/local/bin/opencode

# ติดตั้งรุ่นทางการอีกครั้ง
npm i -g opencode-ai@latest
```

### หน่วยความจำแบบถาวร (MemPalace)

OpenCode มีการรองรับในตัวสำหรับ [MemPalace](https://github.com/anomalyco/mempalace) — ระบบหน่วยความจำเชิงความหมายแบบ local-first ที่ให้เอเจนต์เรียกคืนข้อมูลอย่างถาวรข้ามเซสชัน

หากไม่มี MemPalace แต่ละเซสชันจะเริ่มจากศูนย์ ด้วย MemPalace เอเจนต์สามารถจดจำการตัดสินใจก่อนหน้า รูปแบบสถาปัตยกรรม บั๊กที่ค้นพบ และร่องรอยการให้เหตุผล — และเรียกคืนได้ทันทีผ่านการค้นหาเชิงความหมายแทนการอ่านโค้ดเบสทั้งหมดซ้ำ

#### สิ่งที่มันทำ

- **การค้นหาเชิงความหมาย** — เอเจนต์สืบค้นบริบทในอดีตตามความหมาย ไม่ใช่แค่คีย์เวิร์ด
- **กราฟความรู้** — ติดตามความสัมพันธ์ของเอนทิตี (เช่น "AuthService depends on DatabasePool")
- **ไดอารีเซสชัน** — เอเจนต์บันทึกสิ่งที่ทำ ทำให้เกิดความต่อเนื่องข้ามเซสชัน
- **จำกัดขอบเขตตามโปรเจกต์** — แต่ละโปรเจกต์ได้รับหน่วยความจำแยกกัน จัดเก็บในเครื่องภายใต้ `~/.local/share/opencode/`

#### การตั้งค่า

MemPalace ต้องใช้ Python 3.12+ และติดตั้งแยกต่างหาก:

```bash
pip install mempalace
```

เท่านี้เอง ไม่ต้องกำหนดค่าใด ๆ — OpenCode ตรวจจับและเริ่มต้นให้โดยอัตโนมัติเมื่อใช้งานครั้งแรก

> [!NOTE]
> MemPalace เป็นทางเลือก OpenCode ทำงานเหมือนเดิมทุกประการโดยไม่มีมัน — เพียงแต่เอเจนต์จะไม่มีหน่วยความจำข้ามเซสชัน หาก `mempalace` ไม่ได้ติดตั้ง เครื่องมือจะรายงานข้อผิดพลาดอย่างชัดเจนเมื่อใช้งานครั้งแรก และเครื่องมืออื่น ๆ ทั้งหมดยังคงทำงานได้ตามปกติ

#### สิทธิ์การใช้งาน

โดยค่าเริ่มต้น เอเจนต์จะถามก่อนใช้การดำเนินการ MemPalace หากต้องการอนุญาตการดำเนินการหน่วยความจำทั้งหมดโดยไม่ถาม ให้เพิ่มลงในการกำหนดค่าของคุณ:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### เอเจนต์

OpenCode รวมเอเจนต์ในตัวสองตัวที่คุณสามารถสลับได้ด้วยปุ่ม `Tab`

- **build** - เอเจนต์เริ่มต้น มีสิทธิ์เข้าถึงแบบเต็มสำหรับงานพัฒนา
- **plan** - เอเจนต์อ่านอย่างเดียวสำหรับการวิเคราะห์และการสำรวจโค้ด
  - ปฏิเสธการแก้ไขไฟล์โดยค่าเริ่มต้น
  - ขอสิทธิ์ก่อนเรียกใช้คำสั่ง bash
  - เหมาะสำหรับสำรวจโค้ดเบสที่ไม่คุ้นเคยหรือวางแผนการเปลี่ยนแปลง

นอกจากนี้ยังมีเอเจนต์ย่อย **general** สำหรับการค้นหาที่ซับซ้อนและงานหลายขั้นตอน
ใช้ภายในและสามารถเรียกใช้ได้โดยใช้ `@general` ในข้อความ

เรียนรู้เพิ่มเติมเกี่ยวกับ [เอเจนต์](https://opencode.ai/docs/agents)

### เอกสารประกอบ

สำหรับข้อมูลเพิ่มเติมเกี่ยวกับวิธีกำหนดค่า OpenCode [**ไปที่เอกสารของเรา**](https://opencode.ai/docs)

### การมีส่วนร่วม

หากคุณสนใจที่จะมีส่วนร่วมใน OpenCode โปรดอ่าน [เอกสารการมีส่วนร่วม](./CONTRIBUTING.md) ก่อนส่ง Pull Request

### การสร้างบน OpenCode

หากคุณทำงานในโปรเจกต์ที่เกี่ยวข้องกับ OpenCode และใช้ "opencode" เป็นส่วนหนึ่งของชื่อ เช่น "opencode-dashboard" หรือ "opencode-mobile" โปรดเพิ่มหมายเหตุใน README ของคุณเพื่อชี้แจงว่าไม่ได้สร้างโดยทีม OpenCode และไม่ได้เกี่ยวข้องกับเราในทางใด

### คำถามที่พบบ่อย

#### สิ่งนี้แตกต่างจาก Claude Code อย่างไร?

มันคล้ายกับ Claude Code มากในแง่ของความสามารถ นี่คือความแตกต่างที่สำคัญ:

- โอเพนซอร์ส 100%
- ไม่ผูกติดกับผู้ให้บริการรายใด แม้ว่าเราจะแนะนำโมเดลที่เราให้บริการผ่าน [OpenCode Zen](https://opencode.ai/zen) แต่ OpenCode สามารถใช้กับ Claude, OpenAI, Google หรือแม้แต่โมเดลในเครื่องได้ เมื่อโมเดลพัฒนาขึ้น ช่องว่างระหว่างกันจะแคบลงและราคาจะลดลง ดังนั้นการเป็นอิสระจากผู้ให้บริการจึงเป็นสิ่งสำคัญ
- รองรับ LSP ได้ทันทีโดยไม่ต้องตั้งค่าเพิ่มเติม
- มุ่งเน้นที่ TUI OpenCode สร้างโดยผู้ใช้ neovim และผู้สร้าง [terminal.shop](https://terminal.shop); เราจะผลักดันขีดจำกัดของสิ่งที่เป็นไปได้ในเทอร์มินัล
- สถาปัตยกรรมแบบไคลเอนต์/เซิร์ฟเวอร์ ตัวอย่างเช่น สิ่งนี้ช่วยให้ OpenCode ทำงานบนคอมพิวเตอร์ของคุณในขณะที่คุณควบคุมมันจากระยะไกลผ่านแอปมือถือ ซึ่งหมายความว่าฟรอนต์เอนด์ TUI เป็นเพียงหนึ่งในไคลเอนต์ที่เป็นไปได้
- หน่วยความจำถาวรข้ามเซสชันผ่าน MemPalace เอเจนต์จดจำสิ่งที่เรียนรู้ ลดบริบทที่ซ้ำซ้อนและการใช้โทเค็นเมื่อเวลาผ่านไป

---

**ร่วมชุมชนของเรา** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
