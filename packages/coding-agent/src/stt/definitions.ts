import type { SttTranscriber } from "./contracts";

export interface SttTranscriberDefinition<Id extends string = string> {
	readonly id: Id;
	readonly label: string;
	readonly description: string;
	create(): SttTranscriber;
}
