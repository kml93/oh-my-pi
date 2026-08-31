import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import type { AuthStorage, OAuthAccess } from "@oh-my-pi/pi-ai";
import type { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings, settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { CodexSttTranscriber, type SttTranscriberContext } from "@oh-my-pi/pi-coding-agent/stt";
import { STTController } from "@oh-my-pi/pi-coding-agent/stt/stt-controller";
import { beginSettingsTest, restoreSettingsTestState, type SettingsTestState } from "../helpers/settings-test-state";

const ACCESS: OAuthAccess = {
	accessToken: "header.payload.signature",
	accountId: "account-id",
};

function makeContext(getOAuthAccess: SttTranscriberContext["authStorage"]["getOAuthAccess"]): SttTranscriberContext {
	const authStorage = {
		hasAuth: vi.fn().mockReturnValue(true),
		getOAuthAccess,
	} as unknown as AuthStorage;
	return {
		authStorage,
		sessionId: "speech-session",
		signal: new AbortController().signal,
	};
}

const callbacks = {
	onPartial: vi.fn(),
	onSegment: vi.fn(),
	onDurationWarning: vi.fn(),
	onStatus: vi.fn(),
	onError: vi.fn(),
};

describe("CodexSttTranscriber", () => {
	it("uses the Codex OAuth account selected for the agent session", async () => {
		const getOAuthAccess = vi.fn().mockResolvedValue(ACCESS);
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ text: "transcribed" }), { status: 200 }));
		const transcriber = new CodexSttTranscriber({ fetch: fetchMock });
		const session = await transcriber.createSession(makeContext(getOAuthAccess), callbacks);
		session.pushAudio(new Float32Array([0.25, -0.25]));
		await expect(session.stop()).resolves.toBe("transcribed");
		expect(getOAuthAccess).toHaveBeenCalledTimes(1);
		expect(getOAuthAccess).toHaveBeenCalledWith("openai-codex", "speech-session", {
			signal: expect.any(AbortSignal),
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await session.dispose();
	});

	it("sends the workspace residency header for region-pinned enterprise tokens", async () => {
		const payload = { "https://api.openai.com/auth": { chatgpt_data_residency: "eu" } };
		const access: OAuthAccess = {
			accessToken: `h.${Buffer.from(JSON.stringify(payload)).toString("base64")}.s`,
			accountId: "account-id",
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ text: "transcribed" }), { status: 200 }));
		const transcriber = new CodexSttTranscriber({ fetch: fetchMock });
		const session = await transcriber.createSession(makeContext(vi.fn().mockResolvedValue(access)), callbacks);
		session.pushAudio(new Float32Array([0.25, -0.25]));
		await expect(session.stop()).resolves.toBe("transcribed");
		const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
		expect(init.headers["x-openai-internal-codex-residency"]).toBe("eu");
		await session.dispose();
	});

	it("rejects before recording when no Codex account is configured", async () => {
		const transcriber = new CodexSttTranscriber();
		await expect(transcriber.createSession(makeContext(vi.fn().mockResolvedValue(null)), callbacks)).rejects.toThrow(
			"OpenAI Codex authentication required. Run /login.",
		);
	});
});

describe("STTController Codex selection", () => {
	let state: SettingsTestState | undefined;

	beforeEach(async () => {
		state = await beginSettingsTest();
		await Settings.init({ inMemory: true });
		settings.set("stt.transcriber", "codex");
	});

	afterEach(() => {
		restoreSettingsTestState(state);
		vi.restoreAllMocks();
	});

	it("does not start microphone capture when Codex session creation fails", async () => {
		const createCapture = vi.fn();
		const controller = new STTController({
			createCapture,
			modelRegistry: { authStorage: {} } as unknown as ModelRegistry,
			createTranscriber: () => ({
				id: "codex",
				label: "OpenAI Codex",
				description: "",
				createSession: async () => {
					throw new Error("OpenAI Codex authentication required. Run /login.");
				},
			}),
		});
		const showWarning = vi.fn();
		await controller.toggle(
			{
				insertText: vi.fn(),
				setVolatileText: vi.fn(),
				clearVolatileText: vi.fn(),
				commitVolatileText: vi.fn(),
				submit: vi.fn(),
				deleteBeforeCursor: vi.fn(),
			},
			{ showWarning, showStatus: vi.fn(), onStateChange: vi.fn() },
		);
		expect(showWarning).toHaveBeenCalledWith("OpenAI Codex authentication required. Run /login.");
		expect(createCapture).not.toHaveBeenCalled();
		controller.dispose();
	});
});
