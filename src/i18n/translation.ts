import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
// 本站固定中文，只保留实际会用到的语言包：多余语言会各自变成一个额外 chunk，
// 在首屏被浏览器一并请求（每个请求都可能卡住数秒）。需要别的语言时在这里加回即可。
import { en } from "./languages/en";
import { zh_CN } from "./languages/zh_CN";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || defaultTranslation;
}

export function i18n(key: I18nKey): string {
	const lang = siteConfig.lang || "en";
	return getTranslation(lang)[key];
}
