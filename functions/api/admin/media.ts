import { authenticate, corsHeaders, deleteRepoFile, handleError, json, listRepoDirectory, unauthorized, type Context, type Env } from "./_shared";

const imageExtensions = ["svg", "jpg", "jpeg", "png", "gif", "webp", "avif"];
const audioExtensions = ["mp3", "m4a", "ogg", "wav", "flac", "aac"];

// public/images 下还可能有 uploads 之类的一层子目录，逐个列出来。
const imageDirectories = ["public/images", "public/images/uploads"];
const audioDirectories = ["public/audio"];

export type MediaItem = {
	name: string;
	path: string;
	url: string;
	size: number;
};

function extensionOf(name: string) {
	return name.toLowerCase().split(".").pop() || "";
}

/** public/images/uploads/a.png → /images/uploads/a.png */
function publicUrl(repoPath: string) {
	return `/${repoPath.replace(/^public\//, "")}`;
}

async function collect(env: Env, directories: string[], extensions: string[]): Promise<MediaItem[]> {
	const seen = new Set<string>();
	const items: MediaItem[] = [];
	for (const directory of directories) {
		const entries = await listRepoDirectory(env, directory);
		for (const entry of entries) {
			if (entry.type !== "file") continue;
			if (!extensions.includes(extensionOf(entry.name))) continue;
			if (seen.has(entry.path)) continue;
			seen.add(entry.path);
			items.push({ name: entry.name, path: entry.path, url: publicUrl(entry.path), size: entry.size });
		}
	}
	return items.sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

/** GET /api/admin/media —— 列出仓库里已上传的图片与音频，供素材库和管理界面引用。 */
export const onRequestGet = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const [images, audio] = await Promise.all([
			collect(env, imageDirectories, imageExtensions),
			collect(env, audioDirectories, audioExtensions),
		]);
		return json({ images, audio }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};

/**
 * DELETE /api/admin/media?path=public/images/uploads/a.png
 * 只允许删除 public/images 与 public/audio 下的文件，其它路径一律拒绝。
 */
export const onRequestDelete = async ({ request, env }: Context) => {
	if (!(await authenticate(request, env))) return unauthorized();
	try {
		const raw = new URL(request.url).searchParams.get("path") || "";
		const target = decodeURIComponent(raw).trim().replace(/^\/+/, "");
		if (!target) return json({ error: "请指定要删除的文件。" }, 400, corsHeaders);
		if (target.includes("..") || target.includes("\\")) {
			return json({ error: "文件路径不合法。" }, 400, corsHeaders);
		}
		if (!/^public\/(images|audio)\/[\p{L}\p{N}._() /-]+$/u.test(target)) {
			return json({ error: "只能删除 public/images 或 public/audio 下的文件。" }, 400, corsHeaders);
		}
		const name = target.split("/").pop() || target;
		const deleted = await deleteRepoFile(env, target, `删除素材：${name}`);
		if (!deleted) return json({ error: "文件不存在或已被删除。" }, 404, corsHeaders);
		return json({ deleted: true }, 200, corsHeaders);
	} catch (error) {
		return handleError(error);
	}
};
