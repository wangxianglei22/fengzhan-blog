/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	/**
	 * Cloudflare Web Analytics 的站点 token。
	 * 这是公开标识而非密钥，会明文出现在构建产物里；
	 * 未配置时前端不会注入统计脚本。
	 */
	readonly PUBLIC_CF_BEACON_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
