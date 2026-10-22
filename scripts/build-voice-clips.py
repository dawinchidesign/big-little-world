"""Align ElevenLabs Scribe word timings with the game script, then render clips.

Input: tmp/voice/<pack>.mp3 and <pack>.words.json from the SAME Scribe source.
No network calls or API credentials are used. Uncertain alignments fail closed.
"""
import difflib
import concurrent.futures
import json
import pathlib
import re
import subprocess
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / "tmp/voice"
OUT = ROOT / "public/voice"
script = json.loads((ROOT / "voice-source/script.json").read_text())


def tokens(text):
    text = unicodedata.normalize("NFKC", text).casefold().replace("ё", "е")
    return re.findall(r"[^\W_]+", text, flags=re.UNICODE)


catalog = {"provider": "ElevenLabs", "model": "eleven_v3", "entries": []}
by_id = {}
for entry in script["entries"]:
    item = {k: entry[k] for k in ["id", "role", "text"]}
    item["files"] = {}
    catalog["entries"].append(item)
    by_id[item["id"]] = item

report = {"completed_packs": [], "missing_packs": [], "clips": [], "rejected": []}
jobs = []
for pack in script["packs"]:
    audio = WORK / (pack["id"] + ".mp3")
    word_path = WORK / (pack["id"] + ".words.json")
    if not audio.exists() or not word_path.exists():
        report["missing_packs"].append(pack["id"])
        continue
    words = json.loads(word_path.read_text())["words"]
    expected, ranges, heard, heard_word = [], [], [], []
    for entry in pack["entries"]:
        start = len(expected)
        expected += tokens(entry["spoken"])
        ranges.append((entry, start, len(expected)))
    for wi, word in enumerate(words):
        normalized = tokens(word["text"])
        heard += normalized
        heard_word += [wi] * len(normalized)
    matches = {}
    for block in difflib.SequenceMatcher(None, expected, heard, autojunk=False).get_matching_blocks():
        for offset in range(block.size):
            matches[block.a + offset] = heard_word[block.b + offset]
    duration = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(audio)
    ]))
    accepted = []
    for entry, a, b in ranges:
        indices = [i for i in range(a, b) if i in matches]
        coverage = len(indices) / max(1, b - a)
        if not indices or coverage < .72 or indices[0] - a > 1 or b - 1 - indices[-1] > 1:
            report["rejected"].append({"pack": pack["id"], "id": entry["id"], "coverage": round(coverage, 3)})
            continue
        first, last = matches[indices[0]], matches[indices[-1]]
        # Include a single unmatched edge token only when it lies before the next
        # line. Scribe sometimes writes a compound as a different token.
        if indices[0] > a and first > 0:
            first -= 1
        if indices[-1] < b - 1 and last + 1 < len(words):
            last += 1
        start = max(0, words[first]["start"] - .12)
        end = min(duration, words[last]["end"] + .18)
        if first > 0:
            start = max(start, (words[first - 1]["end"] + words[first]["start"]) / 2)
        if last + 1 < len(words):
            end = min(end, (words[last]["end"] + words[last + 1]["start"]) / 2)
        if end <= start:
            raise ValueError("Invalid timing: " + entry["id"])
        file = pack["lang"] + "/" + entry["id"] + ".mp3"
        target = OUT / file
        target.parent.mkdir(parents=True, exist_ok=True)
        jobs.append((target, audio, word_path, start, end, entry["id"], pack["lang"], file))
        report["clips"].append({"pack": pack["id"], "id": entry["id"], "start": round(start, 3), "end": round(end, 3), "coverage": round(coverage, 3)})
        accepted.append(entry["id"])
    if len(accepted) == len(pack["entries"]):
        report["completed_packs"].append(pack["id"])


def render(job):
    target, audio, word_path, start, end, entry_id, lang, file = job
    def probe(path=target):
        return float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path)
        ]))
    fresh = target.exists() and target.stat().st_size > 1000 and target.stat().st_mtime > max(audio.stat().st_mtime, word_path.stat().st_mtime)
    if fresh:
        try:
            fresh = abs(probe() - (end - start)) < .15
        except subprocess.CalledProcessError:
            fresh = False
    if not fresh:
        temporary = WORK / "rendered" / lang / (entry_id + ".mp3")
        temporary.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-y", "-threads", "1", "-ss", str(start), "-i", str(audio),
            "-t", str(end - start), "-af", "loudnorm=I=-18:TP=-1.5:LRA=7",
            "-ar", "44100", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", str(temporary)
        ], check=True)
        if temporary.stat().st_size < 1000 or abs(probe(temporary) - (end - start)) > .15:
            raise ValueError("Incomplete rendered recording: " + file)
        temporary.replace(target)
    length = probe()
    if abs(length - (end - start)) > .15:
        raise ValueError("Rendered duration differs from aligned speech: " + file)
    return entry_id, lang, {"file": file, "duration": round(length, 3)}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for entry_id, lang, clip in pool.map(render, jobs):
        by_id[entry_id]["files"][lang] = clip

catalog["coverage"] = {lang: sum(lang in e["files"] for e in catalog["entries"]) for lang in script["languages"]}
catalog["total_per_language"] = len(script["entries"])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "index.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
referenced = {clip["file"] for entry in catalog["entries"] for clip in entry["files"].values()}
for path in OUT.rglob("*.mp3"):
    if path.relative_to(OUT).as_posix() not in referenced:
        path.unlink()
(ROOT / "voice-source/alignment.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"coverage": catalog["coverage"], "missing": report["missing_packs"], "rejected": report["rejected"]}, ensure_ascii=False))
