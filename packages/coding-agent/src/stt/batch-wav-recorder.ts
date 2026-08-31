import * as fs from "node:fs";
import * as path from "node:path";
import { getSpeechToTextCacheDir } from "@oh-my-pi/pi-utils";

const WAV_HEADER_BYTES = 44;
const PCM16_BYTES_PER_SAMPLE = 2;
const PCM16_FORMAT = 1;
const PCM16_BITS_PER_SAMPLE = 16;
const PCM16_MAX = 32_767;
const PCM16_MIN = -32_768;

export const STT_SAMPLE_RATE = 16_000;
export const BATCH_RECORDING = {
	warningMinutes: 10,
	get warningSamples(): number {
		return STT_SAMPLE_RATE * this.warningMinutes * 60;
	},
} as const;

/** Writes mono PCM16 capture directly to a private temporary WAV file. */
export class BatchWavRecorder {
	readonly #filePath: string;
	readonly #handle: fs.promises.FileHandle;
	#sampleCount = 0;
	#closed = false;

	private constructor(filePath: string, handle: fs.promises.FileHandle) {
		this.#filePath = filePath;
		this.#handle = handle;
	}

	static async create(): Promise<BatchWavRecorder> {
		const cacheDir = getSpeechToTextCacheDir();
		await fs.promises.mkdir(cacheDir, { recursive: true });
		const filePath = path.join(cacheDir, `record-${crypto.randomUUID()}.wav`);
		const handle = await fs.promises.open(filePath, "wx", 0o600);
		try {
			await handle.write(new Uint8Array(WAV_HEADER_BYTES), 0, WAV_HEADER_BYTES, 0);
			return new BatchWavRecorder(filePath, handle);
		} catch (error) {
			await handle.close().catch(() => {});
			await fs.promises.rm(filePath, { force: true }).catch(() => {});
			throw error;
		}
	}

	get filePath(): string {
		return this.#filePath;
	}

	get sampleCount(): number {
		return this.#sampleCount;
	}

	/** Appends samples and returns true once when the recording reaches the warning threshold. */
	async append(samples: Float32Array): Promise<boolean> {
		if (this.#closed) throw new Error("Speech recording is already closed.");
		const previousSampleCount = this.#sampleCount;
		const pcm = encodePcm16(samples);
		await this.#handle.write(pcm, 0, pcm.byteLength, WAV_HEADER_BYTES + this.#sampleCount * PCM16_BYTES_PER_SAMPLE);
		this.#sampleCount += samples.length;
		return (
			previousSampleCount < BATCH_RECORDING.warningSamples && this.#sampleCount >= BATCH_RECORDING.warningSamples
		);
	}

	async finalize(): Promise<string> {
		if (this.#closed) return this.#filePath;
		const header = createWavHeader(this.#sampleCount);
		await this.#handle.write(header, 0, header.byteLength, 0);
		await this.#handle.close();
		this.#closed = true;
		return this.#filePath;
	}

	async dispose(): Promise<void> {
		if (!this.#closed) {
			await this.#handle.close().catch(() => {});
			this.#closed = true;
		}
		await fs.promises.rm(this.#filePath, { force: true });
	}
}

function encodePcm16(samples: Float32Array): Uint8Array {
	const buffer = new ArrayBuffer(samples.length * PCM16_BYTES_PER_SAMPLE);
	const view = new DataView(buffer);
	samples.forEach((sample, index) => {
		const clamped = Math.max(-1, Math.min(1, sample));
		const quantized = clamped < 0 ? Math.round(clamped * -PCM16_MIN) : Math.round(clamped * PCM16_MAX);
		view.setInt16(index * PCM16_BYTES_PER_SAMPLE, quantized, true);
	});
	return new Uint8Array(buffer);
}

function createWavHeader(sampleCount: number): Uint8Array {
	const dataBytes = sampleCount * PCM16_BYTES_PER_SAMPLE;
	const buffer = new ArrayBuffer(WAV_HEADER_BYTES);
	const view = new DataView(buffer);
	writeAscii(view, 0, "RIFF");
	view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
	writeAscii(view, 8, "WAVE");
	writeAscii(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, PCM16_FORMAT, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, STT_SAMPLE_RATE, true);
	view.setUint32(28, STT_SAMPLE_RATE * PCM16_BYTES_PER_SAMPLE, true);
	view.setUint16(32, PCM16_BYTES_PER_SAMPLE, true);
	view.setUint16(34, PCM16_BITS_PER_SAMPLE, true);
	writeAscii(view, 36, "data");
	view.setUint32(40, dataBytes, true);
	return new Uint8Array(buffer);
}

function writeAscii(view: DataView, offset: number, text: string): void {
	Array.from(text).forEach((character, index) => {
		view.setUint8(offset + index, character.charCodeAt(0));
	});
}
