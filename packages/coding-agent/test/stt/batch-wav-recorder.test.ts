import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { BATCH_RECORDING, BatchWavRecorder } from "@oh-my-pi/pi-coding-agent/stt";
import { getSpeechToTextCacheDir } from "@oh-my-pi/pi-utils";

const createdPaths = new Set<string>();

afterEach(async () => {
	await Promise.all([...createdPaths].map(filePath => fs.promises.rm(filePath, { force: true })));
	createdPaths.clear();
});

describe("BatchWavRecorder", () => {
	it("writes PCM16 WAV data in the resolved OMP cache", async () => {
		const recorder = await BatchWavRecorder.create();
		createdPaths.add(recorder.filePath);
		expect(path.dirname(recorder.filePath)).toBe(getSpeechToTextCacheDir());
		expect(await recorder.append(new Float32Array([0, 0.5, -0.5]))).toBe(false);
		await recorder.finalize();
		expect((await fs.promises.stat(recorder.filePath)).size).toBe(50);
		await recorder.dispose();
		createdPaths.delete(recorder.filePath);
	});

	it("warns once at the configured threshold without truncating subsequent audio", async () => {
		const recorder = await BatchWavRecorder.create();
		createdPaths.add(recorder.filePath);
		expect(await recorder.append(new Float32Array(BATCH_RECORDING.warningSamples - 1))).toBe(false);
		expect(await recorder.append(new Float32Array([0.25, 0.5]))).toBe(true);
		expect(await recorder.append(new Float32Array([0.75]))).toBe(false);
		expect(recorder.sampleCount).toBe(BATCH_RECORDING.warningSamples + 2);
		await recorder.dispose();
		createdPaths.delete(recorder.filePath);
	});
});
