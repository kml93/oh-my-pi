import type { SttTranscriber } from "./contracts";
import type { SttTranscriberDefinition } from "./definitions";
import { DEFAULT_STT_MODEL_KEY, isSttModelKey, STT_MODELS, type SttModelKey } from "./local/models";
import { LocalSttTranscriber } from "./local/transcriber";
import { CodexSttTranscriber } from "./providers/codex";

export const DEFAULT_STT_TRANSCRIBER_ID = DEFAULT_STT_MODEL_KEY;

const LOCAL_TRANSCRIBERS = STT_MODELS.map(
	model =>
		({
			id: model.key,
			label: model.label,
			description: model.description,
			create: () => new LocalSttTranscriber({ modelKey: model.key }),
		}) satisfies SttTranscriberDefinition<SttModelKey>,
);

const CODEX_TRANSCRIBER = {
	id: "codex",
	label: "OpenAI Codex",
	description: "Cloud transcription using the configured OpenAI Codex account.",
	create: () => new CodexSttTranscriber(),
} as const satisfies SttTranscriberDefinition<"codex">;

const STT_TRANSCRIBERS = [...LOCAL_TRANSCRIBERS, CODEX_TRANSCRIBER] as const;

export type SttTranscriberId = SttModelKey | typeof CODEX_TRANSCRIBER.id;
export const STT_TRANSCRIBER_VALUES = STT_TRANSCRIBERS.map(definition => definition.id);
export const STT_TRANSCRIBER_OPTIONS = STT_TRANSCRIBERS.map(({ id, label, description }) => ({
	value: id,
	label,
	description,
}));

export function isSttTranscriberId(value: string): value is SttTranscriberId {
	return value === CODEX_TRANSCRIBER.id || isSttModelKey(value);
}

export function createSttTranscriber(id: string): SttTranscriber {
	const definition = STT_TRANSCRIBERS.find(candidate => candidate.id === id);
	return (
		definition?.create() ?? LOCAL_TRANSCRIBERS.find(candidate => candidate.id === DEFAULT_STT_MODEL_KEY)!.create()
	);
}
