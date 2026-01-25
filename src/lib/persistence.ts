import type {
	PersistedClient,
	Persister,
} from "@tanstack/solid-query-persist-client";
import { del, get, set } from "idb-keyval";

/**
 * Creates an IndexedDB persister using idb-keyval
 */
export function createIDBPersister(
	key: string = "solidsonic-cache",
): Persister {
	return {
		persistClient: async (client: PersistedClient) => {
			await set(key, client);
		},
		restoreClient: async () => {
			return await get<PersistedClient>(key);
		},
		removeClient: async () => {
			await del(key);
		},
	};
}
