export type CollectionName = "posts" | "diary";
export type DataFileName = "music" | "honors" | "guestbook" | "friends";

export type Env = {
	GITHUB_TOKEN?: string;
	GITHUB_OWNER?: string;
	GITHUB_REPO?: string;
	GITHUB_BRANCH?: string;
	ADMIN_EMAIL?: string;
	ADMIN_PASSWORD?: string;
	ADMIN_SESSION_SECRET?: string;
};

export type Context = {
	request: Request;
	env: Env;
	params?: Record<string, string | undefined>;
};

export type Entry = {
	collection: CollectionName;
	slug: string;
	sha?: string;
	title: string;
	date: string;
	updated: string;
	draft: boolean;
	hidden: boolean;
	description: string;
	image: string;
	tags: string[];
	category: string;
	lang: string;
	mood: string;
	moodLabel: string;
	excerpt: string;
	cover: string;
	pinned: boolean;
	body: string;
};

type FrontmatterValue = string | boolean | string[] | null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const githubApi = "https://api.github.com";
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json; charset=utf-8", ...securityHeaders, ...headers },
	});

export const corsHeaders = {
	"cache-control": "no-store",
};

const securityHeaders = {
	"x-content-type-options": "nosniff",
	"x-frame-options": "SAMEORIGIN",
	"referrer-policy": "strict-origin-when-cross-origin",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
	"strict-transport-security": "max-age=31536000; includeSubDomains",
};

function base64Encode(bytes: Uint8Array) {
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

function base64Decode(value: string) {
	const binary = atob(value.replace(/\s/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return decoder.decode(bytes);
}

function encodePath(path: string) {
	return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function getGithubConfig(env: Env) {
	if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
		throw new Error("后台尚未配置 GitHub 仓库，请设置 GITHUB_TOKEN、GITHUB_OWNER 和 GITHUB_REPO。");
	}
	return {
		token: env.GITHUB_TOKEN,
		owner: env.GITHUB_OWNER,
		repo: env.GITHUB_REPO,
		branch: env.GITHUB_BRANCH || "main",
	};
}

async function githubRequest(env: Env, path: string, init: RequestInit = {}) {
	const config = getGithubConfig(env);
	const response = await fetch(`${githubApi}${path}`, {
		...init,
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${config.token}`,
			"user-agent": "blog-blog-admin",
			"x-github-api-version": "2022-11-28",
			...(init.body ? { "content-type": "application/json" } : {}),
			...(init.headers || {}),
		},
	});
	if (!response.ok) {
		const detail = await response.text();
		throw new GithubError(response.status, detail || response.statusText);
	}
	return response;
}

export class GithubError extends Error {
	constructor(public status: number, message: string) {
		super(message);
		this.name = "GithubError";
	}
}

function contentPath(collection: CollectionName, slug: string) {
	return `src/content/${collection}/${slug}.md`;
}

const dataFilePaths: Record<DataFileName, string> = {
	music: "src/data/music.md",
	honors: "src/data/honors.md",
	guestbook: "src/data/guestbook.md",
	friends: "src/data/friends.md",
};

function parseValue(raw: string): FrontmatterValue {
	const value = raw.trim();
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;
	if (value.startsWith("[") && value.endsWith("]")) {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			return value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
		}
	}
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1).replace(/\\([\\'"])/g, "$1");
	}
	return value;
}

function parseDocument(source: string) {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { frontmatter: {} as Record<string, FrontmatterValue>, body: source };
	const frontmatter: Record<string, FrontmatterValue> = {};
	let listKey = "";
	for (const line of match[1].split(/\r?\n/)) {
		const listItem = line.match(/^\s*-\s*(.*?)\s*$/);
		if (listItem && listKey) {
			const current = frontmatter[listKey];
			if (Array.isArray(current)) current.push(String(parseValue(listItem[1])));
			continue;
		}
		const field = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/);
		if (!field) continue;
		listKey = field[1];
		frontmatter[listKey] = field[2] ? parseValue(field[2]) : [];
	}
	return { frontmatter, body: match[2].trimStart() };
}

function stringValue(value: FrontmatterValue | undefined) {
	return typeof value === "string" ? value : "";
}

function arrayValue(value: FrontmatterValue | undefined) {
	return Array.isArray(value) ? value.map(String) : [];
}

function booleanValue(value: FrontmatterValue | undefined, fallback = false) {
	return typeof value === "boolean" ? value : fallback;
}

function quote(value: string) {
	return JSON.stringify(value ?? "");
}

function serializeDocument(collection: CollectionName, entry: Record<string, unknown>) {
	const dateField = collection === "posts" ? "published" : "date";
	const date = String(entry[dateField] || new Date().toISOString().slice(0, 10)).slice(0, 10);
	const lines = [
		"---",
		`title: ${quote(String(entry.title || "未命名"))}`,
		`${dateField}: ${date}`,
	];
	if (collection === "posts") {
		if (entry.updated) lines.push(`updated: ${String(entry.updated).slice(0, 10)}`);
		lines.push(`draft: ${entry.draft === true}`);
		lines.push(`hidden: ${entry.hidden === true}`);
		lines.push(`description: ${quote(String(entry.description || ""))}`);
		lines.push(`image: ${quote(String(entry.image || ""))}`);
		lines.push(`tags: ${JSON.stringify(Array.isArray(entry.tags) ? entry.tags.map(String) : [])}`);
		lines.push(`category: ${entry.category ? quote(String(entry.category)) : "null"}`);
		lines.push(`lang: ${quote(String(entry.lang || ""))}`);
	} else {
		lines.push(`mood: ${quote(String(entry.mood || "😊"))}`);
		lines.push(`moodLabel: ${quote(String(entry.moodLabel || "今天的心情"))}`);
		lines.push(`excerpt: ${quote(String(entry.excerpt || ""))}`);
		lines.push(`cover: ${quote(String(entry.cover || ""))}`);
		lines.push(`tags: ${JSON.stringify(Array.isArray(entry.tags) ? entry.tags.map(String) : [])}`);
		lines.push(`pinned: ${entry.pinned === true}`);
		lines.push(`draft: ${entry.draft === true}`);
		lines.push(`hidden: ${entry.hidden === true}`);
	}
	lines.push("---", "", String(entry.body || "").trim(), "");
	return lines.join("\n");
}

function normalizeEntry(collection: CollectionName, slug: string, sha: string | undefined, source: string): Entry {
	const parsed = parseDocument(source);
	const fields = parsed.frontmatter;
	const isPost = collection === "posts";
	return {
		collection,
		slug,
		sha,
		title: stringValue(fields.title) || slug,
		date: stringValue(fields[isPost ? "published" : "date"]),
		updated: stringValue(fields.updated),
		draft: booleanValue(fields.draft),
		hidden: booleanValue(fields.hidden),
		description: stringValue(fields.description),
		image: stringValue(fields.image),
		tags: arrayValue(fields.tags),
		category: stringValue(fields.category),
		lang: stringValue(fields.lang),
		mood: stringValue(fields.mood) || "😊",
		moodLabel: stringValue(fields.moodLabel) || "今天的心情",
		excerpt: stringValue(fields.excerpt),
		cover: stringValue(fields.cover),
		pinned: booleanValue(fields.pinned),
		body: parsed.body,
	};
}

async function readFile(env: Env, path: string) {
	const config = getGithubConfig(env);
	const response = await fetch(`${githubApi}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`, {
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${config.token}`,
			"user-agent": "blog-blog-admin",
			"x-github-api-version": "2022-11-28",
		},
	});
	if (response.status === 404) return null;
	if (!response.ok) throw new GithubError(response.status, await response.text());
	const data = await response.json() as { type?: string; content?: string; sha?: string };
	if (data.type !== "file" || !data.content) throw new Error(`GitHub 文件读取失败：${path}`);
	return { source: base64Decode(data.content), sha: data.sha || "" };
}

async function writeFile(env: Env, path: string, source: string, message: string, sha?: string) {
	const config = getGithubConfig(env);
	const response = await githubRequest(env, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}`, {
		method: "PUT",
		body: JSON.stringify({
			message,
			content: base64Encode(encoder.encode(source)),
			branch: config.branch,
			...(sha ? { sha } : {}),
		}),
	});
	return await response.json() as { content?: { sha?: string } };
}

async function deleteFile(env: Env, path: string, sha: string, message: string) {
	const config = getGithubConfig(env);
	await githubRequest(env, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}`, {
		method: "DELETE",
		body: JSON.stringify({ message, sha, branch: config.branch }),
	});
}

export async function readDataFile(env: Env, name: DataFileName) {
	return readFile(env, dataFilePaths[name]);
}

export async function writeDataFile(env: Env, name: DataFileName, source: string, message: string, sha?: string) {
	return writeFile(env, dataFilePaths[name], source, message, sha);
}

export async function writeBinaryFile(env: Env, path: string, bytes: Uint8Array, message: string, sha?: string) {
	const config = getGithubConfig(env);
	return githubRequest(env, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}`, {
		method: "PUT",
		body: JSON.stringify({
			message,
			content: base64Encode(bytes),
			branch: config.branch,
			...(sha ? { sha } : {}),
		}),
	});
}

function slugIsSafe(slug: string) {
	return /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(slug) && slug.length <= 120;
}

export function slugFromTitle(title: string, collection: CollectionName) {
	const base = title.trim().toLocaleLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}._-]/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
	return slugIsSafe(base) ? base : `${collection === "posts" ? "post" : "diary"}-${Date.now()}`;
}

export function validatePayload(collection: CollectionName, payload: Record<string, unknown>, currentSlug?: string) {
	const title = typeof payload.title === "string" ? payload.title.trim() : "";
	const slug = typeof payload.slug === "string" && payload.slug.trim() ? payload.slug.trim() : slugFromTitle(title, collection);
	if (!title || title.length > 160) throw new Error("标题不能为空，且不能超过 160 个字符。");
	if (!slugIsSafe(slug)) throw new Error("Slug 只能包含中文、字母、数字、点、下划线和短横线。");
	if (currentSlug && slug !== currentSlug) throw new Error("暂不支持在编辑时修改 Slug。");
	const dateKey = collection === "posts" ? "published" : "date";
	if (typeof payload[dateKey] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload[dateKey] as string)) {
		throw new Error("日期格式必须是 YYYY-MM-DD。");
	}
	return { ...payload, title, slug, [dateKey]: payload[dateKey] };
}

export async function listEntries(env: Env, collection: CollectionName) {
	const config = getGithubConfig(env);
	const directory = `src/content/${collection}`;
	let response: Response;
	try {
		response = await githubRequest(env, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${directory}?ref=${encodeURIComponent(config.branch)}`);
	} catch (error) {
		if (error instanceof GithubError && error.status === 404) return [];
		throw error;
	}
	const files = await response.json() as Array<{ type?: string; name?: string; path?: string }>;
	const markdownFiles = files.filter((file) => file.type === "file" && file.name?.endsWith(".md") && file.path);
	const entries = await Promise.all(markdownFiles.map(async (file) => {
		const content = await readFile(env, file.path!);
		if (!content) return null;
		return normalizeEntry(collection, file.name!.replace(/\.md$/, ""), content.sha, content.source);
	}));
	return entries.filter((entry): entry is Entry => Boolean(entry)).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntry(env: Env, collection: CollectionName, slug: string) {
	if (!slugIsSafe(slug)) return null;
	const content = await readFile(env, contentPath(collection, slug));
	return content ? normalizeEntry(collection, slug, content.sha, content.source) : null;
}

export async function saveEntry(env: Env, collection: CollectionName, payload: Record<string, unknown>, currentSlug?: string) {
	const valid = validatePayload(collection, payload, currentSlug);
	const slug = String(valid.slug);
	const existing = await getEntry(env, collection, slug);
	if (!currentSlug && existing) throw new GithubError(409, "这个 Slug 已经存在，请换一个。");
	const source = serializeDocument(collection, valid);
	const result = await writeFile(env, contentPath(collection, slug), source, `${currentSlug ? "更新" : "创建"}${collection === "posts" ? "文章" : "日记"}：${valid.title}`, existing?.sha);
	return normalizeEntry(collection, slug, result.content?.sha, source);
}

export async function removeEntry(env: Env, collection: CollectionName, slug: string) {
	const existing = await getEntry(env, collection, slug);
	if (!existing?.sha) throw new GithubError(404, "找不到要删除的内容。");
	await deleteFile(env, contentPath(collection, slug), existing.sha, `删除${collection === "posts" ? "文章" : "日记"}：${existing.title}`);
}

function getCookies(request: Request) {
	const cookieHeader = request.headers.get("cookie") || "";
	return Object.fromEntries(cookieHeader.split(";").map((item) => item.trim().split("=")).filter(([key]) => key));
}

function isSameOriginRequest(request: Request) {
	const origin = request.headers.get("origin");
	if (!origin) return true;
	try {
		return new URL(origin).origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}

function constantTimeEqual(left: string, right: string) {
	const a = encoder.encode(left);
	const b = encoder.encode(right);
	const length = Math.max(a.length, b.length);
	let difference = a.length ^ b.length;
	for (let index = 0; index < length; index += 1) {
		difference |= (a.length ? a[index % a.length] : 0) ^ (b.length ? b[index % b.length] : 0);
	}
	return difference === 0;
}

function clientKey(request: Request) {
	return request.headers.get("CF-Connecting-IP") || "unknown";
}

function pruneLoginAttempts(now: number) {
	for (const [key, attempt] of loginAttempts) {
		if (attempt.resetAt <= now) loginAttempts.delete(key);
	}
	if (loginAttempts.size > 2048) {
		const oldest = [...loginAttempts.entries()]
			.sort((a, b) => a[1].resetAt - b[1].resetAt)
			.slice(0, loginAttempts.size - 2048);
		for (const [key] of oldest) loginAttempts.delete(key);
	}
}

async function sign(value: string, secret: string) {
	const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
	return base64Encode(new Uint8Array(signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function authenticate(request: Request, env: Env) {
	// Do not trust CF-Access-Authenticated-User-Email directly. Unless the
	// Access JWT is verified, a public request can forge this header.
	if (!isSameOriginRequest(request)) return null;
	const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD;
	if (!secret) return null;
	const token = getCookies(request).blog_admin_session;
	if (!token) return null;
	const parts = token.split(".");
	if (parts.length !== 2) return null;
	const [expires, signature] = parts;
	const expiresAt = Number(expires);
	if (!/^\d{13}$/.test(expires) || !Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return null;
	return constantTimeEqual(await sign(expires, secret), signature) ? { email: env.ADMIN_EMAIL || "\u7ba1\u7406\u5458", method: "password" } : null;
}

export async function login(request: Request, env: Env) {
	if (!env.ADMIN_PASSWORD) return json({ error: "\u672a\u914d\u7f6e ADMIN_PASSWORD\u3002" }, 503, corsHeaders);
	if (!isSameOriginRequest(request)) return json({ error: "\u8bf7\u6c42\u6765\u6e90\u4e0d\u540c\uff0c\u8bf7\u4ece\u540c\u4e00\u7ad9\u70b9\u51fb\u767b\u5f55\u3002" }, 403, corsHeaders);
	const now = Date.now();
	pruneLoginAttempts(now);
	const key = clientKey(request);
	const previous = loginAttempts.get(key);
	if (previous && previous.resetAt > now && previous.count >= maxLoginAttempts) {
		return json({ error: "\u767b\u5f55\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7 15 \u5206\u949f\u540e\u91cd\u8bd5\u3002" }, 429, { ...corsHeaders, "retry-after": "900" });
	}
	let body: { password?: unknown };
	try {
		body = await request.json() as { password?: unknown };
	} catch {
		return json({ error: "\u8bf7\u6c42\u683c\u5f0f\u9519\u8bef\u3002" }, 400, corsHeaders);
	}
	if (typeof body.password !== "string" || !constantTimeEqual(body.password, env.ADMIN_PASSWORD)) {
		const attempt = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + loginWindowMs };
		attempt.count += 1;
		loginAttempts.set(key, attempt);
		return json({ error: "\u7ba1\u7406\u5458\u5bc6\u7801\u4e0d\u6b63\u786e\u3002" }, 401, corsHeaders);
	}
	loginAttempts.delete(key);
	const expires = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const signature = await sign(expires, env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD);
	const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
	return json({ authenticated: true }, 200, {
		...corsHeaders,
		"set-cookie": "blog_admin_session=" + expires + "." + signature + "; Max-Age=604800; Path=/; HttpOnly" + secure + "; SameSite=Strict",
	});
}

export function logout(request: Request) {
	if (!isSameOriginRequest(request)) return json({ authenticated: false }, 403, corsHeaders);
	const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
	return json({ authenticated: false }, 200, {
		...corsHeaders,
		"set-cookie": `blog_admin_session=; Max-Age=0; Path=/; HttpOnly${secure}; SameSite=Strict`,
	});
}

export function unauthorized() {
	return json({ error: "未登录或没有管理员权限。" }, 401, corsHeaders);
}

export function handleError(error: unknown) {
	if (error instanceof GithubError) {
		let detail = "";
		try {
			const parsed = JSON.parse(error.message) as { message?: string };
			detail = parsed.message || "";
		} catch {
			detail = error.message;
		}
		const message = error.status === 409
			? error.message
			: error.status === 401
				? "GitHub Token 无效或已过期，请重新生成 Token。"
				: error.status === 403
					? `GitHub 拒绝访问：${detail || "请检查 Token 的仓库权限。"}`
					: "GitHub 仓库操作失败，请检查后台配置。";
		return json({ error: message }, error.status, corsHeaders);
	}
	const message = error instanceof Error ? error.message : "后台操作失败。";
	return json({ error: message }, 400, corsHeaders);
}
