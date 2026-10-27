// add_wallpapers.js — يحوّل الصور من incoming/ إلى WebP ويحدّث wallpapers.json
// التشغيل: node add_wallpapers.js   (يحتاج Node + ffmpeg بالـ PATH)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const JSON_PATH = path.join(ROOT, 'wallpapers.json');
const INCOMING = path.join(ROOT, 'incoming');
const DONE = path.join(ROOT, 'done');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const prefixFor = (catId) => catId.slice(0, 2).toLowerCase();

function today() {
  const d = new Date();
  const p = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ffmpeg(src, dst, w, h, q) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  execFileSync('ffmpeg', [
    '-v', 'error', '-i', src,
    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    '-c:v', 'libwebp', '-quality', `${q}`, dst, '-y',
  ]);
}

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const cats = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const colls = new Set(data.collections.map((c) => c.id));

  // أعلى رقم مستعمل لكل بادئة
  const maxNum = {};
  for (const w of data.wallpapers) {
    const m = /^([a-z]{2})(\d+)$/.exec(w.id);
    if (m) maxNum[m[1]] = Math.max(maxNum[m[1]] || 0, parseInt(m[2], 10));
  }

  if (!fs.existsSync(INCOMING)) {
    console.log('لا يوجد مجلد incoming/');
    return;
  }

  let added = 0;
  for (const catId of fs.readdirSync(INCOMING)) {
    const catDir = path.join(INCOMING, catId);
    if (!fs.statSync(catDir).isDirectory()) continue;
    const cat = cats[catId];
    if (!cat) { console.warn(`تخطّي: قسم غير معروف "${catId}" (أضفه لـ wallpapers.json)`); continue; }
    const wide = cat.ratio === '16:9';
    // مقاس النسخة الكاملة: من cat.full بالـ JSON، وإلا افتراضيّ حسب الاتجاه
    const [fw, fh] = (Array.isArray(cat.full) && cat.full.length === 2)
      ? cat.full
      : (wide ? [1920, 1080] : [1080, 1920]);
    // المصغّرة = ثلث الكامل (متل العادة)
    const [tw, th] = [Math.round(fw / 3), Math.round(fh / 3)];

    // ترتيب المجموعات حسب تعريفها بالـ collections، وأي مجلد إضافي بعدها
    const dirs = fs.readdirSync(catDir).filter((d) =>
      fs.statSync(path.join(catDir, d)).isDirectory());
    const orderedColls = [
      ...data.collections.map((c) => c.id).filter((id) => dirs.includes(id)),
      ...dirs.filter((d) => !colls.has(d)),
    ];
    // ترتيب رقميّ حسب رقم الصورة (1، 2، 3، ... 10، 11) مو ترتيب أحرف
    const numKey = (name) => {
      const m = /^(\d+)/.exec(path.basename(name, path.extname(name)));
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    for (const collId of orderedColls) {
      const collDir = path.join(catDir, collId);
      if (!fs.statSync(collDir).isDirectory()) continue;
      if (!colls.has(collId)) console.warn(`تنبيه: مجموعة غير معرّفة "${collId}" (أضفها لـ collections)`);

      const sorted = fs.readdirSync(collDir)
        .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
        .sort((a, b) => numKey(a) - numKey(b) || a.localeCompare(b));
      for (const file of sorted) {
        if (!EXTS.has(path.extname(file).toLowerCase())) continue;
        const src = path.join(collDir, file);
        const pfx = prefixFor(catId);
        const num = (maxNum[pfx] || 0) + 1;
        maxNum[pfx] = num;
        const id = `${pfx}${`${num}`.padStart(3, '0')}`;

        const fullRel = `${catId}/full/${id}.webp`;
        const thumbRel = `${catId}/thumbs/${id}.webp`;
        ffmpeg(src, path.join(ROOT, fullRel), fw, fh, 90);
        ffmpeg(src, path.join(ROOT, thumbRel), tw, th, 75);

        data.wallpapers.push({
          id, category: catId, collection: collId,
          thumb: thumbRel, full: fullRel, added: today(),
          w: fw, h: fh, // أبعاد الصورة الكاملة (لشارة الدقة بالتطبيق)
        });

        const doneDir = path.join(DONE, catId, collId);
        fs.mkdirSync(doneDir, { recursive: true });
        fs.renameSync(src, path.join(doneDir, file));
        added++;
        console.log(`+ ${id}  (${catId}/${collId})  ← ${file}`);
      }
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`\nتمّت إضافة ${added} خلفية. ارفع التغييرات على GitHub.`);
}

main();
