import {
	authenticate,
	corsHeaders,
	GithubError,
	handleError,
	json,
	unauthorized,
	writeBinaryFile,
	type Context,
} from "./_shared";

/**
 * 上传本地图片到仓库的 public/images/uploads/。
 * 用法：POST /api/admin/images（multipart/form-data，字段名 file）
 * 返回 { uploaded, name, url }，url 可以直接写进 Markdown 或封面地址。
 */
const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
// 图片超过 10 MiB 已经明显拖慢页面，这里比 Cloudflare Pages 的 25 MiB 硬上限更严。
const maxImageBytes = 10 * 1024 * 1024;
const uploadDir = "public/images/uploads";

function fail(message: string, status = 400) {
	return json({ error: message }, status, corsHeaders);
}

export const onRequestPost = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		if (!(request.headers.get("content-type") || "").includes("multipart/form-data")) {
			return fail("请用表单方式上传图片。");
		}
		const form = await request.formData();
		const upload = form.get("file");
		if (!upload || typeof upload !== "object" || !("arrayBuffer" in upload) || !("name" in upload)) {
			return fail("请选择一张图片。");
		}
		const file = upload as File;
		const originalName = file.name.normalize("NFC").trim();
		// 只保留文字、数字和少量安全符号，其他字符一律替换掉，避免路径穿越和奇怪文件名。
		const safeName = originalName
			.replace(/[\\/]/g, "_")
			.replace(/[^\p{L}\p{N}._() -]/gu, "_")
			.replace(/^\.+/, "");
		const extension = safeName.toLowerCase().split(".").pop() || "";
		// 故意不接受 svg：SVG 可以内嵌脚本，和站点同源会有 XSS 风险。
		if (!safeName || !allowedExtensions.includes(extension)) {
			return fail("仅支持 jpg、jpeg、png、gif、webp、avif 图片。");
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		if (!bytes.length) return fail("图片文件不能为空。");
		if (bytes.byteLength > maxImageBytes) {
			return json(
				{
					error: `图片文件 ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MiB，超过 10 MiB 上限。请压缩或转成 WebP 后再上传。`,
				},
				413,
				corsHeaders,
			);
		}
		const dotIndex = safeName.lastIndexOf(".");
		const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
		const suffix = dotIndex > 0 ? safeName.slice(dotIndex) : "";
		// 同名文件不覆盖：GitHub 的 PUT 在文件已存在时会返回 409，这里自动加序号重试。
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const name = attempt === 0 ? safeName : `${base}-${attempt + 1}${suffix}`;
			try {
				await writeBinaryFile(env, `${uploadDir}/${name}`, bytes, `上传图片：${name}`);
				return json({ uploaded: true, name, url: `/images/uploads/${name.split("/").map(encodeURIComponent).join("/")}` }, 201, corsHeaders);
			} catch (error) {
				if (error instanceof GithubError && error.status === 409) continue;
				throw error;
			}
		}
		return fail("同名图片过多，请修改文件名后重试。", 409);
	} catch (error) {
		return handleError(error);
	}
};
