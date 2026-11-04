import { authenticate, corsHeaders, handleError, json, readDataFile, writeDataFile, unauthorized, type Context } from "./_shared";

const fallback = `<!-- \u6bcf\u9879\u8363\u8a89\u7528\u4e00\u6bb5 --- \u5305\u8d77\u6765 -->
---
date: 2026-01
name: \u5956\u9879\u540d\u79f0
issuer: \u9881\u53d1\u5355\u4f4d
award: \u83b7\u5f97\u7b49\u7ea7
---
`;

export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const file = await readDataFile(env, "honors");
		return json({ source: file?.source || fallback, sha: file?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const body = await request.json() as { source?: unknown; sha?: unknown };
		if (typeof body.source !== "string" || !body.source.trim()) return json({ error: "\u8363\u8a89\u5899\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a\u3002" }, 400, corsHeaders);
		if (body.source.length > 200_000) return json({ error: "\u8363\u8a89\u5899\u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc7 200 KB\u3002" }, 413, corsHeaders);
		const result = await writeDataFile(env, "honors", body.source, "\u66f4\u65b0\u8363\u8a89\u5899", typeof body.sha === "string" ? body.sha : undefined);
		return json({ saved: true, sha: result.content?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
