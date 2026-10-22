"""Decode packaged MP3s and check for silence or clipping with FFmpeg."""
import concurrent.futures
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
catalog = json.loads((ROOT / "public/voice/index.json").read_text())
clips = [clip for entry in catalog["entries"] for clip in entry["files"].values()]
cache_file = ROOT / "tmp/voice/audit-cache.json"
cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}


def measure(clip):
    path = ROOT / "public/voice" / clip["file"]
    stamp = [path.stat().st_mtime_ns, path.stat().st_size]
    if cache.get(clip["file"], {}).get("stamp") == stamp:
        return cache[clip["file"]]["result"]
    decoded = subprocess.run([
        "ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-threads", "1", "-i", str(path),
        "-af", "volumedetect", "-f", "null", "-"
    ], capture_output=True, text=True, check=True)
    mean = re.search(r"mean_volume: ([-\d.]+) dB", decoded.stderr)
    peak = re.search(r"max_volume: ([-\d.]+) dB", decoded.stderr)
    if not mean or not peak:
        raise ValueError("No audio level: " + clip["file"])
    result = {"file": clip["file"], "mean_dbfs": float(mean[1]), "peak_dbfs": float(peak[1])}
    if result["mean_dbfs"] < -55 or result["peak_dbfs"] > -.1:
        raise ValueError("Unexpected audio level: " + str(result))
    cache[clip["file"]] = {"stamp": stamp, "result": result}
    return result


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(measure, clips))
report = {
    "decoded_files": len(results),
    "speech_minutes": round(sum(c["duration"] for c in clips) / 60, 2),
    "silent_files": 0, "clipped_files": 0, "levels": results
}
(ROOT / "voice-source/quality.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
cache_file.parent.mkdir(parents=True, exist_ok=True)
cache_file.write_text(json.dumps(cache))
print(json.dumps({k: v for k, v in report.items() if k != "levels"}))
