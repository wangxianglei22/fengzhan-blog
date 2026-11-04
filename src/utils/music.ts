import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type MusicTrack = {
	id: string;
	title: string;
	artist: string;
	url: string;
};

const fields = ["title", "artist", "url"] as const;

function resolveLocalAudioUrl(rawUrl: string): string {
	if (!rawUrl.startsWith("/audio/") || /[?#\\]/.test(rawUrl)) {
		throw new Error(`歌曲路径必须写成 /audio/文件名，例如 /audio/song.mp3：${rawUrl}`);
	}

	let relativePath: string;
	try {
		relativePath = decodeURIComponent(rawUrl.slice("/audio/".length));
	} catch {
		throw new Error(`歌曲路径包含无效的 URL 编码：${rawUrl}`);
	}
	const parts = relativePath.split("/");
	if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
		throw new Error(`歌曲路径只能指向 public/audio/ 内的文件：${rawUrl}`);
	}

	const filePath = resolve(process.cwd(), "public", "audio", ...parts);
	if (!existsSync(filePath) || !statSync(filePath).isFile()) {
		throw new Error(`找不到歌单中的音频文件：${filePath}`);
	}
	// 走 /api/audio/ 代理：Cloudflare Pages 的静态资源不响应 Range 请求，
	// 浏览器会把音频视为不可 seek，进度条拖动会跳回起点。代理层补上 206 支持。
	return `/api/audio/${parts.map(encodeURIComponent).join("/")}`;
}

export function parseMusic(source: string): MusicTrack[] {
	const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");

	return withoutComments
		.split(/^\s*---\s*$/m)
		.map((block, index) => {
			const values: Partial<Record<(typeof fields)[number], string>> = {};
			for (const line of block.split(/\r?\n/)) {
				const match = line.match(/^\s*([a-z]+)\s*:\s*(.*?)\s*$/i);
				if (!match) continue;
				const key = match[1].toLowerCase() as (typeof fields)[number];
				if (fields.includes(key)) values[key] = match[2].replace(/^['"]|['"]$/g, "").trim();
			}

			if (!values.title && !values.url) return null;
			if (!values.title || !values.url) {
				throw new Error(`歌单第 ${index + 1} 段缺少 title 或 url。`);
			}
			return {
				id: `track-${index + 1}`,
				title: values.title,
				artist: values.artist || "未知歌手",
				url: resolveLocalAudioUrl(values.url),
			};
		})
		.filter((track): track is MusicTrack => track !== null);
}
