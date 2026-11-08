"""Prüft jede Audiodatei mit Spracherkennung (faster-whisper) gegen den erwarteten Satz.
Aufruf: python tools/check_audio.py   -> listet Dateien, deren Inhalt nicht zum Text passt.
"""
import difflib, json, re, sys, unicodedata
from pathlib import Path
from faster_whisper import WhisperModel

APP = Path(__file__).resolve().parent.parent
amap = json.loads((APP / "content" / "audio.json").read_text(encoding="utf-8"))
NUM = {"1": "un", "2": "deux", "3": "trois", "4": "quatre", "5": "cinq", "6": "six", "7": "sept", "8": "huit", "9": "neuf",
       "10": "dix", "11": "onze", "12": "douze", "13": "treize", "14": "quatorze", "15": "quinze", "16": "seize",
       "17": "dix-sept", "18": "dix-huit", "19": "dix-neuf", "20": "vingt", "24": "vingt-quatre"}


def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"\d+", lambda m: NUM.get(m.group(), m.group()), t)
    return re.sub(r"[^a-z ]+", " ", t.replace("-", " ")).split()


m = WhisperModel("small", device="cpu", compute_type="int8")
seen, bad = set(), []
for key, f in amap.items():
    if f in seen:
        continue
    seen.add(f)
    text = key.split("|", 1)[1]
    segs, _ = m.transcribe(str(APP / "audio" / f), language="fr", initial_prompt=text if "--hint" in sys.argv else None)
    got = " ".join(s.text for s in segs)
    r = difflib.SequenceMatcher(None, norm(text), norm(got)).ratio()
    if r < 0.75:
        bad.append((r, key, got.strip(), f))
for r, key, got, f in sorted(bad):
    print(f"{r:.2f}  {key}\n      gehört: {got}\n      {f}")
print(f"{len(seen)} Dateien geprüft, {len(bad)} auffällig")
