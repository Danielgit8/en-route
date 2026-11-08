# En route · Französisch für zwei

Lern-App für den Weg nach Frankreich: Hören, Verstehen, Nachsprechen, Selbst reden, Wiederholen. Zwei Profile mit eigenem Fortschritt, Anmeldung mit dem PARA-Cockpit-Konto (Supabase, Zeilen `__enroute`, `__enroute_p1`, `__enroute_p2` in der Tabelle `items`).

Live: https://danielgit8.github.io/en-route/

## Aufbau
- `content/etappen.json`: alle Inhalte (Dialoge, Fragen, Erklärungen, Rollenspiele, Karten). Reihenfolge und Begründung stehen im `Leitfaden.md` im Projektordner.
- `content/audio.json`: welcher Satz welche Audiodatei hat (`stimme|text` → `audio/a/....mp3`).
- `tools/audio.py`: Audio erzeugen. `plan` schreibt Stapeltexte für ElevenLabs (eine Anfrage pro Stimme, Pausen dazwischen), `split` schneidet die fertige MP3 in Sätze, `edge` füllt Lücken kostenlos mit edge-tts.
- `tools/check_audio.py`: prüft alle Dateien mit Spracherkennung (faster-whisper).

## Neue Etappe
1. In `content/etappen.json` eine Etappe nach dem Muster der anderen anhängen (neue Stimmen oben bei `stimmen`).
2. `python tools/audio.py plan`, Stapel in ElevenLabs erzeugen (Modell multilingual v2), dann `python tools/audio.py split <stapel> <datei.mp3>`.
3. In `sw.js` die Version hochzählen, committen, pushen.
