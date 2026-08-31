import { type OAuthAccess, withOAuthAccess } from "@oh-my-pi/pi-ai";
import { ProviderHttpError } from "@oh-my-pi/pi-ai/error";
import { wrapFetchForProxy } from "@oh-my-pi/pi-ai/utils/proxy";
import {
	CODEX_BASE_URL,
	getCodexAccountId,
	OPENAI_HEADER_VALUES,
	OPENAI_HEADERS,
	URL_PATHS,
} from "@oh-my-pi/pi-catalog/wire/codex";
import { BATCH_RECORDING, BatchWavRecorder } from "../batch-wav-recorder";
import type {
	SttTranscriber,
	SttTranscriberContext,
	SttTranscriptionCallbacks,
	SttTranscriptionSession,
} from "../contracts";

const CODEX_STT = {
	authProvider: "openai-codex",
	id: "codex",
	label: "OpenAI Codex",
	description: "Cloud transcription using the configured OpenAI Codex account.",
	transcribeUrl: `${CODEX_BASE_URL}${URL_PATHS.TRANSCRIBE}`,
	requestTimeoutMs: 90_000,
	longRecordingWarning: `Speech recording has reached ${BATCH_RECORDING.warningMinutes} minutes and will continue until stopped.`,
} as const;

interface TranscriptionPayload {
	text?: unknown;
}

export type SttFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface CodexSttTranscriberOptions {
	fetch?: SttFetch;
}

class CodexTranscriptionSession implements SttTranscriptionSession {
	readonly #access: OAuthAccess;
	readonly #context: SttTranscriberContext;
	readonly #callbacks: SttTranscriptionCallbacks;
	readonly #fetch: SttFetch;
	readonly #wav: BatchWavRecorder;
	#writes: Promise<void> = Promise.resolve();
	#writeFailed = false;
	#disposed = false;

	constructor(
		access: OAuthAccess,
		context: SttTranscriberContext,
		callbacks: SttTranscriptionCallbacks,
		fetchImpl: SttFetch,
		wav: BatchWavRecorder,
	) {
		this.#access = access;
		this.#context = context;
		this.#callbacks = callbacks;
		this.#fetch = fetchImpl;
		this.#wav = wav;
	}

	pushAudio(samples: Float32Array): void {
		if (this.#disposed || this.#writeFailed || samples.length === 0) return;
		this.#writes = this.#writes
			.then(async () => {
				if (await this.#wav.append(samples)) this.#callbacks.onDurationWarning(CODEX_STT.longRecordingWarning);
			})
			.catch(error => {
				this.#writeFailed = true;
				this.#callbacks.onError(error instanceof Error ? error : new Error("Failed to write speech recording."));
			});
	}

	async stop(): Promise<string> {
		await this.#writes;
		const wavPath = await this.#wav.finalize();
		const file = Bun.file(wavPath);
		if (file.size <= 44) return "";
		return this.#transcribe(wavPath);
	}

	async dispose(): Promise<void> {
		if (this.#disposed) return;
		this.#disposed = true;
		await this.#writes.catch(() => {});
		await this.#wav.dispose();
	}

	async #transcribe(wavPath: string): Promise<string> {
		return withOAuthAccess(
			this.#context.authStorage,
			CODEX_STT.authProvider,
			access => this.#transcribeWithAccess(wavPath, access),
			{
				sessionId: this.#context.sessionId,
				signal: this.#context.signal,
				seed: this.#access,
				missingAccessMessage: "OpenAI Codex authentication required. Run /login.",
			},
		);
	}

	async #transcribeWithAccess(wavPath: string, access: OAuthAccess): Promise<string> {
		const audio = new Uint8Array(await Bun.file(wavPath).arrayBuffer());
		const boundary = `----codex-transcribe-${crypto.randomUUID()}`;
		const encoder = new TextEncoder();
		const header = encoder.encode(
			[
				`--${boundary}`,
				`Content-Disposition: form-data; name="file"; filename="codex.wav"`,
				"Content-Type: audio/wav",
				"",
				"",
			].join("\r\n"),
		);
		const trailer = encoder.encode(`\r\n--${boundary}--\r\n`);
		const body = new Uint8Array(header.byteLength + audio.byteLength + trailer.byteLength);
		body.set(header);
		body.set(audio, header.byteLength);
		body.set(trailer, header.byteLength + audio.byteLength);
		const signal = this.#context.signal
			? AbortSignal.any([this.#context.signal, AbortSignal.timeout(CODEX_STT.requestTimeoutMs)])
			: AbortSignal.timeout(CODEX_STT.requestTimeoutMs);
		const response = await this.#fetch(CODEX_STT.transcribeUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${access.accessToken}`,
				[OPENAI_HEADERS.ACCOUNT_ID]: access.accountId ?? getCodexAccountId(access.accessToken) ?? "",
				[OPENAI_HEADERS.ORIGINATOR]: OPENAI_HEADER_VALUES.CODEX_DESKTOP.NAME,
				"User-Agent": OPENAI_HEADER_VALUES.CODEX_DESKTOP.USER_AGENT,
				Accept: "application/json",
				"OpenAI-Beta": "responses=experimental",
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				"Content-Length": String(body.byteLength),
			},
			body,
			signal,
		});
		const responseBody = await response.text();
		if (!response.ok) {
			throw new ProviderHttpError(
				`OpenAI Codex transcription failed with status ${response.status}: ${responseBody.slice(0, 500)}`,
				response.status,
				{ headers: response.headers },
			);
		}
		let payload: unknown;
		try {
			payload = JSON.parse(responseBody);
		} catch {
			throw new Error(`OpenAI Codex transcription response was not JSON: ${responseBody.slice(0, 500)}`);
		}
		const transcription = payload as TranscriptionPayload;
		if (typeof transcription.text === "string") return transcription.text;
		throw new Error("OpenAI Codex transcription response does not contain text.");
	}
}

/** Batch transcription using the configured Codex subscription account. */
export class CodexSttTranscriber implements SttTranscriber {
	readonly id = CODEX_STT.id;
	readonly label = CODEX_STT.label;
	readonly description = CODEX_STT.description;
	readonly #fetch: SttFetch;

	constructor(options: CodexSttTranscriberOptions = {}) {
		this.#fetch = options.fetch ?? wrapFetchForProxy(fetch, CODEX_STT.authProvider);
	}

	async createSession(
		context: SttTranscriberContext,
		callbacks: SttTranscriptionCallbacks,
	): Promise<SttTranscriptionSession> {
		const access = await context.authStorage.getOAuthAccess(CODEX_STT.authProvider, context.sessionId, {
			signal: context.signal,
		});
		const accountId = access?.accountId ?? (access?.accessToken ? getCodexAccountId(access.accessToken) : undefined);
		if (!access?.accessToken || !accountId) throw new Error("OpenAI Codex authentication required. Run /login.");
		return new CodexTranscriptionSession(
			{ ...access, accountId },
			context,
			callbacks,
			this.#fetch,
			await BatchWavRecorder.create(),
		);
	}
}
