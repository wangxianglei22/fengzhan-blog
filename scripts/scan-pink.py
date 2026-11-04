import re, os, colorsys
root = "src"
hexre = re.compile(r"#([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{3})\b")
def norm(h):
    h = h.lower()
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return h
def is_pink(h):
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    hh, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    deg = hh * 360
    return s > 0.06 and (330 <= deg <= 360 or deg <= 25)
rows = []
for dp, dn, fn in os.walk(root):
    for f in fn:
        if not f.endswith((".astro", ".svelte", ".css", ".styl", ".ts", ".js", ".svg")):
            continue
        p = os.path.join(dp, f).replace(os.sep, "/")
        txt = open(p, encoding="utf-8", errors="ignore").read()
        for i, line in enumerate(txt.splitlines(), 1):
            for m in hexre.finditer(line):
                h = norm(m.group(1) or m.group(2))
                if is_pink(h):
                    rows.append((p, i, h, line.strip()[:130]))
for r in rows:
    print(f"{r[0]}:{r[1]}  {r[2]}  {r[3]}")
print("TOTAL pink-ish hits:", len(rows))
