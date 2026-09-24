<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="شعار OpenCode">
    </picture>
  </a>
</p>
<p align="center">وكيل برمجة بالذكاء الاصطناعي مفتوح المصدر.</p>
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

### التثبيت

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# مديري الحزم
npm i -g opencode-ai@latest        # او bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS و Linux (موصى به، دائما محدث)
brew install opencode              # macOS و Linux (صيغة brew الرسمية، تحديث اقل)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # اي نظام
nix run nixpkgs#opencode           # او github:anomalyco/opencode لاحدث فرع dev
```

> [!TIP]
> احذف الاصدارات الاقدم من 0.1.x قبل التثبيت.

### تطبيق سطح المكتب (BETA)

يتوفر OpenCode ايضا كتطبيق سطح مكتب. قم بالتنزيل مباشرة من [صفحة الاصدارات](https://github.com/anomalyco/opencode/releases) او من [opencode.ai/download](https://opencode.ai/download).

| المنصة                | التنزيل                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb` او `.rpm` او AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### مجلد التثبيت

يحترم سكربت التثبيت ترتيب الاولوية التالي لمسار التثبيت:

1. `$OPENCODE_INSTALL_DIR` - مجلد تثبيت مخصص
2. `$XDG_BIN_DIR` - مسار متوافق مع مواصفات XDG Base Directory
3. `$HOME/bin` - مجلد الثنائيات القياسي للمستخدم (ان وجد او امكن انشاؤه)
4. `$HOME/.opencode/bin` - المسار الافتراضي الاحتياطي

```bash
# امثلة
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### البناء من المصدر

اذا كنت تريد تشغيل هذا الـ fork (مع تكامل MemPalace) بدلا من الاصدار الرسمي، قم بالبناء والتثبيت من المصدر. هذا يستبدل اي امر `opencode` موجود على نظامك.

#### المتطلبات المسبقة

- [Bun](https://bun.sh) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [Node.js](https://nodejs.org) v20+ (لاجل `npm link`)
- [Python](https://python.org) 3.12+ (لدعم MemPalace)
- Git

#### الاستنساخ والتثبيت

```bash
git clone https://github.com/gali1/opencode.git
cd opencode
bun install
```

#### ازالة OpenCode الموجود (ان كان مثبتا)

```bash
# npm
npm uninstall -g opencode-ai

# Homebrew
brew uninstall opencode

# Scoop
scoop uninstall opencode

# التثبيت اليدوي (سكربت curl)
rm -f "$HOME/.opencode/bin/opencode" "$HOME/bin/opencode" "$HOME/.local/bin/opencode"
```

> [!IMPORTANT]
> يجب ازالة التثبيت الموجود اولا. تشغيل `npm link` بينما الحزمة الرسمية لا تزال مثبتة عالميا قد يسبب تعارضات حيث يستمر النظام في تحليل الملف الثنائي القديم.

#### الربط عالميا

```bash
# من جذر المستودع — اربط الـ CLI بحيث يشير `opencode` الى مصدرك المحلي
cd packages/opencode
bun link
```

اذا لم يضع `bun link` الملف الثنائي على `$PATH`، انشئ غلافا (wrapper) يدويا:

```bash
# اضبط المسار الى مكان استنساخك
echo '#!/bin/sh
exec bun run /home/$USER/opencode/packages/opencode/src/index.ts "$@"' \
  | sudo tee /usr/local/bin/opencode > /dev/null
sudo chmod +x /usr/local/bin/opencode
```
اذا لم ينجح الاسلوب اعلاه، جرب الاوامر التالية بدلا منه:

```bash
sudo tee /usr/local/bin/opencode > /dev/null <<'EOF'
#!/bin/sh
cd /home/$USER/opencode || exit 1
exec bun run --cwd packages/opencode --conditions=browser src/index.ts "$@"
EOF

sudo chmod +x /usr/local/bin/opencode
```
اذا لم ينجح الاسلوبان اعلاه، جرب الاوامر التالية بدلا منهما:

```bash
# 1. ابنِ الملف الثنائي الاصلي linux-x64 (يضمّن Web UI) من packages/opencode
bun run build -- --single

# 2. انسخ الملف الثنائي الحالي احتياطيا اذا اردت نقطة تراجع (اختياري)
sudo cp /usr/local/bin/opencode /usr/local/bin/opencode._$(date +%m-%d-%Y)_PREBUILD

# 3. ثبّت الملف الثنائي الجديد + سكربتات mempalace المرافقة له (مطلوب — build.ts:160-161)
sudo cp dist/opencode-linux-x64/bin/opencode /usr/local/bin/opencode
sudo cp dist/opencode-linux-x64/bin/mempalace_bridge.py dist/opencode-linux-x64/bin/mempalace_rekal_engine.py /usr/local/bin/

# 4. تحقق
opencode --version
```

#### التحقق

```bash
# يجب ان يطبع الاصدار من مصدرك المحلي
opencode --version

# يجب ان يشير الى غلافك المحلي او مسار bun link
which opencode
```

#### التشغيل بدون تثبيت عالمي (بديل)

اذا كنت تفضل عدم استبدال الامر العالمي، شغّل مباشرة من المصدر:

```bash
cd /path/to/opencode
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

هذا يترك اي تثبيت عالمي موجود لـ `opencode` دون مساس.

#### تثبيت MemPalace

```bash
pip install mempalace
```

بدون هذا، يظل OpenCode يعمل — لكن الوكلاء لن يمتلكوا ذاكرة دائمة فقط.

#### التحديث

```bash
cd /path/to/opencode
git pull
bun install
```

يلتقط امر `opencode` العالمي البناء الجديد تلقائيا لان `npm link` ينشئ رابطا رمزيا (symlink).

#### العودة الى الاصدار الرسمي

```bash
# احذف رابط المصدر
cd /path/to/opencode/packages/opencode
bun unlink

# اذا كنت قد انشأت الغلاف اليدوي
sudo rm /usr/local/bin/opencode

# اعد تثبيت الاصدار الرسمي
npm i -g opencode-ai@latest
```

### الذاكرة الدائمة (MemPalace)

يتضمن OpenCode دعما مدمجا لـ [MemPalace](https://github.com/anomalyco/mempalace) — نظام ذاكرة دلالي محلي اولا يمنح الوكلاء استرجاعا دائما عبر الجلسات.

بدون MemPalace، تبدأ كل جلسة من الصفر. معه، يمكن للوكلاء تذكر القرارات السابقة وانماط البنية والاخطاء المكتشفة وآثار الاستدلال — واسترجاعها فورا عبر البحث الدلالي بدلا من اعادة قراءة قاعدة الكود بالكامل.

#### ماذا يفعل

- **البحث الدلالي** — يستعلم الوكلاء عن السياق السابق بالمعنى وليس بالكلمات المفتاحية فقط
- **الرسم البياني المعرفي** — يتتبع علاقات الكيانات (مثل "AuthService depends on DatabasePool")
- **مذكرات الجلسة** — يسجل الوكلاء ما عملوا عليه، مما يتيح الاستمرارية عبر الجلسات
- **محصور بالمشروع** — يحصل كل مشروع على ذاكرة معزولة، مخزنة محليا تحت `~/.local/share/opencode/`

#### الاعداد

يتطلب MemPalace اصدار Python 3.12+ ويثبّت بشكل منفصل:

```bash
pip install mempalace
```

هذا كل شيء. لا حاجة لاي ضبط — يكتشفه OpenCode ويهيّئه تلقائيا عند اول استخدام.

> [!NOTE]
> MemPalace اختياري. يعمل OpenCode بنفس الطريقة تماما بدونه — لن يمتلك الوكلاء ذاكرة عبر الجلسات فقط. اذا لم يكن `mempalace` مثبتا، تُبلغ الاداة عن خطأ واضح عند اول استخدام وتستمر جميع الادوات الاخرى في العمل بشكل طبيعي.

#### الاذونات

افتراضيا، سيسأل الوكيل قبل استخدام عمليات MemPalace. للسماح بجميع عمليات الذاكرة دون مطالبات، اضف الى ضبطك:

```json
{
  "permissions": {
    "mempalace": "allow"
  }
}
```

### Agents

يتضمن OpenCode وكيليْن (Agents) مدمجين يمكنك التبديل بينهما باستخدام زر `Tab`.

- **build** - الافتراضي، وكيل بصلاحيات كاملة لاعمال التطوير
- **plan** - وكيل للقراءة فقط للتحليل واستكشاف الكود
  - يرفض تعديل الملفات افتراضيا
  - يطلب الاذن قبل تشغيل اوامر bash
  - مثالي لاستكشاف قواعد كود غير مألوفة او لتخطيط التغييرات

بالاضافة الى ذلك يوجد وكيل فرعي **general** للبحث المعقد والمهام متعددة الخطوات.
يستخدم داخليا ويمكن استدعاؤه بكتابة `@general` في الرسائل.

تعرف على المزيد حول [agents](https://opencode.ai/docs/agents).

### التوثيق

لمزيد من المعلومات حول كيفية ضبط OpenCode، [**راجع التوثيق**](https://opencode.ai/docs).

### المساهمة

اذا كنت مهتما بالمساهمة في OpenCode، يرجى قراءة [contributing docs](./CONTRIBUTING.md) قبل ارسال pull request.

### البناء فوق OpenCode

اذا كنت تعمل على مشروع مرتبط بـ OpenCode ويستخدم "opencode" كجزء من اسمه (مثل "opencode-dashboard" او "opencode-mobile")، يرجى اضافة ملاحظة في README توضح انه ليس مبنيا بواسطة فريق OpenCode ولا يرتبط بنا بأي شكل.

### الاسئلة الشائعة

#### كيف يختلف هذا عن Claude Code؟

انه مشابه جدا لـ Claude Code من حيث القدرات. اليك الفروقات الرئيسية:

- مفتوح المصدر بنسبة 100%
- غير مرتبط بأي مزود. رغم اننا نوصي بالنماذج التي نوفرها عبر [OpenCode Zen](https://opencode.ai/zen)، يمكن استخدام OpenCode مع Claude او OpenAI او Google او حتى النماذج المحلية. مع تطور النماذج، ستتقلص الفجوات بينها وستنخفض الاسعار، لذا فإن الحياد تجاه المزودين امر مهم.
- دعم LSP جاهز مباشرة
- التركيز على TUI. بُني OpenCode بواسطة مستخدمي neovim ومنشئي [terminal.shop](https://terminal.shop)؛ سندفع حدود ما هو ممكن في الطرفية.
- بنية عميل/خادم. هذا مثلا يتيح لـ OpenCode العمل على حاسوبك بينما تتحكم به عن بُعد من تطبيق جوال، ما يعني ان واجهة TUI ليست سوى احد العملاء المحتملين.
- ذاكرة دائمة عبر الجلسات بواسطة MemPalace. يتذكر الوكلاء ما تعلموه، مما يقلل السياق الزائد واستهلاك الرموز مع الوقت.

---

**انضم الى مجتمعنا** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
