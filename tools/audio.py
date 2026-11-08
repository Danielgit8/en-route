"""Audio für die Etappen.

Jeder französische Satz bekommt eine MP3, je Stimme einmal. Die Zuordnung steht in content/audio.json
(Schlüssel "stimme|text" -> Datei). Die App sucht dort nach.

Ablauf
  python tools/audio.py plan           listet fehlende Sätze und schreibt pro ElevenLabs-Stimme einen Stapeltext
                                       mit Pausen (<break time="1.6s" />) nach tools/_batches/
  python tools/audio.py split VOICE F  schneidet eine ElevenLabs-MP3 an den Pausen und ordnet die Teile zu
  python tools/audio.py edge           erzeugt alles, was dann noch fehlt, mit edge-tts (kostenlos, Microsoft)

ElevenLabs-Stapel: eine Anfrage pro Stimme statt hunderter Einzelanfragen. Pausen von 1,6 s trennen die Sätze,
Kommas im Satz machen nur kurze Pausen, deshalb klappt das Schneiden zuverlässig.
"""
import asyncio, hashlib, json, re, subprocess, sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
CONTENT = json.loads((APP / "content" / "etappen.json").read_text(encoding="utf-8"))
VOICES = CONTENT["stimmen"]
AUDIO = APP / "audio"
MAP_FILE = APP / "content" / "audio.json"
BATCH = APP / "tools" / "_batches"


def speak(t):
    t = re.sub(r"\([^)]*\)", "", t)
    t = re.sub(r"\s*…\s*$", "", t)          # "Je m'appelle …" -> "Je m'appelle"
    return re.sub(r"\s+", " ", t).strip()


def variants(fr):
    return [("m", fr["m"]), ("f", fr["f"])] if isinstance(fr, dict) else [(None, fr)]


def needed():
    """Alle (stimme, text)-Paare, die die App abspielen kann."""
    out = []
    add = lambda v, t: out.append((v, t))
    for e in CONTENT["etappen"]:
        sp = e["sprecher"]
        for l in e["dialog"]:
            add(sp[l["s"]], l["fr"])
        for r in e["rollenspiel"]:
            add(sp[r["s"]], r["fr"])
            for g, t in variants(r["muster"]):
                for lv in (["lm"] if g == "m" else ["lf"] if g == "f" else ["lm", "lf"]):
                    add(lv, t)
        for k in e["karten"]:
            if k.get("dir") == "fr":
                add(k["v"], k["fr"])
            else:
                for g, t in variants(k["fr"]):
                    for lv in (["lm"] if g == "m" else ["lf"] if g == "f" else ["lm", "lf"]):
                        add(lv, t)
        for b in e["erklaerung"]["beispiele"] + e["aussprache"]["beispiele"]:
            add("lm", b["fr"]); add("lf", b["fr"])
        if e.get("extra"):
            for x in e["extra"]["liste"]:
                add(e["extra"]["v"], x["fr"])
    return out


def fname(el, text):
    return "a/" + hashlib.sha1(f"{el}|{speak(text)}".encode()).hexdigest()[:12] + ".mp3"


def write_map():
    m = {}
    for v, t in needed():
        f = fname(VOICES[v]["el"], t)
        if (AUDIO / f).exists():
            m[f"{v}|{t}"] = f
    MAP_FILE.write_text(json.dumps(m, ensure_ascii=False, indent=0), encoding="utf-8")
    total = len({(v, t) for v, t in needed()})
    print(f"audio.json: {len(m)} von {total} Sätzen haben Audio")


def missing_by_el():
    by = {}
    for v, t in needed():
        el = VOICES[v]["el"]
        f = fname(el, t)
        if not (AUDIO / f).exists():
            lst = by.setdefault(el, [])
            if speak(t) not in [speak(x) for x in lst]:
                lst.append(t)
    return by


def plan():
    BATCH.mkdir(parents=True, exist_ok=True)
    by = missing_by_el()
    total = 0
    for el, texts in by.items():
        names = sorted({VOICES[v]["name"] for v in VOICES if VOICES[v]["el"] == el})
        # höchstens 20 Sätze pro Anfrage: zu viele Pausen in einem Stück machen die Stimme unruhig
        for i in range(0, len(texts), 20):
            part = texts[i:i + 20]
            body = ' <break time="1.6s" /> '.join(speak(t) for t in part)
            (BATCH / f"{el}_{i // 20}.txt").write_text(body, encoding="utf-8")
            (BATCH / f"{el}_{i // 20}.json").write_text(json.dumps(part, ensure_ascii=False, indent=0), encoding="utf-8")
        chars = sum(len(speak(t)) for t in texts)
        total += chars
        print(f"{el} ({', '.join(names)}): {len(texts)} Sätze, {chars} Zeichen")
    print(f"zusammen {total} Zeichen")


def silences(mp3, d=0.5):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", f"silencedetect=noise=-40dB:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr).groups()
    dur = 3600 * float(h) + 60 * float(m) + float(sec)
    sil = list(zip(st, en))
    # Stille, die nur von einem kurzen Knacken (< 0,2 s) unterbrochen ist, zusammenlegen
    merged = []
    for s_, e_ in sil:
        if merged and s_ - merged[-1][1] < 0.2:
            merged[-1] = (merged[-1][0], e_)
        else:
            merged.append((s_, e_))
    return [(s_, e_) for s_, e_ in merged if s_ > 0.05 and e_ < dur - 0.05], dur


def choose(sil, dur, texts):
    """Aus allen Pausen genau len(texts)-1 auswählen (Reihenfolge bleibt), so dass die Satzlängen
    am besten zur Zeichenzahl passen und lange Pausen bevorzugt werden. Dynamische Programmierung."""
    import math
    n, P = len(texts), len(sil)
    if P < n - 1:
        return None
    chars = [max(len(speak(t)), 3) for t in texts]
    speech = dur - sum(e - s for s, e in sil)
    rate = speech / sum(chars)
    starts = [0.0] + [e for s, e in sil]          # Start nach Pause j-1 (j=0: Dateianfang)
    ends = [s for s, e in sil] + [dur]            # Ende vor Pause j (j=P: Dateiende)

    def seg_cost(i, a, b):                         # Satz i läuft von starts[a] bis ends[b]
        L = ends[b] - starts[a]
        if L <= 0.05: return 1e9
        inner = sum(sil[k][1] - sil[k][0] for k in range(a, b))   # verworfene Pausen im Satz
        return math.log(L / (chars[i] * rate + inner)) ** 2 + 1.5 * sum(max(0, sil[k][1] - sil[k][0] - 0.9) for k in range(a, b))

    INF = float("inf")
    # best[i][b] = Kosten, wenn Satz i an Pause b endet (b = P heißt Dateiende)
    best = [[INF] * (P + 1) for _ in range(n)]
    back = [[-1] * (P + 1) for _ in range(n)]
    for b in range(P + 1):
        best[0][b] = seg_cost(0, 0, b)
    for i in range(1, n):
        for b in range(i, P + 1):
            for a in range(i, b + 1):              # Satz i beginnt nach Pause a-1
                c = best[i - 1][a - 1] + seg_cost(i, a, b)
                if c < best[i][b]:
                    best[i][b], back[i][b] = c, a
    if best[n - 1][P] == INF:
        return None
    keep, b = [], P
    for i in range(n - 1, 0, -1):
        a = back[i][b]
        keep.append(sil[a - 1]); b = a - 1
    return list(reversed(keep))


def split(batch, mp3):
    texts = json.loads((BATCH / f"{batch}.json").read_text(encoding="utf-8"))
    el = batch.split("_")[0]
    sil, dur = silences(mp3)
    picked = choose(sil, dur, texts)
    if not picked:
        print(f"ACHTUNG: {len(texts)} Sätze, aber nur {len(sil)} Pausen gefunden. Nichts geschnitten.")
        return False
    if len(sil) != len(picked):
        print(f"{len(sil) - len(picked)} Pause(n) im Satz erkannt und übergangen")
    sil = picked
    cuts = [0.0] + [s + 0.12 for s, e in sil]
    ends = [s + 0.12 for s, e in sil] + [dur]
    starts = [0.0] + [max(e - 0.10, 0) for s, e in sil]
    (AUDIO / "a").mkdir(parents=True, exist_ok=True)
    for t, a, b in zip(texts, starts, ends):
        out = AUDIO / fname(el, t)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(mp3),
                        "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse",
                        "-codec:a", "libmp3lame", "-b:a", "96k", "-ac", "1", str(out)], check=True)
    print(f"{len(texts)} Dateien geschnitten")
    write_map()
    return True


async def edge_all():
    import edge_tts
    sem = asyncio.Semaphore(6)
    jobs = []
    for v, t in needed():
        f = AUDIO / fname(VOICES[v]["el"], t)
        if not f.exists() and f not in [j[2] for j in jobs]:
            jobs.append((speak(t), VOICES[v]["edge"], f))

    async def one(text, voice, path):
        async with sem:
            path.parent.mkdir(parents=True, exist_ok=True)
            for i in range(3):
                try:
                    await edge_tts.Communicate(text, voice).save(str(path)); return
                except Exception as e:
                    if i == 2: print("FEHLER", text, e)
                    await asyncio.sleep(2)
    print(f"edge-tts: {len(jobs)} Dateien")
    await asyncio.gather(*(one(*j) for j in jobs))
    write_map()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if cmd == "plan": plan()
    elif cmd == "split": split(sys.argv[2], Path(sys.argv[3]))
    elif cmd == "edge": asyncio.run(edge_all())
    elif cmd == "map": write_map()
