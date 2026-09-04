# Kokoro TTS synthesis server: child of the omp TTS worker subprocess,
# speaking a JSON-lines protocol over stdin/stdout. Started by tts-worker.ts
# from the kokoro-onnx venv once the model files are staged; exits on EOF or
# "shutdown".
#
# Requests (one object per line):
#   {"type": "load", "id", "model", "voices"}              -> ready | error
#   {"type": "synthesize", "id", "text", "voice", "lang"}  -> audio | error
#   {"type": "shutdown", "id"}                             -> bye (process exits)
# Responses:
#   {"type": "ready", "id"}
#   {"type": "audio", "id", "pcmB64", "samples", "sampleRate"}
#   {"type": "error", "id", "error"}
#
# PCM travels base64-encoded little-endian float32 — a few hundred KB per
# spoken segment, negligible next to the inference that produces it. The
# espeak-ng phonemizer data for every language (French included) ships inside
# the venv through kokoro-onnx's espeakng-loader dependency; no system
# espeak-ng is required.

import base64
import json
import sys
import traceback

kokoro = None


def respond(message):
  sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
  sys.stdout.flush()


def fail(request_id, error):
  respond({"type": "error", "id": request_id, "error": error})


def handle_load(request):
  global kokoro
  from kokoro_onnx import Kokoro

  kokoro = Kokoro(request["model"], request["voices"])
  respond({"type": "ready", "id": request["id"]})


def handle_synthesize(request):
  audio, sample_rate = kokoro.create(
    request["text"], voice=request["voice"], speed=1.0, lang=request["lang"]
  )
  pcm = audio.astype("<f4").tobytes()
  respond(
    {
      "type": "audio",
      "id": request["id"],
      "pcmB64": base64.b64encode(pcm).decode("ascii"),
      "samples": len(audio),
      "sampleRate": sample_rate,
    }
  )


HANDLERS = {"load": handle_load, "synthesize": handle_synthesize}


def main():
  request = None
  for line in sys.stdin:
    line = line.strip()
    if not line:
      continue
    try:
      request = json.loads(line)
      if request["type"] == "shutdown":
        respond({"type": "bye", "id": request["id"]})
        return
      HANDLERS[request["type"]](request)
    except Exception:
      traceback.print_exc()
      fail(
        request.get("id", "") if isinstance(request, dict) else "",
        traceback.format_exc(limit=1).strip(),
      )


if __name__ == "__main__":
  main()
