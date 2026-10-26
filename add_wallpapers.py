#!/usr/bin/env python3
# add_wallpapers.py — يحوّل الصور من incoming/ إلى WebP ويحدّث wallpapers.json
# التشغيل: python add_wallpapers.py   (يحتاج Python 3 + Pillow:  pip install pillow)
import json
import os
import re
import shutil
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(ROOT, "wallpapers.json")
INCOMING = os.path.join(ROOT, "incoming")
DONE = os.path.join(ROOT, "done")
EXTS = {".jpg", ".jpeg", ".png", ".webp"}

from PIL import Image  # noqa: E402


def cover_resize(img, w, h):
    sw, sh = img.size
    scale = max(w / sw, h / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def save_webp(src, dst, w, h, q):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img = Image.open(src).convert("RGB")
    cover_resize(img, w, h).save(dst, "WEBP", quality=q)


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    cats = {c["id"]: c for c in data["categories"]}
    colls = {c["id"] for c in data["collections"]}

    max_num = {}
    for wp in data["wallpapers"]:
        m = re.match(r"^([a-z]{2})(\d+)$", wp["id"])
        if m:
            max_num[m.group(1)] = max(max_num.get(m.group(1), 0), int(m.group(2)))

    if not os.path.isdir(INCOMING):
        print("لا يوجد مجلد incoming/")
        return

    added = 0
    today = date.today().isoformat()
    for cat_id in os.listdir(INCOMING):
        cat_dir = os.path.join(INCOMING, cat_id)
        if not os.path.isdir(cat_dir):
            continue
        cat = cats.get(cat_id)
        if not cat:
            print(f'تخطّي: قسم غير معروف "{cat_id}"')
            continue
        wide = cat["ratio"] == "16:9"
        fw, fh = (1920, 1080) if wide else (1080, 1920)
        tw, th = (640, 360) if wide else (360, 640)

        # ترتيب المجموعات حسب تعريفها بالـ collections، وأي مجلد إضافي بعدها
        dirs = [d for d in os.listdir(cat_dir)
                if os.path.isdir(os.path.join(cat_dir, d))]
        ordered_colls = [c["id"] for c in data["collections"] if c["id"] in dirs]
        ordered_colls += [d for d in dirs if d not in colls]

        def num_key(name):
            import re
            m = re.match(r"(\d+)", os.path.splitext(name)[0])
            return int(m.group(1)) if m else 10**12

        for coll_id in ordered_colls:
            coll_dir = os.path.join(cat_dir, coll_id)
            if not os.path.isdir(coll_dir):
                continue
            if coll_id not in colls:
                print(f'تنبيه: مجموعة غير معرّفة "{coll_id}"')

            files = [f for f in os.listdir(coll_dir)
                     if os.path.splitext(f)[1].lower() in EXTS]
            # ترتيب رقميّ حسب رقم الصورة (1، 2، ... 10، 11) مو ترتيب أحرف
            files.sort(key=lambda f: (num_key(f), f))
            for file in files:
                if os.path.splitext(file)[1].lower() not in EXTS:
                    continue
                src = os.path.join(coll_dir, file)
                pfx = cat_id[:2].lower()
                num = max_num.get(pfx, 0) + 1
                max_num[pfx] = num
                wid = f"{pfx}{num:03d}"
                full_rel = f"{cat_id}/full/{wid}.webp"
                thumb_rel = f"{cat_id}/thumbs/{wid}.webp"
                save_webp(src, os.path.join(ROOT, full_rel), fw, fh, 90)
                save_webp(src, os.path.join(ROOT, thumb_rel), tw, th, 75)
                data["wallpapers"].append({
                    "id": wid, "category": cat_id, "collection": coll_id,
                    "thumb": thumb_rel, "full": full_rel, "added": today,
                    "w": fw, "h": fh,  # أبعاد الصورة الكاملة (لشارة الدقة بالتطبيق)
                })
                done_dir = os.path.join(DONE, cat_id, coll_id)
                os.makedirs(done_dir, exist_ok=True)
                shutil.move(src, os.path.join(done_dir, file))
                added += 1
                print(f"+ {wid}  ({cat_id}/{coll_id})  <- {file}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nتمّت إضافة {added} خلفية. ارفع التغييرات على GitHub.")


if __name__ == "__main__":
    main()
