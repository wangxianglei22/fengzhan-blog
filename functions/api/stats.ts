/**
 * 站点访问数据接口（Cloudflare Web Analytics）。
 *
 * 前端的「站点统计」组件只显示真实数据，因此这里不再接入任何第三方贴链统计。
 * 数据来自 Cloudflare 自带的 Web Analytics RUM 数据集，通过 GraphQL API 读取。
 *
 * 需要配置的服务端环境变量（Cloudflare Pages → Settings → Variables and Secrets）：
 * - CF_ACCOUNT_ID  账号 ID（GraphQL 里作为 accountTag 使用）
 * - CF_API_TOKEN   API Token，权限需要包含 Account → Account Analytics → Read
 * - CF_SITE_TAG   Web Analytics 的站点 tag，在 Web Analytics 面板 URL 里可以看到
 *
 * 三个变量缺任意一个，接口都会返回 available:false，前端据此显示「未配置」，
 * 不会用假数字兜底。
 */

type Env = {
	CF_ACCOUNT_ID?: string;
	CF_API_TOKEN?: string;
	CF_SITE_TAG?: string;
};

type Context = {
	request: Request;
	env: Env;
};

type GraphQLGroup = {
	count?: number | null;
	sum?: { visits?: number | null } | null;
	avg?: { sampleInterval?: number | null } | null;
};

type GraphQLResponse = {
	data?: {
		viewer?: {
			accounts?: Array<{
				rumPageloadEventsAdaptiveGroups?: GraphQLGroup[];
			}>;
		};
	} | null;
	errors?: Array<{ message?: string }>;
};

// Cloudflare 官方说明：采样后的返回值已经按采样率放大（5,000 × 10 = 50,000 直接返回），
// sampleInterval 只是放大倍数的元信息，所以这里不能再乘一次。
const ANALYTICS_QUERY = `query($accountTag: String!, $siteTag: String!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      rumPageloadEventsAdaptiveGroups(
        filter: {siteTag: $siteTag, date_geq: $start, date_leq: $end}
        limit: 100
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        avg { sampleInterval }
        dimensions { date }
      }
    }
  }
}`;

// 兜底查询：部分账号的 filter 字段支持不一致，去掉维度与过滤条件，只保留核心聚合。
const ANALYTICS_QUERY_FALLBACK = `query($accountTag: String!, $siteTag: String!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      rumPageloadEventsAdaptiveGroups(
        filter: {siteTag: $siteTag, date_geq: $start, date_leq: $end}
        limit: 1
      ) {
        count
        sum { visits }
        avg { sampleInterval }
      }
    }
  }
}`;

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

// 只看最近 7 天：Cloudflare 的采样策略与数据新旧有关，越近的数据越接近精确值。
const WINDOW_DAYS = 7;

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const json = (data: unknown, status: number, cacheControl: string) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": cacheControl,
			"x-content-type-options": "nosniff",
			"referrer-policy": "strict-origin-when-cross-origin",
		},
	});

const runQuery = async (
	env: Env,
	token: string,
	query: string,
	start: string,
	end: string,
): Promise<GraphQLResponse> => {
	const response = await fetch(GRAPHQL_ENDPOINT, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			query,
			variables: {
				accountTag: env.CF_ACCOUNT_ID,
				siteTag: env.CF_SITE_TAG,
				start,
				end,
			},
		}),
	});
	if (!response.ok) {
		throw new Error(`GraphQL HTTP ${response.status}`);
	}
	return (await response.json()) as GraphQLResponse;
};

export const onRequestGet = async ({ env }: Context) => {
	const accountId = (env.CF_ACCOUNT_ID || "").trim();
	const apiToken = (env.CF_API_TOKEN || "").trim();
	const siteTag = (env.CF_SITE_TAG || "").trim();

	if (!accountId || !apiToken || !siteTag) {
		return json(
			{
				available: false,
				reason: "not-configured",
				message: "未配置 Cloudflare 统计变量",
			},
			200,
			"public, max-age=300",
		);
	}

	const end = new Date();
	const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
	const startDate = toDateString(start);
	const endDate = toDateString(end);

	let payload: GraphQLResponse;
	try {
		payload = await runQuery(env, apiToken, ANALYTICS_QUERY, startDate, endDate);
		if (payload.errors?.length) {
			// 主查询失败时用最小查询再试一次，兼容 filter 字段差异。
			payload = await runQuery(env, apiToken, ANALYTICS_QUERY_FALLBACK, startDate, endDate);
		}
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return json(
			{
				available: false,
				reason: "request-failed",
				message: "统计接口暂时不可用",
				detail,
			},
			502,
			"no-store",
		);
	}

	if (payload.errors?.length) {
		return json(
			{
				available: false,
				reason: "graphql-error",
				message: "统计接口返回错误",
				detail: payload.errors.map((item) => item.message || "").filter(Boolean).join("; "),
			},
			502,
			"no-store",
		);
	}

	const groups = payload.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
	if (!groups.length) {
		return json(
			{
				available: false,
				reason: "no-data",
				message: "暂时没有统计数据",
				days: WINDOW_DAYS,
			},
			200,
			"public, max-age=600",
		);
	}

	let pageViews = 0;
	let visits = 0;
	for (const group of groups) {
		pageViews += group.count || 0;
		visits += group.sum?.visits || 0;
	}

	return json(
		{
			available: true,
			pageViews,
			visits,
			days: WINDOW_DAYS,
			start: startDate,
			end: endDate,
			source: "cloudflare-web-analytics",
		},
		200,
		"public, max-age=1800, s-maxage=1800",
	);
};
