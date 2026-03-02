import { getCredentials, type SubsonicCredentials } from "./auth";

const SUBSONIC_API_VERSION = "1.16.1";
const SUBSONIC_CLIENT_ID = "solidsonic";

export interface OpenSubsonicExtension {
	name: string;
	versions: number[];
}

export interface TokenInfoResult {
	username?: string;
}

interface ParsedSubsonicError {
	code?: number;
	message: string;
	helpUrl?: string;
}

// Generate a random salt for authentication
function generateSalt(length = 16): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let salt = "";
	for (let i = 0; i < length; i++) {
		salt += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return salt;
}

// Create MD5 hash using Web Crypto API
async function md5(message: string): Promise<string> {
	// For MD5, we need to use a pure JS implementation since Web Crypto doesn't support MD5
	// Using a simple implementation for the token generation
	const encoder = new TextEncoder();
	const data = encoder.encode(message);

	// MD5 implementation
	function md5cycle(x: number[], k: number[]) {
		let a = x[0],
			b = x[1],
			c = x[2],
			d = x[3];

		a = ff(a, b, c, d, k[0], 7, -680876936);
		d = ff(d, a, b, c, k[1], 12, -389564586);
		c = ff(c, d, a, b, k[2], 17, 606105819);
		b = ff(b, c, d, a, k[3], 22, -1044525330);
		a = ff(a, b, c, d, k[4], 7, -176418897);
		d = ff(d, a, b, c, k[5], 12, 1200080426);
		c = ff(c, d, a, b, k[6], 17, -1473231341);
		b = ff(b, c, d, a, k[7], 22, -45705983);
		a = ff(a, b, c, d, k[8], 7, 1770035416);
		d = ff(d, a, b, c, k[9], 12, -1958414417);
		c = ff(c, d, a, b, k[10], 17, -42063);
		b = ff(b, c, d, a, k[11], 22, -1990404162);
		a = ff(a, b, c, d, k[12], 7, 1804603682);
		d = ff(d, a, b, c, k[13], 12, -40341101);
		c = ff(c, d, a, b, k[14], 17, -1502002290);
		b = ff(b, c, d, a, k[15], 22, 1236535329);

		a = gg(a, b, c, d, k[1], 5, -165796510);
		d = gg(d, a, b, c, k[6], 9, -1069501632);
		c = gg(c, d, a, b, k[11], 14, 643717713);
		b = gg(b, c, d, a, k[0], 20, -373897302);
		a = gg(a, b, c, d, k[5], 5, -701558691);
		d = gg(d, a, b, c, k[10], 9, 38016083);
		c = gg(c, d, a, b, k[15], 14, -660478335);
		b = gg(b, c, d, a, k[4], 20, -405537848);
		a = gg(a, b, c, d, k[9], 5, 568446438);
		d = gg(d, a, b, c, k[14], 9, -1019803690);
		c = gg(c, d, a, b, k[3], 14, -187363961);
		b = gg(b, c, d, a, k[8], 20, 1163531501);
		a = gg(a, b, c, d, k[13], 5, -1444681467);
		d = gg(d, a, b, c, k[2], 9, -51403784);
		c = gg(c, d, a, b, k[7], 14, 1735328473);
		b = gg(b, c, d, a, k[12], 20, -1926607734);

		a = hh(a, b, c, d, k[5], 4, -378558);
		d = hh(d, a, b, c, k[8], 11, -2022574463);
		c = hh(c, d, a, b, k[11], 16, 1839030562);
		b = hh(b, c, d, a, k[14], 23, -35309556);
		a = hh(a, b, c, d, k[1], 4, -1530992060);
		d = hh(d, a, b, c, k[4], 11, 1272893353);
		c = hh(c, d, a, b, k[7], 16, -155497632);
		b = hh(b, c, d, a, k[10], 23, -1094730640);
		a = hh(a, b, c, d, k[13], 4, 681279174);
		d = hh(d, a, b, c, k[0], 11, -358537222);
		c = hh(c, d, a, b, k[3], 16, -722521979);
		b = hh(b, c, d, a, k[6], 23, 76029189);
		a = hh(a, b, c, d, k[9], 4, -640364487);
		d = hh(d, a, b, c, k[12], 11, -421815835);
		c = hh(c, d, a, b, k[15], 16, 530742520);
		b = hh(b, c, d, a, k[2], 23, -995338651);

		a = ii(a, b, c, d, k[0], 6, -198630844);
		d = ii(d, a, b, c, k[7], 10, 1126891415);
		c = ii(c, d, a, b, k[14], 15, -1416354905);
		b = ii(b, c, d, a, k[5], 21, -57434055);
		a = ii(a, b, c, d, k[12], 6, 1700485571);
		d = ii(d, a, b, c, k[3], 10, -1894986606);
		c = ii(c, d, a, b, k[10], 15, -1051523);
		b = ii(b, c, d, a, k[1], 21, -2054922799);
		a = ii(a, b, c, d, k[8], 6, 1873313359);
		d = ii(d, a, b, c, k[15], 10, -30611744);
		c = ii(c, d, a, b, k[6], 15, -1560198380);
		b = ii(b, c, d, a, k[13], 21, 1309151649);
		a = ii(a, b, c, d, k[4], 6, -145523070);
		d = ii(d, a, b, c, k[11], 10, -1120210379);
		c = ii(c, d, a, b, k[2], 15, 718787259);
		b = ii(b, c, d, a, k[9], 21, -343485551);

		x[0] = add32(a, x[0]);
		x[1] = add32(b, x[1]);
		x[2] = add32(c, x[2]);
		x[3] = add32(d, x[3]);
	}

	function cmn(
		q: number,
		a: number,
		b: number,
		x: number,
		s: number,
		t: number,
	) {
		a = add32(add32(a, q), add32(x, t));
		return add32((a << s) | (a >>> (32 - s)), b);
	}

	function ff(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return cmn((b & c) | (~b & d), a, b, x, s, t);
	}

	function gg(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return cmn((b & d) | (c & ~d), a, b, x, s, t);
	}

	function hh(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return cmn(b ^ c ^ d, a, b, x, s, t);
	}

	function ii(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return cmn(c ^ (b | ~d), a, b, x, s, t);
	}

	function add32(a: number, b: number) {
		return (a + b) & 0xffffffff;
	}

	function md5blk(s: Uint8Array) {
		const md5blks: number[] = [];
		for (let i = 0; i < 64; i += 4) {
			md5blks[i >> 2] =
				s[i] + (s[i + 1] << 8) + (s[i + 2] << 16) + (s[i + 3] << 24);
		}
		return md5blks;
	}

	function rhex(n: number) {
		const hexChr = "0123456789abcdef";
		let s = "";
		for (let j = 0; j < 4; j++) {
			s +=
				hexChr.charAt((n >> (j * 8 + 4)) & 0x0f) +
				hexChr.charAt((n >> (j * 8)) & 0x0f);
		}
		return s;
	}

	function hex(x: number[]) {
		return x.map(rhex).join("");
	}

	// Pad the message
	const n = data.length;
	const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	let i = 0;
	const state = [1732584193, -271733879, -1732584194, 271733878];

	for (i = 64; i <= n; i += 64) {
		md5cycle(state, md5blk(data.slice(i - 64, i)));
	}

	const remaining = data.slice(i - 64);
	for (let j = 0; j < remaining.length; j++) {
		tail[j >> 2] |= remaining[j] << ((j % 4) << 3);
	}
	tail[remaining.length >> 2] |= 0x80 << ((remaining.length % 4) << 3);

	if (remaining.length > 55) {
		md5cycle(state, tail);
		for (let j = 0; j < 16; j++) tail[j] = 0;
	}

	tail[14] = n * 8;
	md5cycle(state, tail);

	return hex(state);
}

function addParams(
	params: URLSearchParams,
	additionalParams?: Record<string, string | string[]>,
) {
	if (!additionalParams) return;

	for (const [key, value] of Object.entries(additionalParams)) {
		if (Array.isArray(value)) {
			for (const v of value) {
				params.append(key, v);
			}
		} else {
			params.set(key, value);
		}
	}
}

function createBaseParams() {
	return new URLSearchParams({
		v: SUBSONIC_API_VERSION,
		c: SUBSONIC_CLIENT_ID,
		f: "json",
	});
}

async function getLegacyAuthTokens(
	credentials: SubsonicCredentials,
): Promise<{ token: string; salt: string }> {
	if (credentials.authType !== "legacy") {
		throw new Error("Legacy auth tokens requested for non-legacy credentials");
	}

	const salt = generateSalt();
	const token = await md5(credentials.password + salt);
	return { token, salt };
}

function parseSubsonicError(data: unknown): ParsedSubsonicError {
	const fallback = "Unknown error";
	if (typeof data !== "object" || data === null) {
		return { message: fallback };
	}

	const response = (data as Record<string, unknown>)["subsonic-response"];
	if (typeof response !== "object" || response === null) {
		return { message: fallback };
	}

	const error = (response as Record<string, unknown>).error;
	if (typeof error !== "object" || error === null) {
		return { message: fallback };
	}

	const parsedError = error as Record<string, unknown>;
	const code =
		typeof parsedError.code === "number" ? parsedError.code : undefined;
	const message =
		typeof parsedError.message === "string" ? parsedError.message : fallback;
	const helpUrl =
		typeof parsedError.helpUrl === "string" ? parsedError.helpUrl : undefined;

	return { code, message, helpUrl };
}

function formatSubsonicError(error: ParsedSubsonicError): string {
	const codePrefix = error.code ? `[${error.code}] ` : "";
	const helpSuffix = error.helpUrl ? ` (${error.helpUrl})` : "";
	return `${codePrefix}${error.message}${helpSuffix}`;
}

async function fetchPublicEndpoint(
	serverUrl: string,
	endpoint: string,
	additionalParams?: Record<string, string | string[]>,
): Promise<unknown> {
	const params = createBaseParams();
	addParams(params, additionalParams);

	const baseUrl = getBaseUrl(serverUrl.replace(/\/+$/, ""));
	const url = `${baseUrl}/rest/${endpoint}?${params.toString()}`;

	const response = await fetch(url);
	return response.json();
}

export async function getOpenSubsonicExtensions(
	serverUrl: string,
): Promise<OpenSubsonicExtension[]> {
	const data = await fetchPublicEndpoint(
		serverUrl,
		"getOpenSubsonicExtensions",
	);
	const response =
		typeof data === "object" && data !== null
			? (data as Record<string, unknown>)["subsonic-response"]
			: null;

	if (typeof response !== "object" || response === null) {
		throw new Error("Failed to read OpenSubsonic extensions");
	}

	const parsedResponse = response as Record<string, unknown>;
	if (parsedResponse.status !== "ok") {
		throw new Error(formatSubsonicError(parseSubsonicError(data)));
	}

	const rawExtensions = parsedResponse.openSubsonicExtensions;
	if (!Array.isArray(rawExtensions)) {
		return [];
	}

	return rawExtensions
		.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null,
		)
		.map((item) => ({
			name: typeof item.name === "string" ? item.name : "",
			versions: Array.isArray(item.versions)
				? item.versions.filter(
						(version): version is number => typeof version === "number",
					)
				: [],
		}))
		.filter((item) => item.name.length > 0);
}

export async function supportsApiKeyAuthentication(
	serverUrl: string,
): Promise<boolean> {
	try {
		const extensions = await getOpenSubsonicExtensions(serverUrl);
		return extensions.some(
			(extension) => extension.name === "apiKeyAuthentication",
		);
	} catch {
		return false;
	}
}

export async function getTokenInfoWithApiKey(
	serverUrl: string,
	apiKey: string,
): Promise<TokenInfoResult> {
	const trimmedApiKey = apiKey.trim();
	if (!trimmedApiKey) {
		throw new Error("API key is required");
	}

	const data = await fetchPublicEndpoint(serverUrl, "tokenInfo", {
		apiKey: trimmedApiKey,
	});

	const response =
		typeof data === "object" && data !== null
			? (data as Record<string, unknown>)["subsonic-response"]
			: null;

	if (typeof response !== "object" || response === null) {
		throw new Error("Failed to validate API key");
	}

	const parsedResponse = response as Record<string, unknown>;
	if (parsedResponse.status !== "ok") {
		throw new Error(formatSubsonicError(parseSubsonicError(data)));
	}

	const tokenInfo = parsedResponse.tokenInfo;
	if (typeof tokenInfo !== "object" || tokenInfo === null) {
		return {};
	}

	const username = (tokenInfo as Record<string, unknown>).username;
	return {
		username: typeof username === "string" ? username : undefined,
	};
}

export async function createApiRequest(
	endpoint: string,
	additionalParams?: Record<string, string | string[]>,
	credentialsOverride?: SubsonicCredentials,
): Promise<{ url: string; headers: HeadersInit }> {
	const credentials = credentialsOverride ?? getCredentials();
	if (!credentials) {
		throw new Error("Not authenticated");
	}

	const params = createBaseParams();
	addParams(params, additionalParams);

	let headers: HeadersInit = {};

	if (credentials.authType === "apiKey") {
		params.set("apiKey", credentials.apiKey);
	} else {
		const { token, salt } = await getLegacyAuthTokens(credentials);
		headers = {
			"X-Subsonic-Username": credentials.username,
			"X-Subsonic-Token": token,
			"X-Subsonic-Salt": salt,
		};
	}

	const baseUrl = getBaseUrl(credentials.serverUrl);
	const url = `${baseUrl}/rest/${endpoint}?${params.toString()}`;

	return { url, headers };
}

export async function fetchSubsonic(
	endpoint: string,
	params?: Record<string, string | string[]>,
	init?: RequestInit,
): Promise<Response> {
	const { url, headers } = await createApiRequest(endpoint, params);
	return fetch(url, {
		...init,
		headers: {
			...headers,
			...init?.headers,
		},
	});
}

// Get the base URL for API requests
function getBaseUrl(serverUrl: string): string {
	// Hit the server directly (requires CORS to be enabled on the server)
	return serverUrl;
}

// Build a full API URL for media resources (images, streams, downloads)
// These require query parameters because headers cannot be set for HTML elements
export async function buildMediaUrl(
	endpoint: string,
	additionalParams?: Record<string, string>,
): Promise<string> {
	const credentials = getCredentials();
	if (!credentials) {
		throw new Error("Not authenticated");
	}

	const params = createBaseParams();

	if (credentials.authType === "apiKey") {
		params.set("apiKey", credentials.apiKey);
	} else {
		const { token, salt } = await getLegacyAuthTokens(credentials);
		params.set("u", credentials.username);
		params.set("t", token);
		params.set("s", salt);
	}

	if (additionalParams) {
		for (const [key, value] of Object.entries(additionalParams)) {
			params.set(key, value);
		}
	}

	const baseUrl = getBaseUrl(credentials.serverUrl);
	return `${baseUrl}/rest/${endpoint}?${params.toString()}`;
}

// Test connection to the Subsonic server
export async function ping(
	credentials: SubsonicCredentials,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { url, headers } = await createApiRequest(
			"ping",
			undefined,
			credentials,
		);

		const response = await fetch(url, { headers });
		const data = await response.json();

		if (data["subsonic-response"]?.status === "ok") {
			return { success: true };
		}

		const error = formatSubsonicError(parseSubsonicError(data));
		return { success: false, error };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Connection failed",
		};
	}
}
