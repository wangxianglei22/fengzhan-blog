/**
 * 音频流代理：Cloudflare Pages 的静态资源不响应 Range 请求（accept-ranges 为 null），
 * 浏览器因此把 <audio> 视为完全不可 seek，进度条拖到未播放位置会跳回起点。
 *
 * 这里自行取回原始文件并实现 206 Partial Content，让进度条可以正常拖动。
 * 实现不依赖静态资源自身是否支持 Range：
 * - 已知 content-length 时，直接对响应流做区间切片，不把整首歌读进内存；
 * - 未知 content-length 时（本机 wrangler pages dev 属于这种情况），退回整份缓冲后切片。
 */

type PagesContext = {
	request: Request;
	env: Record<string, unknown>;
	params?: Record<string, string | undefined>;
};

type AssetsBinding = {
	fetch: (request: Request) => Promise<Response>;
};

const AUDIO_CONTENT_TYPES: Record<string, string> = {
	mp3: "audio/mpeg",
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	wav: "audio/wav",
	flac: "audio/flac",
	aac: "audio/aac",
};

const BASE_HEADERS = {
	"accept-ranges": "bytes",
	"cache-control": "public, max-age=31536000, immutable",
	"x-content-type-options": "nosniff",
};

function fail(message: string, status = 400): Response {
	return new Response(message, {
		status,
		headers: { "content-type": "text/plain; charset=utf-8", ...BASE_HEADERS, "cache-control": "no-store" },
	});
}

/** 解析 "bytes=0-1023" / "bytes=1024-" / "bytes=-500" 形式的 Range 头 */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
	if (!header) return null;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return null;
	const [, rawStart, rawEnd] = match;
	if (rawStart === "" && rawEnd === "") return null;

	let start: number;
	let end: number;
	if (rawStart === "") {
		// bytes=-500 表示最后 500 字节
		const suffix = Number(rawEnd);
		if (!Number.isFinite(suffix) || suffix <= 0) return null;
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(rawStart);
		end = rawEnd === "" ? size - 1 : Number(rawEnd);
	}

	if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
	if (start < 0 || start >= size) return null;
	if (end < start) return null;
	if (end > size - 1) end = size - 1;
	return { start, end };
}

/** 从响应流里裁出 [start, end] 区间的字节，避免把整首歌读进内存 */
function sliceStream(body: ReadableStream<Uint8Array>, start: number, end: number): ReadableStream<Uint8Array> {
	let position = 0;
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				if (!reader) reader = body.getReader();
				while (position <= end) {
					const { done, value } = await reader.read();
					if (done) {
						controller.close();
						return;
					}
					if (!value) continue;
					const chunkStart = position;
					const chunkEnd = position + value.byteLength - 1;
					position = chunkEnd + 1;
					if (chunkEnd < start) continue;
					const from = Math.max(start, chunkStart) - chunkStart;
					const to = Math.min(end, chunkEnd) - chunkStart;
					controller.enqueue(value.subarray(from, to + 1));
					if (position > end) {
						controller.close();
						await reader.cancel();
						return;
					}
				}
			} catch (error) {
				controller.error(error);
			}
		},
		cancel(reason) {
			reader?.cancel(reason).catch(() => undefined);
			body.cancel(reason).catch(() => undefined);
		},
	});
}

export const onRequest = async ({ request, env, params }: PagesContext): Promise<Response> => {
	const rawPath = params?.path ?? "";
	if (!rawPath) return fail("缺少音频文件名。", 404);

	let decoded: string;
	try {
		decoded = decodeURIComponent(rawPath);
	} catch {
		return fail("音频文件名编码无效。", 400);
	}

	// 只允许 public/audio/ 下的单层文件名，禁止路径穿越
	if (!decoded || decoded.includes("/") || decoded.includes("\\") || decoded === "." || decoded === "..") {
		return fail("音频文件名不合法。", 400);
	}

	const extension = decoded.toLowerCase().split(".").pop() ?? "";
	const contentType = AUDIO_CONTENT_TYPES[extension];
	if (!contentType) return fail("不支持的音频格式。", 415);

	const assets = env.ASSETS as AssetsBinding | undefined;
	const assetUrl = new URL(`/audio/${encodeURIComponent(decoded)}`, request.url);

	let assetResponse: Response;
	try {
		if (assets && typeof assets.fetch === "function") {
			// 生产环境：直接读 Pages 静态资源绑定，不经过公网
			assetResponse = await assets.fetch(new Request(assetUrl.toString(), { method: "GET" }));
		} else {
			// 本地开发（未绑定 ASSETS 时）走普通请求
			assetResponse = await fetch(new Request(assetUrl.toString(), { method: "GET" }));
		}
	} catch (error) {
		return fail(`读取音频文件失败：${error instanceof Error ? error.message : String(error)}`, 500);
	}

	if (!assetResponse.ok || !assetResponse.body) {
		return fail("音频文件不存在。", assetResponse.status === 404 ? 404 : 500);
	}

	// Pages 对未匹配的路径可能回退到 404.html / index.html（仍是 200），
	// 因此要确认拿到的确实是音频而不是 HTML 页面。
	const assetContentType = (assetResponse.headers.get("content-type") ?? "").toLowerCase();
	if (!assetContentType.startsWith("audio/")) {
		return fail("音频文件不存在。", 404);
	}

	const declaredLength = Number(assetResponse.headers.get("content-length") ?? "");
	const hasKnownSize = Number.isFinite(declaredLength) && declaredLength > 0;

	const range = hasKnownSize ? parseRange(request.headers.get("range"), declaredLength) : null;

	// 已知大小且没有合法 Range → 直接把整份响应流送出去
	if (hasKnownSize && !range) {
		return new Response(assetResponse.body, {
			status: 200,
			headers: {
				...BASE_HEADERS,
				"content-type": contentType,
				"content-length": String(declaredLength),
			},
		});
	}

	// 未知大小（本地 dev）或需要 Range → 先缓冲整份文件再切片
	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(await assetResponse.arrayBuffer());
	} catch (error) {
		return fail(`读取音频内容失败：${error instanceof Error ? error.message : String(error)}`, 500);
	}
	if (!bytes.byteLength) return fail("音频文件为空。", 500);

	const size = bytes.byteLength;
	const resolved = range ?? parseRange(request.headers.get("range"), size);
	if (!resolved) {
		return new Response(bytes, {
			status: 200,
			headers: { ...BASE_HEADERS, "content-type": contentType, "content-length": String(size) },
		});
	}

	const { start, end } = resolved;
	return new Response(bytes.subarray(start, end + 1), {
		status: 206,
		headers: {
			...BASE_HEADERS,
			"content-type": contentType,
			"content-length": String(end - start + 1),
			"content-range": `bytes ${start}-${end}/${size}`,
		},
	});
};
