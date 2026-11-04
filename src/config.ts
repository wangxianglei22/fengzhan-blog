import type { ExpressiveCodeConfig, LicenseConfig, NavBarConfig, ProfileConfig, SiteConfig } from "./types/config";
import { LinkPreset } from "./types/config";

// 公开站点信息；部署前替换为你自己的内容。
export const siteConfig: SiteConfig = {
	title: "枫栈",
	subtitle: "记录与思考",
	siteStartedAt: "2026-11-04",
	lang: "zh_CN",
	themeColor: { hue: 252, fixed: false },
	banner: {
		enable: false,
		src: "/images/banner.svg",
		position: "center",
		credit: { enable: false, text: "", url: "" },
	},
	toc: { enable: true, depth: 2 },
	favicon: [{ src: "/images/avatar.svg", sizes: "any" }],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		{ name: "文章总览", url: "/archive/" },
		{ name: "日记", url: "/diary/" },
		{ name: "音乐", url: "/music/" },
		{ name: "常用网站", url: "/friends/" },
		{ name: "留言板", url: "/guestbook/" },
		LinkPreset.About,
	],
};

// 留空时显示配置提示，不会访问外部留言服务。
export const twikooConfig = { envId: "" };

export const profileConfig: ProfileConfig = {
	avatar: "/images/avatar.svg",
	name: "林枫枫",
	bio: "折腾代码，也折腾生活。这里存放我的日常记录、一些读后感和还没想明白的事。",
	location: "在某个有枫叶的城市",
	occupation: "写代码的人",
	links: [
		// 示例：{ name: "Bilibili", icon: "fa6-brands:bilibili", url: "https://space.bilibili.com/你的编号" },
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = { theme: "github-dark" };
