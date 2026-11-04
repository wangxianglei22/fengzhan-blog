import { authenticate, corsHeaders, handleError, json, readDataFile, writeDataFile, unauthorized, type Context } from "./_shared";

const fallback = `---
title: \u7559\u8a00\u677f
description: \u7559\u4e0b\u4f60\u7684\u60f3\u6cd5\uff0c\u548c\u6211\u6253\u4e2a\u62db\u547c\u5427\u3002
envId: https://\u4f60\u7684-twikoo-\u670d\u52a1\u5730\u5740
---
`;

export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const file = await readDataFile(env, "guestbook");
		return json({ source: file?.source || fallback, sha: file?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const body = await request.json() as { source?: unknown; sha?: unknown };
		if (typeof body.source !== "string" || !body.source.trim()) return json({ error: "\u7559\u8a00\u677f\u914d\u7f6e\u4e0d\u80fd\u4e3a\u7a7a\u3002" }, 400, corsHeaders);
		if (body.source.length > 30_000) return json({ error: "\u7559\u8a00\u677f\u914d\u7f6e\u4e0d\u80fd\u8d85\u8fc7 30 KB\u3002" }, 413, corsHeaders);
		const result = await writeDataFile(env, "guestbook", body.source, "\u66f4\u65b0\u7559\u8a00\u677f\u914d\u7f6e", typeof body.sha === "string" ? body.sha : undefined);
		return json({ saved: true, sha: result.content?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
