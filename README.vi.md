<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Trợ lý lập trình AI mã nguồn mở.</p>
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

### Cài đặt

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Các trình quản lý gói (Package managers)
npm i -g opencode-ai@latest        # hoặc bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS và Linux (khuyên dùng, luôn cập nhật)
brew install opencode              # macOS và Linux (công thức brew chính thức, ít cập nhật hơn)
sudo pacman -S opencode            # Arch Linux (Bản ổn định)
paru -S opencode-bin               # Arch Linux (Bản mới nhất từ AUR)
mise use -g opencode               # Mọi hệ điều hành
nix run nixpkgs#opencode           # hoặc github:anomalyco/opencode cho nhánh dev mới nhất
```

> [!TIP]
> Hãy xóa các phiên bản cũ hơn 0.1.x trước khi cài đặt.

### Ứng dụng Desktop (BETA)

OpenCode cũng có sẵn dưới dạng ứng dụng desktop. Tải trực tiếp từ [trang releases](https://github.com/anomalyco/opencode/releases) hoặc [opencode.ai/download](https://opencode.ai/download).

| Nền tảng              | Tải xuống                          |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, hoặc AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Thư mục cài đặt

Tập lệnh cài đặt tuân theo thứ tự ưu tiên sau cho đường dẫn cài đặt:

1. `$OPENCODE_INSTALL_DIR` - Thư mục cài đặt tùy chỉnh
2. `$XDG_BIN_DIR` - Đường dẫn tuân thủ XDG Base Directory Specification
3. `$HOME/bin` - Thư mục nhị phân tiêu chuẩn của người dùng (nếu tồn tại hoặc có thể tạo)
4. `$HOME/.opencode/bin` - Mặc định dự phòng

```bash
# Ví dụ
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Xây dựng từ mã nguồn

Nếu bạn muốn chạy fork này (với tích hợp MemPalace) thay vì bản phát hành chính thức, hãy xây dựng và cài đặt từ mã nguồn. Điều này sẽ thay thế bất kỳ lệnh `opencode` hiện có nào trên hệ thống của bạn.

#### Điều kiện tiên quyết

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (cho `npm link`)
- [Python](https://python.org) 3.12+ (để hỗ trợ MemPalace)
- Git

#### Clone và cài đặt

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### Gỡ bỏ OpenCode hiện có (nếu đã cài đặt)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# Cài đặt thủ công (script curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> Bạn phải gỡ bỏ bản cài đặt hiện có trước. Chạy `npm link` trong khi gói chính thức vẫn được cài đặt toàn cục có thể gây ra xung đột khiến hệ thống tiếp tục phân giải đến tệp nhị phân cũ.

#### Liên kết toàn cục

```bash
# Từ thư mục gốc của repo — liên kết CLI để `opencode` phân giải đến mã nguồn cục bộ của bạn
cd packages/opencode
bun link
```

Nếu `bun link` không đặt tệp nhị phân vào `$PATH` của bạn, hãy tạo một wrapper thủ công:

```bash
# Điều chỉnh đường dẫn đến nơi bản clone của bạn nằm
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
Trong trường hợp cách trên không hoạt động, hãy thử các lệnh dưới đây thay thế:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
Trong trường hợp cả hai cách trên đều không hoạt động, hãy thử các lệnh dưới đây thay thế:

```bash
# 1. Xây dựng tệp nhị phân native linux-x64 (nhúng Web UI) từ packages/opencode
bun run build -- --single

# 2. Sao lưu tệp nhị phân hiện tại nếu bạn muốn có điểm khôi phục (tùy chọn)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. Cài đặt tệp nhị phân mới + các script mempalace đi kèm (bắt buộc — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. Xác minh
opencode --version
```

#### Xác minh

```bash
# Sẽ in phiên bản từ mã nguồn cục bộ của bạn
opencode --version

# Sẽ phân giải đến wrapper cục bộ hoặc đường dẫn bun link của bạn
which opencode
```

#### Chạy mà không cần cài đặt toàn cục (thay thế)

Nếu bạn không muốn thay thế lệnh toàn cục, hãy chạy trực tiếp từ mã nguồn:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

Cách này không ảnh hưởng đến bất kỳ bản cài đặt `opencode` toàn cục hiện có nào.

#### Cài đặt MemPalace

```bash
pip install mempalace
```

Không có nó, OpenCode vẫn hoạt động — chỉ là các agent sẽ không có bộ nhớ bền vững.

#### Cập nhật

```bash
cd /path/to/opencode
git pull
bun install
```

Lệnh `opencode` toàn cục tự động nhận bản build mới vì `npm link` tạo một symlink.

#### Quay lại bản phát hành chính thức

```bash
# Xóa liên kết mã nguồn
cd /path/to/opencode/packages/opencode
bun unlink

# Nếu bạn đã tạo wrapper thủ công
sudo rm /usr/local/bin/opencode

# Cài đặt lại bản phát hành chính thức
npm i -g opencode-ai@latest
```

### Bộ nhớ bền vững (MemPalace)

OpenCode bao gồm hỗ trợ tích hợp sẵn cho [MemPalace](https://github.com/anomalyco/mempalace) — một hệ thống bộ nhớ ngữ nghĩa local-first mang lại cho các agent khả năng ghi nhớ bền vững qua các phiên làm việc.

Không có MemPalace, mỗi phiên bắt đầu lại từ đầu. Với nó, các agent có thể ghi nhớ các quyết định trước đó, các mẫu kiến trúc, các lỗi đã phát hiện và dấu vết lập luận — và truy xuất chúng ngay lập tức qua tìm kiếm ngữ nghĩa thay vì đọc lại toàn bộ codebase của bạn.

#### Nó làm gì

- **Tìm kiếm ngữ nghĩa** — các agent truy vấn ngữ cảnh trong quá khứ theo ý nghĩa, không chỉ theo từ khóa
- **Đồ thị tri thức** — theo dõi mối quan hệ thực thể (ví dụ: "AuthService depends on DatabasePool")
- **Nhật ký phiên** — các agent ghi lại những gì họ đã làm, cho phép tính liên tục qua các phiên
- **Giới hạn theo dự án** — mỗi dự án có bộ nhớ riêng biệt, được lưu trữ cục bộ trong `~/.local/share/opencode/`

#### Thiết lập

MemPalace yêu cầu Python 3.12+ và được cài đặt riêng:

```bash
pip install mempalace
```

Vậy là xong. Không cần cấu hình — OpenCode tự động phát hiện và khởi tạo nó trong lần sử dụng đầu tiên.

> [!NOTE]
> MemPalace là tùy chọn. OpenCode hoạt động y hệt khi không có nó — các agent chỉ đơn giản là không có bộ nhớ qua các phiên. Nếu `mempalace` chưa được cài đặt, công cụ sẽ báo lỗi rõ ràng trong lần sử dụng đầu tiên và tất cả các công cụ khác vẫn tiếp tục hoạt động bình thường.

#### Quyền

Theo mặc định, agent sẽ hỏi trước khi sử dụng các thao tác MemPalace. Để cho phép tất cả các thao tác bộ nhớ mà không cần nhắc, hãy thêm vào cấu hình của bạn:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents (Đại diện)

OpenCode bao gồm hai agent được tích hợp sẵn mà bạn có thể chuyển đổi bằng phím `Tab`.

- **build** - Agent mặc định, có toàn quyền truy cập cho công việc lập trình
- **plan** - Agent chỉ đọc dùng để phân tích và khám phá mã nguồn
  - Mặc định từ chối việc chỉnh sửa tệp
  - Hỏi quyền trước khi chạy các lệnh bash
  - Lý tưởng để khám phá các codebase lạ hoặc lên kế hoạch thay đổi

Ngoài ra còn có một subagent **general** dùng cho các tìm kiếm phức tạp và tác vụ nhiều bước.
Agent này được sử dụng nội bộ và có thể gọi bằng cách dùng `@general` trong tin nhắn.

Tìm hiểu thêm về [agents](https://opencode.ai/docs/agents).

### Tài liệu

Để biết thêm thông tin về cách cấu hình OpenCode, [**hãy truy cập tài liệu của chúng tôi**](https://opencode.ai/docs).

### Đóng góp

Nếu bạn muốn đóng góp cho OpenCode, vui lòng đọc [tài liệu hướng dẫn đóng góp](./CONTRIBUTING.md) trước khi gửi pull request.

### Xây dựng trên nền tảng OpenCode

Nếu bạn đang làm việc trên một dự án liên quan đến OpenCode và sử dụng "opencode" như một phần của tên dự án, ví dụ "opencode-dashboard" hoặc "opencode-mobile", vui lòng thêm một ghi chú vào README của bạn để làm rõ rằng dự án đó không được xây dựng bởi đội ngũ OpenCode và không liên kết với chúng tôi dưới bất kỳ hình thức nào.

### Câu hỏi thường gặp

#### Điều này khác gì so với Claude Code?

Nó rất giống với Claude Code về mặt khả năng. Dưới đây là những điểm khác biệt chính:

- Mã nguồn mở 100%
- Không bị ràng buộc với bất kỳ nhà cung cấp nào. Mặc dù chúng tôi khuyến nghị các mô hình mà chúng tôi cung cấp qua [OpenCode Zen](https://opencode.ai/zen), OpenCode có thể được sử dụng với Claude, OpenAI, Google, hoặc thậm chí các mô hình cục bộ. Khi các mô hình phát triển, khoảng cách giữa chúng sẽ thu hẹp và giá cả sẽ giảm, vì vậy việc không phụ thuộc vào nhà cung cấp là điều quan trọng.
- Hỗ trợ LSP ngay lập tức
- Tập trung vào TUI. OpenCode được xây dựng bởi những người dùng neovim và những người sáng tạo ra [terminal.shop](https://terminal.shop); chúng tôi sẽ đẩy giới hạn của những gì có thể làm được trong terminal.
- Kiến trúc client/server. Ví dụ, điều này cho phép OpenCode chạy trên máy tính của bạn trong khi bạn điều khiển nó từ xa qua một ứng dụng di động, nghĩa là giao diện TUI chỉ là một trong những client có thể có.
- Bộ nhớ bền vững xuyên suốt các phiên qua MemPalace. Các agent ghi nhớ những gì chúng đã học được, giảm bớt ngữ cảnh dư thừa và mức sử dụng token theo thời gian.

---

**Tham gia cộng đồng của chúng tôi** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
