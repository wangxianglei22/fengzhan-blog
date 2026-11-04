/**
 * Twikoo 留言板后端 —— 挂载在博客自身的 Cloudflare Pages Function 上。
 *
 * 路由：/api/twikoo（以及 /api/twikoo/xxx 的子路径）
 *
 * 为什么放在这里：
 * - 与博客同域名，无需额外的 workers.dev 子域名（国内 DNS 污染会超时）。
 * - 与博客共用同一个 Cloudflare 账号与免费额度（Workers Free 10 万请求/天）。
 * - 留言数据存在 Cloudflare D1（绑定名 DB），无需自建服务器或 MongoDB。
 *
 * 依赖：functions/vendor/twikoo/ 下的适配器构建产物（由 twikoojs/twikoo 仓库的
 * packages/server-cloudflare 构建而来），需要在 wrangler.toml 中声明：
 *
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "twikoo"
 *   database_id = "<你的 database id>"
 *
 * 表结构见 functions/vendor/twikoo/schema.sql，也可以不手动执行 —— 适配器首次
 * 请求时会自动建表。
 */
import twikoo from "../../vendor/twikoo/index.js";

type PagesContext = {
	request: Request;
	env: Record<string, unknown>;
	waitUntil?: (promise: Promise<unknown>) => void;
	passThroughOnException?: () => void;
};

export const onRequest = async (context: PagesContext): Promise<Response> => {
	const handler = twikoo as unknown as {
		fetch: (
			request: Request,
			env: Record<string, unknown>,
			executionCtx: PagesContext,
		) => Promise<Response>;
	};

	return handler.fetch(context.request, context.env, context);
};
