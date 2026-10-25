# خلفيات تطبيق سكنات — Skins Pro Wallpapers

هذا المستودع فيه خلفيات التطبيق. التطبيق يقرأ `wallpapers.json` من raw.githubusercontent
(حتى تبين الإضافات الجديدة فوراً بلا كاش طويل)، والصور نفسها من jsDelivr.

## وين أحطّ الصور الجديدة

حطّ الصور الأصلية (PNG أو JPG، كبيرة الحجم) داخل مجلد `incoming/` حسب القسم والمجموعة:

```
incoming/<القسم>/<المجموعة>/صورة.jpg
```

- **القسم** = id القسم من `wallpapers.json` (مثلاً `phone` أو `pc` أو `chat`).
- **المجموعة** = id المجموعة (مثلاً `outfits` أو `weapons` أو `minimal`).

أمثلة:
```
incoming/phone/outfits/01.jpg
incoming/phone/weapons/هجوم.png
incoming/pc/vehicles/uaz.jpg
incoming/chat/minimal/dark1.jpg
```

بعدها قُل للمساعد **«ضيف الخلفيات»** — السكريبت رح:
1. يعمل نسخة كاملة WebP (جودة 90): الهاتف/المحادثات 1080×1920، الكمبيوتر 1920×1080.
2. يعمل نسخة مصغّرة WebP (جودة 75): عرض 360 للهاتف/المحادثات، و640 للكمبيوتر.
3. يعطي كل صورة `id` جديد تلقائياً ويضيفها لـ `wallpapers.json` بتاريخ اليوم.
4. ينقل الأصلية إلى `done/`.

ثم يُرفع كل شي على GitHub.

## إضافة قسم أو مجموعة جديدة

عدّل `wallpapers.json` فقط (بلا تحديث للتطبيق):
- **قسم جديد** (مثلاً صور بروفايل): أضفه في `categories` بـ `id` و`title` و`ratio` (`9:16` عمودي أو `16:9` أفقي).
- **مجموعة جديدة**: أضفها في `collections` بـ `id` و`title`.

## حذف الصور التجريبية

كل الخلفيات التجريبية معلّمة `"demo": true` في `wallpapers.json`. لحذفها:
احذف أسطرها من `wallpapers.json` واحذف ملفاتها من `phone/` و`pc/`، ثم ارفع.

## السكربتات
- `add_wallpapers.py` — نسخة بايثون (تحتاج Python + Pillow): `python add_wallpapers.py`
- `add_wallpapers.js` — نسخة Node (تحتاج Node + ffmpeg): `node add_wallpapers.js`

الاتنين يعملوا نفس الشي؛ استعمل المتوفّر عندك.
