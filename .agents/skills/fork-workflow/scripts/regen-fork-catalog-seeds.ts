#!/usr/bin/env bun
/**
 * Re-injects fork seed rows into packages/catalog/src/models.json after an
 * upstream merge took the generated file from `main`.
 *
 * Why this exists: `bun run gen:models` regenerates models.json from live
 * provider APIs, so it is offline-hostile and its output varies with the
 * network state of the day. During a fork sync the base must stay upstream's
 * generated snapshot. This tool adds back only the seed rows authored in
 * `rules/providers/*.kdl` (`bundle="always"`) whose ids are missing, built
 * through the official `buildModel()` compiler so KDL model rules (kind,
 * web-search, service-tier) apply. Deterministic and offline: every run also
 * rewrites the file in the canonical gen:models format (compact, sorted),
 * undoing accidental pretty-printing (e.g. a `jq` pass during a manual
 * conflict resolution).
 *
 * <repo-root> may be the primary checkout or any worktree. The catalog module
 * graph (and therefore the freshly regenerated rules.json) is imported from
 * the target tree — never from this script's own checkout — hence the dynamic
 * imports: the import target is a caller-supplied path, not a static one.
 */
import * as path from "node:path";
import { pathToFileURL } from "node:url";

/** A raw seed row from rules/providers/*.kdl, before policy resolution. */
interface SeedModelSpec {
	id: string;
}

/** A fully resolved models.json row as produced by the catalog compiler. */
type BundledModel = Record<string, unknown>;

/** `packages/catalog/src/build.ts`, imported from the target tree. */
interface BuildModule {
	buildModel(spec: SeedModelSpec): BundledModel;
}

/** `packages/catalog/src/compat/providers.ts`, imported from the target tree. */
interface ProvidersModule {
	providerEntries(): Record<string, CompiledProviderEntry>;
	seedModels(providerId: string): SeedModelSpec[];
}

interface CompiledProviderEntry {
	seed?: CompiledSeed;
}

interface CompiledSeed {
	bundle: string;
}

interface CatalogModules {
	build: BuildModule;
	providers: ProvidersModule;
}

type Catalog = Record<string, Record<string, BundledModel>>;

/** Deterministic, offline models.json seed injector for fork syncs. */
class ForkCatalogSeedRegenerator {
	readonly #modelsPath: string;
	readonly #root: string;
	#modules: CatalogModules | null = null;

	constructor(root: string) {
		this.#root = path.resolve(root);
		this.#modelsPath = path.join(this.#root, "packages/catalog/src/models.json");
	}

	/** Always leaves models.json in the canonical gen:models format, with every
	 *  missing `bundle="always"` seed row re-injected. */
	async run(): Promise<void> {
		const models = JSON.parse(await Bun.file(this.#modelsPath).text()) as Catalog;
		const injected = await this.#injectMissingSeeds(models);
		await Bun.write(this.#modelsPath, JSON.stringify(this.#sorted(models)));
		console.log(`regen-fork-catalog-seeds: ${injected} seed row(s) injected; models.json canonical`);
	}

	/** Adds every missing `bundle="always"` seed row, built by the official compiler. */
	async #injectMissingSeeds(models: Catalog): Promise<number> {
		const modules = await this.#loadModules();
		let injected = 0;
		for (const [providerId, entry] of Object.entries(modules.providers.providerEntries())) {
			if (entry.seed?.bundle !== "always") continue;
			let bucket = models[providerId];
			if (bucket === undefined) {
				bucket = {};
				models[providerId] = bucket;
			}
			for (const row of modules.providers.seedModels(providerId)) {
				if (bucket[row.id] !== undefined) continue;
				bucket[row.id] = modules.build.buildModel(row);
				injected++;
			}
		}
		return injected;
	}

	/** Loads the target tree's catalog graph once; the merged KDL rules ride along. */
	async #loadModules(): Promise<CatalogModules> {
		if (this.#modules === null) {
			this.#modules = {
				build: await this.#importModule<BuildModule>("build.ts"),
				providers: await this.#importModule<ProvidersModule>("compat/providers.ts"),
			};
		}
		return this.#modules;
	}

	async #importModule<T>(module: string): Promise<T> {
		return import(pathToFileURL(path.join(this.#root, "packages/catalog/src", module)).href) as Promise<T>;
	}

	/** Mirrors gen:models output shape: providers and ids in localeCompare order. */
	#sorted(models: Catalog): Catalog {
		const sorted: Catalog = {};
		for (const providerId of Object.keys(models).sort((a, b) => a.localeCompare(b))) {
			sorted[providerId] = Object.fromEntries(
				Object.entries(models[providerId]!).sort(([a], [b]) => a.localeCompare(b)),
			);
		}
		return sorted;
	}
}

function resolveRoot(argv: readonly string[]): string {
	const passed = argv.at(2);
	if (passed === undefined) return process.cwd();
	return path.resolve(passed);
}

if (import.meta.main) {
	await new ForkCatalogSeedRegenerator(resolveRoot(process.argv)).run();
}
