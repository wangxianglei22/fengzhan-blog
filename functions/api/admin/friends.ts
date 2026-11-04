import { authenticate, corsHeaders, handleError, json, readDataFile, unauthorized, writeDataFile, type Context } from "./_shared";

const fallback = `<!-- 每位朋友使用一段 --- 包起来；填写 name、url、avatar 和 description。 -->
---
name: 朋友的博客
url: https://your-blog.pages.dev
avatar: https://your-blog.pages.dev/avatar.png
description: 分享技术、生活和正在学习的事情
---
`;

export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const file = await readDataFile(env, "friends");
		return json({ source: file?.source || fallback, sha: file?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const body = await request.json() as { source?: unknown; sha?: unknown };
		if (typeof body.source !== "string" || !body.source.trim()) return json({ error: "友链内容不能为空。" }, 400, corsHeaders);
		if (body.source.length > 200_000) return json({ error: "友链文件不能超过 200 KB。" }, 413, corsHeaders);
		const result = await writeDataFile(env, "friends", body.source, "更新友链配置", typeof body.sha === "string" ? body.sha : undefined);
		return json({ saved: true, sha: result.content?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
