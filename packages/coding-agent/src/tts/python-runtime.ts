import * as fs from "node:fs/promises";
import * as path from "node:path";
import { $ } from "bun";
import type { RawAudio } from "@huggingface/transformers";
import { $which, isEnoent, type RuntimeInstallPhase, withFileLock } from "@oh-my-pi/pi-utils";
import { stageRunnerScript } from "../eval/runner-cache";
import { venvPython } from "../tiny/mlx-runtime";
import KOKORO_SERVER_SCRIPT from "./python-server.py" with { type: "text" };
import type { TtsLocalModelKey } from "./models";
import { getTtsRuntimeDir } from "./runtime";
import type { TtsTransport } from "./tts-protocol";

// Fork-local TTS engine (kml93): a pinned `kokoro-onnx` Python venv replaces
// the kokoro-js side runtime, whose bundled phonemizer is English-only — every
// non-English voice (ff_siwis) phonemized to gibberish. The venv carries the
// espeak-ng data for all languages via espeakng-loader, so French phonemizes
// natively with zero system dependency. Installed on first use the same way
// the MLX tiny-model backend installs mlx-lm: `uv` when available, system
// `python3` otherwise. The engine exposes the `kokoro-js` module surface
// (`KokoroTTS.from_pretrained`) so the existing worker pipeline — device
// fallback loop, synthesize queue, streaming sessions — runs unchanged.

/** Pinned `kokoro-onnx` release; the venv directory is keyed by it so bumps reinstall cleanly. */
export const KOKORO_ONNX_VERSION = "0.6.1";
/** Python range accepted for the venv; kokoro-onnx publishes wheels for these. */
const KOKORO_PYTHON_SPEC = ">=3.10,<3.14";
const READY_MARKER = ".omp-kokoro-onnx";

/** Release tag serving the int8 ONNX weights and the voice-style bank. */
const MODEL_FILES_TAG = "model-files-v1.0";
const MODEL_FILES_BASE = `https://github.com/thewh1teagle/kokoro-onnx/releases/download/${MODEL_FILES_TAG}`;
/** int8 weights (~110 MB) mirror the q8 dtype the kokoro-js runtime used. */
const MODEL_ONNX_FILE = "kokoro-v1.0.int8.onnx";
const VOICES_FILE = "voices-v1.0.bin";

/** A loaded Kokoro voice synthesizer backed by the Python server child. */
interface PythonKokoroInstance {
	generate(text: string, options: { voice: string }): Promise<RawAudio>;
}

/** Structural stand-in for the `kokoro-js` module the worker already drives. */
export interface PythonKokoroRuntime {
	KokoroTTS: {
		from_pretrained(
			_repo: string,
			_options: {
				dtype: unknown;
				device: "cpu" | "wasm" | "webgpu";
				progress_callback: (info: unknown) => void;
			},
		): Promise<PythonKokoroInstance>;
	};
}

/** JSON-lines requests sent to python-server.py (see that file). */
type KokoroServerRequest =
	| { type: "load"; id: string; model: string; voices: string }
	| { type: "synthesize"; id: string; text: string; voice: string; lang: string };

/** JSON-lines responses returned by python-server.py. */
type KokoroServerResponse =
	| { type: "ready"; id: string }
	| { type: "audio"; id: string; pcmB64: string; samples: number; sampleRate: number }
	| { type: "bye"; id: string }
	| { type: "error"; id: string; error: string };

function voiceToEspeakLang(voice: string): string {
	return ({ a: "en-us", b: "en-gb", f: "fr-fr" } as Record<string, string>)[voice.slice(0, 1)] ?? "en-us";
}

/** Python-engine runtime dir, a sibling under the shared `tts-runtime` cache folder. */
function pythonRuntimeDir(): string {
	return path.join(path.dirname(getTtsRuntimeDir()), `kokoro-onnx-${KOKORO_ONNX_VERSION}`);
}

function ttsModelFilesDir(): string {
	return path.join(pythonRuntimeDir(), "model");
}

async function readReadyMarker(runtimeDir: string): Promise<string | null> {
	try {
		return (await Bun.file(path.join(runtimeDir, READY_MARKER)).text()).trim();
	} catch (error) {
		if (isEnoent(error)) return null;
		throw error;
	}
}

async function installWithUv(uv: string, runtimeDir: string): Promise<void> {
	const venv = await $`${uv} venv --quiet --python ${KOKORO_PYTHON_SPEC} ${runtimeDir}`.quiet().nothrow();
	if (venv.exitCode !== 0) throw new Error(`uv venv failed (exit ${venv.exitCode}): ${venv.stderr.toString().trim()}`);
	const python = venvPython(runtimeDir);
	const pip = await $`${uv} pip install --quiet --python ${python} kokoro-onnx==${KOKORO_ONNX_VERSION}`
		.quiet()
		.nothrow();
	if (pip.exitCode !== 0)
		throw new Error(`uv pip install failed (exit ${pip.exitCode}): ${pip.stderr.toString().trim()}`);
}

async function installWithSystemPython(python3: string, runtimeDir: string): Promise<void> {
	const check = await $`${python3} -c ${"import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] < (3, 14) else 1)"}`
		.quiet()
		.nothrow();
	if (check.exitCode !== 0)
		throw new Error(
			`${python3} is outside Python 3.10–3.13; install uv (it fetches its own interpreter) or a compatible python3`,
		);
	const venv = await $`${python3} -m venv ${runtimeDir}`.quiet().nothrow();
	if (venv.exitCode !== 0)
		throw new Error(`python3 -m venv failed (exit ${venv.exitCode}): ${venv.stderr.toString().trim()}`);
	const python = venvPython(runtimeDir);
	const pip = await $`${python} -m pip install --quiet --disable-pip-version-check kokoro-onnx==${KOKORO_ONNX_VERSION}`
		.quiet()
		.nothrow();
	if (pip.exitCode !== 0)
		throw new Error(`pip install failed (exit ${pip.exitCode}): ${pip.stderr.toString().trim()}`);
}

/** Ensure the pinned `kokoro-onnx` venv exists and return its Python interpreter. */
async function ensureVenv(onPhase?: (phase: RuntimeInstallPhase) => void): Promise<string> {
	const runtimeDir = pythonRuntimeDir();
	if ((await readReadyMarker(runtimeDir)) === KOKORO_ONNX_VERSION) return venvPython(runtimeDir);
	onPhase?.("initiate");
	// withFileLock does not create parent directories; the runtime cache dir may
	// not exist yet on the very first install.
	await fs.mkdir(path.dirname(runtimeDir), { recursive: true });
	return withFileLock(`${runtimeDir}.install`, async () => {
		if ((await readReadyMarker(runtimeDir)) === KOKORO_ONNX_VERSION) return venvPython(runtimeDir);
		onPhase?.("download");
		const uv = $which("uv");
		if (uv) {
			await installWithUv(uv, runtimeDir);
		} else {
			const python3 = $which("python3") ?? $which("python");
			if (!python3) throw new Error("Local TTS needs `uv` or `python3` (3.10–3.13) on PATH to install kokoro-onnx");
			await installWithSystemPython(python3, runtimeDir);
		}
		await Bun.write(path.join(runtimeDir, READY_MARKER), `${KOKORO_ONNX_VERSION}\n`);
		onPhase?.("done");
		return venvPython(runtimeDir);
	});
}

async function fileComplete(filePath: string): Promise<boolean> {
	try {
		return (await fs.stat(filePath)).size > 0;
	} catch (error) {
		if (isEnoent(error)) return false;
		throw error;
	}
}

/** Byte-accurate progress tick for one model-file download. */
interface ModelFileProgress {
	file: string;
	loaded: number;
	total: number;
}

async function downloadModelFile(
	url: string,
	target: string,
	onProgress: (progress: ModelFileProgress) => void,
): Promise<void> {
	const response = await fetch(url);
	if (!response.ok || !response.body) throw new Error(`Model file download failed: ${url} (HTTP ${response.status})`);
	const total = Number(response.headers.get("content-length") ?? 0);
	const partPath = `${target}.part`;
	const writer = Bun.file(partPath).writer();
	const reader = response.body.getReader();
	const file = path.basename(target);
	let loaded = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			writer.write(value);
			loaded += value.byteLength;
			onProgress({ file, loaded, total });
		}
	} finally {
		await writer.end();
	}
	await fs.rename(partPath, target);
}

/** Ensure the int8 Kokoro weights and the voice bank are staged locally. */
async function ensureModelFiles(
	onProgress?: (progress: ModelFileProgress) => void,
): Promise<{ onnxPath: string; voicesPath: string }> {
	const dir = ttsModelFilesDir();
	const onnxPath = path.join(dir, MODEL_ONNX_FILE);
	const voicesPath = path.join(dir, VOICES_FILE);
	const complete = (await fileComplete(onnxPath)) && (await fileComplete(voicesPath));
	if (complete) return { onnxPath, voicesPath };
	await fs.mkdir(dir, { recursive: true });
	return withFileLock(`${dir}.download`, async () => {
		if (!(await fileComplete(onnxPath))) {
			await downloadModelFile(`${MODEL_FILES_BASE}/${MODEL_ONNX_FILE}`, onnxPath, onProgress ?? (() => {}));
		}
		if (!(await fileComplete(voicesPath))) {
			await downloadModelFile(`${MODEL_FILES_BASE}/${VOICES_FILE}`, voicesPath, onProgress ?? (() => {}));
		}
		return { onnxPath, voicesPath };
	});
}

/** Counter for python-server request correlation. */
let nextServerRequestId = 0;

/**
 * Start python-server.py and adapt it to the `kokoro-js` instance surface:
 * spawn the Python child, load the model, and answer `generate` calls with
 * mono f32 PCM. Memoized so the engine starts once per worker process.
 */
async function startEngine(
	transport: TtsTransport,
	requestId: string,
	modelKey: TtsLocalModelKey,
): Promise<PythonKokoroInstance> {
	const python = await ensureVenv(phase =>
		transport.send({
			type: "progress",
			id: requestId,
			event: { modelKey, status: phase, name: `kokoro-onnx@${KOKORO_ONNX_VERSION}` },
		}),
	);
	const files = await ensureModelFiles(progress =>
		transport.send({
			type: "progress",
			id: requestId,
			event: {
				modelKey,
				status: "progress",
				file: progress.file,
				loaded: progress.loaded,
				total: progress.total,
			},
		}),
	);
	const script = await stageRunnerScript("omp-tts-kokoro", "py", KOKORO_SERVER_SCRIPT);
	const proc = Bun.spawn({
		cmd: [python, "-u", script],
		stdin: "pipe",
		stdout: "pipe",
		stderr: "inherit",
		env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
	});
	const pending = new Map<
		string,
		{ resolve: (response: KokoroServerResponse) => void; reject: (error: Error) => void }
	>();
	let buffer = "";
	const request = async (message: KokoroServerRequest): Promise<KokoroServerResponse> => {
		if (!proc.stdin) throw new Error("kokoro server is not running");
		const { promise, resolve, reject } = Promise.withResolvers<KokoroServerResponse>();
		pending.set(message.id, { resolve, reject });
		// Fire-and-forget write: a dying child surfaces through the
		// stdout/exited watchers rejecting the pending request.
		proc.stdin.write(`${JSON.stringify(message)}\n`);
		return promise;
	};
	const rejectAll = (error: Error): void => {
		for (const entry of pending.values()) entry.reject(error);
		pending.clear();
	};
	const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
	const decoder = new TextDecoder();
	void (async () => {
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				for (;;) {
					const newline = buffer.indexOf("\n");
					if (newline === -1) break;
					const line = buffer.slice(0, newline).trim();
					buffer = buffer.slice(newline + 1);
					if (!line) continue;
					let response: KokoroServerResponse;
					try {
						response = JSON.parse(line) as KokoroServerResponse;
					} catch {
						transport.send({
							type: "log",
							level: "warn",
							msg: "tts: unparsable kokoro server line",
							meta: { line },
						});
						continue;
					}
					if (response.type === "bye") continue;
					const entry = pending.get(response.id);
					if (!entry) continue;
					pending.delete(response.id);
					if (response.type === "error") entry.reject(new Error(response.error));
					else entry.resolve(response);
				}
			}
		} catch {
			// Reader torn down with the process; pending requests rejected below.
		}
		rejectAll(new Error("kokoro server exited"));
	})();
	void proc.exited.then(() => rejectAll(new Error("kokoro server exited")));
	await request({ type: "load", id: `tts-${nextServerRequestId++}`, model: files.onnxPath, voices: files.voicesPath });
	return {
		generate: async (text, { voice }) => {
			const response = await request({
				type: "synthesize",
				id: `tts-${nextServerRequestId++}`,
				text,
				voice,
				lang: voiceToEspeakLang(voice),
			});
			if (response.type !== "audio") throw new Error(`kokoro server returned no audio: ${response.type}`);
			// Copy into a fresh aligned ArrayBuffer: base64-decoded bytes may
			// sit at a non-4-byte-aligned offset inside the decode pool.
			const bytes = Buffer.from(response.pcmB64, "base64");
			const audio = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
			if (audio.length !== response.samples) throw new Error("kokoro server audio length mismatch");
			return { audio, sampling_rate: response.sampleRate };
		},
	};
}

let startedEngine: Promise<PythonKokoroInstance> | null = null;

/**
 * Load the Python engine behind the `kokoro-js` module surface: the returned
 * runtime's `from_pretrained` resolves to the (already started) engine
 * instance, letting the worker's existing load path drive it unchanged.
 */
export async function loadPythonRuntime(
	transport: TtsTransport,
	requestId: string,
	modelKey: TtsLocalModelKey,
): Promise<PythonKokoroRuntime> {
	return {
		KokoroTTS: {
			from_pretrained: async () => {
				if (!startedEngine) {
					startedEngine = startEngine(transport, requestId, modelKey);
					startedEngine.catch(() => {
						startedEngine = null;
					});
				}
				return startedEngine;
			},
		},
	};
}
