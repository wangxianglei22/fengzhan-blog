import { authenticate, corsHeaders, deleteRepoFile, handleError, json, readDataFile, writeBinaryFile, writeDataFile, unauthorized, type Context } from "./_shared";

const fallback = `<!-- \u6bcf\u9996\u6b4c\u66f2\u7528\u4e00\u6bb5 --- \u5305\u8d77\u6765\uff0c\u97f3\u9891\u6587\u4ef6\u653e\u5728 public/audio/ -->
---
title: \u6b4c\u66f2\u540d\u79f0
artist: \u6b4c\u624b\u540d\u79f0
url: /audio/song.mp3
---
`;

export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const file = await readDataFile(env, "music");
		return json({ source: file?.source || fallback, sha: file?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

/**
 * 删除已上传的音频文件。
 * 用法：DELETE /api/admin/music?file=<文件名>
 * 文件名只允许落在 public/audio/ 下，不接受目录跳转。
 */
export const onRequestDelete = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const raw = new URL(request.url).searchParams.get("file") || "";
		const name = decodeURIComponent(raw).trim();
		if (!name) return json({ error: "\u8bf7\u6307\u5b9a\u8981\u5220\u9664\u7684\u97f3\u9891\u6587\u4ef6\u3002" }, 400, corsHeaders);
		if (name.includes("/") || name.includes("\\") || name.includes("..") || name.startsWith(".")) {
			return json({ error: "\u97f3\u9891\u6587\u4ef6\u540d\u4e0d\u5408\u6cd5\u3002" }, 400, corsHeaders);
		}
		const deleted = await deleteRepoFile(env, `public/audio/${name}`, `\u5220\u9664\u97f3\u9891\uff1a${name}`);
		return json({ deleted }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
			const form = await request.formData();
			const upload = form.get("file");
			if (!upload || typeof upload !== "object" || !("arrayBuffer" in upload) || !("name" in upload)) {
				return json({ error: "请选择一个音频文件。" }, 400, corsHeaders);
			}
			const file = upload as File;
			const originalName = file.name.normalize("NFC").trim();
			const safeName = originalName.replace(/[\\/]/g, "_").replace(/[^\p{L}\p{N}._() -]/gu, "_");
			const extension = safeName.toLowerCase().split(".").pop() || "";
			if (!safeName || !["mp3", "m4a", "ogg", "wav", "flac", "aac"].includes(extension)) {
				return json({ error: "仅支持 mp3、m4a、ogg、wav、flac、aac 音频文件。" }, 400, corsHeaders);
			}
			const bytes = new Uint8Array(await file.arrayBuffer());
			if (!bytes.length) return json({ error: "音频文件不能为空。" }, 400, corsHeaders);
			// Cloudflare Pages 单文件上限为 25 MiB，超出会在构建阶段被直接拒绝部署。
			if (bytes.byteLength > 25 * 1024 * 1024) {
				return json(
					{
						error:
							"单个音频文件不能超过 25 MiB（Cloudflare Pages 的硬上限）。请先转成 MP3 或压缩后再上传。",
					},
					413,
					corsHeaders,
				);
			}
			await writeBinaryFile(env, `public/audio/${safeName}`, bytes, `上传音乐：${safeName}`);
			return json({ uploaded: true, name: safeName, url: `/audio/${safeName.split("/").map(encodeURIComponent).join("/")}` }, 201, corsHeaders);
		}
		const body = await request.json() as { source?: unknown; sha?: unknown };
		if (typeof body.source !== "string" || !body.source.trim()) return json({ error: "\u6b4c\u5355\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a\u3002" }, 400, corsHeaders);
		if (body.source.length > 200_000) return json({ error: "\u6b4c\u5355\u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc7 200 KB\u3002" }, 413, corsHeaders);
		const result = await writeDataFile(env, "music", body.source, "\u66f4\u65b0\u97f3\u4e50\u6b4c\u5355", typeof body.sha === "string" ? body.sha : undefined);
		return json({ saved: true, sha: result.content?.sha || "" }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
