/**
 * 文章路径的 404 兜底。
 *
 * 为什么需要：站点部署在 Cloudflare Pages，项目开启了「单页应用（SPA）回退」，
 * 任何没有静态文件的地址都会返回 index.html + 状态码 200。
 * 于是 `/posts/瞎编的地址/` 看起来「成功」，搜索引擎会当有效页收录（软 404）。
 *
 * 做法：对 `<路径>/index.html` 做一次存在性探测（Pages 对目录会回 308，所以 3xx 也算存在）：
 * - 存在 → `context.next()`，交给 Pages 正常返回静态页面；
 * - 不存在 → 返回构建出来的 `/404.html`，并且状态码是真正的 **404**。
 *
 * 注意：不要写成 `functions/[[path]].ts` 全局兜底——Pages 每个请求只跑「第一个匹配的 Function」，
 * 全局兜底会把 `functions/api/*` 全部吞掉（实测所有 API 变成 404）。
 * 另外 `/api/*` 不经过这里：`public/_routes.json` 只把 `/posts/*`、`/diary/*` 交给 Function。
 */

type AssetFetcher = { fetch(input: Request | string): Promise<Response> };

type Env = { ASSETS: AssetFetcher };

type FunctionContext = {
	request: Request;
	env: Env;
	next: () => Promise<Response>;
};

export const onRequest = async (context: FunctionContext): Promise<Response> => {
	const { request, env, next } = context;
	const method = request.method.toUpperCase();
	if (method !== "GET" && method !== "HEAD") return next();

	const url = new URL(request.url);
	const normalized = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;

	// Pages 对「目录 + index.html」会 308 跳到规范地址，所以 3xx 也算页面存在
	const probe = await env.ASSETS.fetch(new Request(new URL(`${normalized}index.html`, url.origin).toString(), { method: "GET", redirect: "manual" }));
	const exists = probe.status === 200 || (probe.status >= 300 && probe.status < 400);
	if (exists) return next();

	const fallback = await env.ASSETS.fetch(new Request(new URL("/404.html", url.origin).toString(), { method: "GET" }));
	const body = fallback.status === 200 ? await fallback.text() : "<!doctype html><meta charset=\"utf-8\"><title>404</title><h1>404 页面不存在</h1>";
	return new Response(method === "HEAD" ? null : body, {
		status: 404,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
			"x-robots-tag": "noindex",
		},
	});
};
