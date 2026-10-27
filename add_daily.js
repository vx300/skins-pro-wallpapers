// add_daily.js — يحوّل صور "خلفية اليوم" (16:9) لـ WebP ويحدّث قائمة daily بالـ JSON
// التشغيل: ضع الصور المرقّمة بـ incoming/daily/ ثم: node add_daily.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const JSON_PATH = path.join(ROOT, 'wallpapers.json');
const SRC = path.join(ROOT, 'incoming', 'daily');
const DONE = path.join(ROOT, 'done', 'daily');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const FW = 1920, FH = 1080;     // النسخة الكاملة
const TW = 800, TH = 450;       // المصغّرة (عرض 800، 16:9)

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
const numKey = (name) => {
  const m = /^(\d+)/.exec(path.basename(name, path.extname(name)));
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
};

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  if (!Array.isArray(data.daily)) data.daily = [];

  let maxNum = 0;
  for (const it of data.daily) {
    const m = /^d(\d+)$/.exec(it.id || '');
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }

  if (!fs.existsSync(SRC)) { console.log('لا يوجد incoming/daily/'); return; }
  const files = fs.readdirSync(SRC)
    .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => numKey(a) - numKey(b) || a.localeCompare(b));

  let added = 0;
  for (const file of files) {
    const num = ++maxNum;
    const id = `d${`${num}`.padStart(3, '0')}`;
    const fullRel = `daily/full/${id}.webp`;
    const thumbRel = `daily/thumbs/${id}.webp`;
    ffmpeg(path.join(SRC, file), path.join(ROOT, fullRel), FW, FH, 90);
    ffmpeg(path.join(SRC, file), path.join(ROOT, thumbRel), TW, TH, 75);
    data.daily.push({
      id, category: 'daily', collection: '',
      thumb: thumbRel, full: fullRel, added: today(), w: FW, h: FH,
    });
    fs.mkdirSync(DONE, { recursive: true });
    fs.renameSync(path.join(SRC, file), path.join(DONE, file));
    added++;
    console.log(`+ ${id}  ← ${file}`);
  }

  // ترتيب القائمة رقميّاً حسب id
  data.daily.sort((a, b) => numKey(a.id.slice(1)) - numKey(b.id.slice(1)));
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`\nتمّت إضافة ${added} خلفية يوميّة. المجموع: ${data.daily.length}. ارفع على GitHub.`);
}
main();
