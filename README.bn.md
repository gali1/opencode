<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">ওপেন সোর্স এআই কোডিং এজেন্ট।</p>
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

### ইনস্টলেশন (Installation)

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

> [!TIP]
> ইনস্টল করার আগে ০.১.x এর চেয়ে পুরোনো ভার্সনগুলো মুছে ফেলুন।

### ডেস্কটপ অ্যাপ (BETA)

OpenCode ডেস্কটপ অ্যাপ্লিকেশন হিসেবেও উপলব্ধ। সরাসরি [রিলিজ পেজ](https://github.com/anomalyco/opencode/releases) অথবা [opencode.ai/download](https://opencode.ai/download) থেকে ডাউনলোড করুন।

| প্ল্যাটফর্ম           | ডাউনলোড                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### ইনস্টলেশন ডিরেক্টরি (Installation Directory)

ইনস্টল স্ক্রিপ্টটি ইনস্টলেশন পাতের জন্য নিম্নলিখিত অগ্রাধিকার ক্রম মেনে চলে:

1. `$OPENCODE_INSTALL_DIR` - কাস্টম ইনস্টলেশন ডিরেক্টরি
2. `$XDG_BIN_DIR` - XDG বেস ডিরেক্টরি স্পেসিফিকেশন সমর্থিত পাথ
3. `$HOME/bin` - সাধারণ ব্যবহারকারী বাইনারি ডিরেক্টরি (যদি বিদ্যমান থাকে বা তৈরি করা যায়)
4. `$HOME/.opencode/bin` - ডিফল্ট ফলব্যাক

```bash
# উদাহরণ
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### সোর্স থেকে বিল্ড করা (Building from Source)

আপনি যদি অফিসিয়াল রিলিজের পরিবর্তে এই fork (MemPalace ইন্টিগ্রেশন সহ) চালাতে চান, তবে সোর্স থেকে বিল্ড ও ইনস্টল করুন। এটি আপনার সিস্টেমে বিদ্যমান যেকোনো `opencode` কমান্ড প্রতিস্থাপন করবে।

#### পূর্বশর্ত (Prerequisites)

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (`npm link` এর জন্য)
- [Python](https://python.org) 3.12+ (MemPalace সমর্থনের জন্য)
- Git

#### ক্লোন ও ইনস্টল

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### বিদ্যমান OpenCode সরান (যদি ইনস্টল থাকে)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# ম্যানুয়াল ইনস্টল (curl স্ক্রিপ্ট)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> আপনাকে অবশ্যই প্রথমে বিদ্যমান ইনস্টলেশনটি সরাতে হবে। অফিসিয়াল প্যাকেজটি এখনও গ্লোবালভাবে ইনস্টল থাকা অবস্থায় `npm link` চালালে দ্বন্দ্ব তৈরি হতে পারে, যেখানে সিস্টেম পুরোনো বাইনারি রিজলভ করতে থাকে।

#### গ্লোবালভাবে লিঙ্ক করা

```bash
# রিপো রুট থেকে — CLI লিঙ্ক করুন যাতে `opencode` আপনার লোকাল সোর্সে রিজলভ হয়
cd packages/opencode
bun link
```

যদি `bun link` আপনার `$PATH` এ বাইনারি না রাখে, তবে ম্যানুয়ালি একটি র‍্যাপার তৈরি করুন:

```bash
# আপনার ক্লোন যেখানে আছে সেই পাথ অনুযায়ী সমন্বয় করুন
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
উপরের পদ্ধতিটি কাজ না করলে পরিবর্তে নিচের কমান্ডগুলো চেষ্টা করুন:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
উপরের দুটি পদ্ধতিই কাজ না করলে পরিবর্তে নিচের কমান্ডগুলো চেষ্টা করুন:

```bash
# 1. packages/opencode থেকে নেটিভ linux-x64 বাইনারি (Web UI এমবেড করে) বিল্ড করুন
bun run build -- --single

# 2. রোলব্যাক পয়েন্ট চাইলে বর্তমান বাইনারি ব্যাকআপ করুন (ঐচ্ছিক)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. নতুন বাইনারি + এর সঙ্গী mempalace স্ক্রিপ্ট ইনস্টল করুন (প্রয়োজনীয় — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. যাচাই করুন
opencode --version
```

#### যাচাই (Verify)

```bash
# আপনার লোকাল সোর্স থেকে ভার্সন প্রিন্ট করা উচিত
opencode --version

# আপনার লোকাল র‍্যাপার বা bun link পাথে রিজলভ হওয়া উচিত
which opencode
```

#### গ্লোবাল ইনস্টল ছাড়াই চালানো (বিকল্প)

আপনি যদি গ্লোবাল কমান্ড প্রতিস্থাপন করতে না চান, সরাসরি সোর্স থেকে চালান:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

এটি বিদ্যমান যেকোনো গ্লোবাল `opencode` ইনস্টলেশন অক্ষত রাখে।

#### MemPalace ইনস্টল করা

```bash
pip install mempalace
```

এটি ছাড়াও OpenCode কাজ করে — শুধু এজেন্টদের পার্সিস্টেন্ট মেমরি থাকবে না।

#### আপডেট করা (Updating)

```bash
cd /path/to/opencode
git pull
bun install
```

গ্লোবাল `opencode` কমান্ডটি স্বয়ংক্রিয়ভাবে নতুন বিল্ড গ্রহণ করে কারণ `npm link` একটি সিমলিঙ্ক তৈরি করে।

#### অফিসিয়াল রিলিজে ফিরে যাওয়া (Reverting to the official release)

```bash
# সোর্স লিঙ্ক সরান
cd /path/to/opencode/packages/opencode
bun unlink

# যদি আপনি ম্যানুয়াল র‍্যাপার তৈরি করে থাকেন
sudo rm /usr/local/bin/opencode

# অফিসিয়াল রিলিজ পুনরায় ইনস্টল করুন
npm i -g opencode-ai@latest
```

### পার্সিস্টেন্ট মেমরি (MemPalace)

OpenCode এ [MemPalace](https://github.com/anomalyco/mempalace) এর জন্য বিল্ট-ইন সমর্থন রয়েছে — একটি লোকাল-ফার্স্ট, সিমান্টিক মেমরি সিস্টেম যা এজেন্টদের সেশন জুড়ে পার্সিস্টেন্ট রিকল দেয়।

MemPalace ছাড়া, প্রতিটি সেশন শূন্য থেকে শুরু হয়। এটির সাথে, এজেন্টরা পূর্ববর্তী সিদ্ধান্ত, আর্কিটেকচার প্যাটার্ন, আবিষ্কৃত বাগ এবং রিজনিং ট্রেস মনে রাখতে পারে — এবং আপনার সম্পূর্ণ কোডবেস পুনরায় পড়ার পরিবর্তে সিমান্টিক সার্চের মাধ্যমে তাৎক্ষণিকভাবে সেগুলো পুনরুদ্ধার করতে পারে।

#### এটি কী করে

- **সিমান্টিক সার্চ** — এজেন্টরা শুধু কীওয়ার্ড নয়, অর্থ অনুযায়ী অতীত প্রসঙ্গ কোয়েরি করে
- **নলেজ গ্রাফ** — এন্টিটি সম্পর্ক ট্র্যাক করে (যেমন, "AuthService depends on DatabasePool")
- **সেশন ডায়েরি** — এজেন্টরা তারা যা কাজ করেছে তা লগ করে, সেশন জুড়ে ধারাবাহিকতা সক্ষম করে
- **প্রজেক্ট-স্কোপড** — প্রতিটি প্রজেক্ট আলাদা মেমরি পায়, `~/.local/share/opencode/` এর অধীনে লোকালভাবে সংরক্ষিত

#### সেটআপ (Setup)

MemPalace এর জন্য Python 3.12+ প্রয়োজন এবং এটি আলাদাভাবে ইনস্টল করা হয়:

```bash
pip install mempalace
```

ব্যাস। কোনো কনফিগারেশনের প্রয়োজন নেই — OpenCode প্রথম ব্যবহারে এটি স্বয়ংক্রিয়ভাবে সনাক্ত ও ইনিশিয়ালাইজ করে।

> [!NOTE]
> MemPalace ঐচ্ছিক। এটি ছাড়া OpenCode হুবহু একইভাবে কাজ করে — এজেন্টদের কেবল ক্রস-সেশন মেমরি থাকবে না। যদি `mempalace` ইনস্টল না থাকে, টুলটি প্রথম ব্যবহারে একটি পরিষ্কার এরর রিপোর্ট করে এবং অন্যান্য সমস্ত টুল স্বাভাবিকভাবে কাজ করতে থাকে।

#### অনুমতি (Permissions)

ডিফল্টভাবে, এজেন্ট MemPalace অপারেশন ব্যবহারের আগে জিজ্ঞাসা করবে। প্রম্পট ছাড়াই সব মেমরি অপারেশন অনুমোদন করতে, আপনার কনফিগে যোগ করুন:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### এজেন্টস (Agents)

OpenCode এ দুটি বিল্ট-ইন এজেন্ট রয়েছে যা আপনি `Tab` কি(key) দিয়ে পরিবর্তন করতে পারবেন।

- **build** - ডিফল্ট, ডেভেলপমেন্টের কাজের জন্য সম্পূর্ণ অ্যাক্সেসযুক্ত এজেন্ট
- **plan** - বিশ্লেষণ এবং কোড এক্সপ্লোরেশনের জন্য রিড-ওনলি এজেন্ট
  - ডিফল্টভাবে ফাইল এডিট করতে দেয় না
  - ব্যাশ কমান্ড চালানোর আগে অনুমতি চায়
  - অপরিচিত কোডবেস এক্সপ্লোর করা বা পরিবর্তনের পরিকল্পনা করার জন্য আদর্শ

এছাড়াও জটিল অনুসন্ধান এবং মাল্টিস্টেপ টাস্কের জন্য একটি **general** সাবএজেন্ট অন্তর্ভুক্ত রয়েছে।
এটি অভ্যন্তরীণভাবে ব্যবহৃত হয় এবং মেসেজে `@general` লিখে ব্যবহার করা যেতে পারে।

এজেন্টদের সম্পর্কে আরও জানুন: [docs](https://opencode.ai/docs/agents)।

### ডকুমেন্টেশন (Documentation)

কিভাবে OpenCode কনফিগার করবেন সে সম্পর্কে আরও তথ্যের জন্য, [**আমাদের ডকস দেখুন**](https://opencode.ai/docs)।

### অবদান (Contributing)

আপনি যদি OpenCode এ অবদান রাখতে চান, অনুগ্রহ করে একটি পুল রিকোয়েস্ট সাবমিট করার আগে আমাদের [কন্ট্রিবিউটিং ডকস](./CONTRIBUTING.md) পড়ে নিন।

### OpenCode এর উপর বিল্ডিং (Building on OpenCode)

আপনি যদি এমন প্রজেক্টে কাজ করেন যা OpenCode এর সাথে সম্পর্কিত এবং প্রজেক্টের নামের অংশ হিসেবে "opencode" ব্যবহার করেন, উদাহরণস্বরূপ "opencode-dashboard" বা "opencode-mobile", তবে দয়া করে আপনার README তে একটি নোট যোগ করে স্পষ্ট করুন যে এই প্রজেক্টটি OpenCode দল দ্বারা তৈরি হয়নি এবং আমাদের সাথে এর কোনো সরাসরি সম্পর্ক নেই।

### সাধারণ জিজ্ঞাসা (FAQ)

#### এটি Claude Code থেকে কীভাবে আলাদা?

সক্ষমতার দিক থেকে এটি Claude Code এর সাথে অনেকটাই মিল। এখানে প্রধান পার্থক্যগুলো দেওয়া হলো:

- ১০০% ওপেন সোর্স
- কোনো প্রোভাইডারের সাথে যুক্ত নয়। যদিও আমরা [OpenCode Zen](https://opencode.ai/zen) এর মাধ্যমে যে মডেলগুলো সরবরাহ করি সেগুলো সুপারিশ করি, OpenCode Claude, OpenAI, Google এমনকি লোকাল মডেলের সাথেও ব্যবহার করা যায়। মডেলগুলো যত বিকশিত হবে, তাদের মধ্যে ব্যবধান কমবে এবং মূল্য কমবে, তাই প্রোভাইডার-নিরপেক্ষ থাকা গুরুত্বপূর্ণ।
- আউট-অফ-দ্য-বক্স LSP সমর্থন
- TUI এর উপর মনোযোগ। OpenCode neovim ব্যবহারকারী এবং [terminal.shop](https://terminal.shop) এর নির্মাতাদের দ্বারা তৈরি; আমরা টার্মিনালে যা সম্ভব তার সীমা ঠেলে দেব।
- একটি ক্লায়েন্ট/সার্ভার আর্কিটেকচার। উদাহরণস্বরূপ, এটি OpenCode কে আপনার কম্পিউটারে চালানোর অনুমতি দিতে পারে যখন আপনি এটি একটি মোবাইল অ্যাপ থেকে দূর থেকে নিয়ন্ত্রণ করেন, অর্থাৎ TUI ফ্রন্টএন্ড সম্ভাব্য ক্লায়েন্টগুলোর মধ্যে শুধু একটি।
- MemPalace এর মাধ্যমে পার্সিস্টেন্ট ক্রস-সেশন মেমরি। এজেন্টরা যা শিখেছে তা মনে রাখে, সময়ের সাথে অপ্রয়োজনীয় প্রসঙ্গ এবং টোকেন ব্যবহার কমায়।

---

**আমাদের কমিউনিটিতে যুক্ত হোন** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
