/**
 * 后台模块（音乐 / 荣誉墙 / 留言板 / 友链）表单的解析与序列化逻辑。
 *
 * 这四个模块的配置文件都是「--- 分隔的 key: value」小文本，
 * 本文件负责把它们和结构化记录（ModuleRecord）互相转换，
 * 供 src/pages/admin/index.astro 的表单式编辑器使用。
 * 这里只处理纯数据，HTML 组装交给 admin 页面。
 */

/** 后台的四个可配置模块。 */
export type AdminModule = "music" | "honors" | "guestbook" | "friends";

/** 表单控件的类型。 */
export type ModuleFieldKind = "text" | "textarea" | "url" | "date";

/** 单个字段的描述。 */
export type ModuleField = {
	key: string;
	label: string;
	kind?: ModuleFieldKind;
	placeholder?: string;
	required?: boolean;
	hint?: string;
	/** 预留：下拉候选值（目前四个模块都用自由输入）。 */
	options?: string[];
};

/** 一条记录就是一个键值表，键为字段 key。 */
export type ModuleRecord = Record<string, string>;

/** 键名统一小写，但这些字段有固定写法（前台解析按原样匹配），需要还原。 */
const canonicalKeys: Record<string, string> = {
	envid: "envId",
};

const moduleFields: Record<AdminModule, ModuleField[]> = {
	music: [
		{ key: "title", label: "歌曲名", kind: "text", required: true, placeholder: "例如：宝船" },
		{ key: "artist", label: "歌手", kind: "text", placeholder: "例如：DOUDOU、燕云十六声" },
		{
			key: "url",
			label: "文件路径",
			kind: "text",
			required: true,
			placeholder: "/audio/song.mp3",
			hint: "必须以 /audio/ 开头，对应上传后的音频文件。",
		},
	],
	friends: [
		{ key: "name", label: "名称", kind: "text", required: true, placeholder: "例如：bilibili" },
		{
			key: "url",
			label: "链接",
			kind: "url",
			required: true,
			placeholder: "https://example.com",
			hint: "只允许 http(s) 地址或以 / 开头的站内路径",
		},
		{ key: "avatar", label: "头像地址", kind: "url", placeholder: "留空则显示名称首字母" },
		{ key: "description", label: "简介", kind: "textarea", placeholder: "一句话介绍这个站点" },
		{ key: "category", label: "分类", kind: "text", placeholder: "常用", hint: "留空时按「常用」处理" },
	],
	honors: [
		{ key: "date", label: "日期", kind: "text", required: true, placeholder: "2026-01", hint: "格式 YYYY-MM，例如 2026-01" },
		{ key: "name", label: "名称", kind: "text", required: true, placeholder: "例如：年度博主奖" },
		{ key: "award", label: "奖项", kind: "text", placeholder: "例如：获得等级" },
		{ key: "category", label: "类别", kind: "text", placeholder: "荣誉" },
		{ key: "issuer", label: "颁发单位", kind: "text", placeholder: "例如：某某平台" },
		{ key: "description", label: "描述", kind: "textarea", placeholder: "补充说明" },
		{
			key: "icon",
			label: "图标名",
			kind: "text",
			placeholder: "material-symbols:auto-awesome-rounded",
			hint: "留空时使用默认图标",
		},
	],
	guestbook: [
		{ key: "title", label: "标题", kind: "text", placeholder: "留言板" },
		{ key: "description", label: "简介", kind: "textarea", placeholder: "留言板顶部的说明文字" },
		{
			key: "envId",
			label: "Twikoo 服务地址",
			kind: "url",
			placeholder: "/api/twikoo",
			hint: "站内相对路径或完整地址都可以",
		},
	],
};

/** 取某个模块的字段定义（返回副本，避免调用方改到共享数据）。 */
export function getModuleFields(module: AdminModule): ModuleField[] {
	return (moduleFields[module] || []).map((field) => ({ ...field }));
}

/** 去掉首尾空白与首尾引号。 */
function cleanValue(raw: string): string {
	return raw.replace(/^['"]|['"]$/g, "").trim();
}

/**
 * 把模块文件解析成记录列表。
 * 先去掉 <!-- --> 注释，再按 --- 分段，每段解析 key: value 行。
 */
export function parseModuleRecords(source: string): ModuleRecord[] {
	const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
	const records: ModuleRecord[] = [];

	for (const block of withoutComments.split(/^\s*---\s*$/m)) {
		const record: ModuleRecord = {};
		let matched = false;
		for (const line of block.split(/\r?\n/)) {
			const match = line.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*?)\s*$/);
			if (!match) continue;
			const rawKey = match[1].toLowerCase();
			record[canonicalKeys[rawKey] || rawKey] = cleanValue(match[2]);
			matched = true;
		}
		if (matched) records.push(record);
	}

	return records;
}

/** 序列化时把换行压成空格，保证一条记录一个 key: value。 */
function normalizeValue(value: string | undefined): string {
	return String(value ?? "").replace(/\r?\n/g, " ").trim();
}

/**
 * 把记录列表序列化回模块文件的文本。
 * 每条记录是 --- 包起来的一段，段与段之间空一行；空值字段不写入。
 */
export function serializeModuleRecords(records: ModuleRecord[], module?: AdminModule): string {
	const preferred = module ? getModuleFields(module).map((field) => field.key) : [];
	const blocks: string[] = [];

	for (const record of records) {
		const keys = Object.keys(record);
		const ordered = [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key))];
		const lines: string[] = [];
		for (const key of ordered) {
			const value = normalizeValue(record[key]);
			if (!value) continue;
			lines.push(`${key}: ${value}`);
		}
		// 全部字段都为空时（用户刚点「添加一条」又没填）不写进文件，避免产生空块。
		if (!lines.length) continue;
		blocks.push(`---\n${lines.join("\n")}\n---`);
	}

	return blocks.length ? `${blocks.join("\n\n")}\n` : "";
}

/** 建一条空白记录（字段值都是空字符串）。 */
export function createModuleRecord(module: AdminModule): ModuleRecord {
	const record: ModuleRecord = {};
	for (const field of getModuleFields(module)) record[field.key] = "";
	if (module === "friends") record.category = "常用";
	return record;
}

/**
 * 补齐字段并套用默认值：
 * - 每个字段都保证有键，表单才不会渲染成 undefined；
 * - 友链的分类留空时按「常用」处理。
 */
export function normalizeModuleRecords(module: AdminModule, records: ModuleRecord[]): ModuleRecord[] {
	const fields = getModuleFields(module);
	return records.map((record) => {
		const next: ModuleRecord = { ...record };
		for (const field of fields) {
			next[field.key] = String(next[field.key] ?? "");
		}
		if (module === "friends" && !next.category) next.category = "常用";
		return next;
	});
}

/** 只允许 http(s) 地址或以 / 开头的站内路径（与前台解析规则一致）。 */
function isSafeLink(value: string): boolean {
	return (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value);
}

/** 一条记录是否所有字段都是空的。 */
export function isBlankRecord(record: ModuleRecord): boolean {
	return Object.values(record).every((value) => !String(value ?? "").trim());
}

/**
 * 保存前的校验，返回中文错误提示列表（空数组表示通过）。
 * options.skipIndexes 里的下标会被跳过 —— 用于「刚点添加、还没填」的空行。
 */
export function validateModuleRecords(
	module: AdminModule,
	records: ModuleRecord[],
	options?: { skipIndexes?: number[] },
): string[] {
	const problems: string[] = [];
	const fields = getModuleFields(module);
	const skipped = new Set(options?.skipIndexes || []);

	records.forEach((record, index) => {
		if (skipped.has(index)) return;
		const label = records.length > 1 ? `第 ${index + 1} 条` : "";
		for (const field of fields) {
			const value = String(record[field.key] ?? "").trim();
			if (field.required && !value) problems.push(`${label}${field.label}不能为空。`);
		}

		if (module === "music") {
			const url = String(record.url ?? "").trim();
			if (url && !url.startsWith("/audio/")) problems.push(`${label}音频文件路径必须以 /audio/ 开头。`);
		}

		if (module === "friends") {
			const url = String(record.url ?? "").trim();
			if (url && !isSafeLink(url)) problems.push(`${label}链接只允许 http(s) 地址或以 / 开头的站内路径。`);
			const avatar = String(record.avatar ?? "").trim();
			if (avatar && !isSafeLink(avatar)) problems.push(`${label}头像地址只允许 http(s) 地址或以 / 开头的站内路径。`);
		}

		if (module === "honors") {
			const date = String(record.date ?? "").trim();
			if (date && !/^\d{4}-\d{2}$/.test(date)) problems.push(`${label}日期格式必须是 YYYY-MM。`);
		}

		if (module === "guestbook") {
			const envId = String(record.envId ?? "").trim();
			if (envId && !isSafeLink(envId)) problems.push("Twikoo 服务地址只允许 http(s) 地址或以 / 开头的站内路径。");
		}
	});

	return problems;
}
