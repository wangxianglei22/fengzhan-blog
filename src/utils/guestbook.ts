export type GuestbookSettings = {
	title: string;
	description: string;
	envId: string;
};

const defaults: GuestbookSettings = {
	title: "\u7559\u8a00\u677f",
	description: "\u7559\u4e0b\u4f60\u7684\u60f3\u6cd5\uff0c\u548c\u6211\u6253\u4e2a\u62db\u547c\u5427\u3002",
	envId: "",
};

export function parseGuestbook(source: string): GuestbookSettings {
	const values = { ...defaults };
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return values;
	for (const line of match[1].split(/\r?\n/)) {
		const field = line.match(/^\s*(title|description|envId)\s*:\s*(.*?)\s*$/);
		if (!field) continue;
		const value = field[2].replace(/^['"]|['"]$/g, "").trim();
		if (field[1] === "title") values.title = value || defaults.title;
		if (field[1] === "description") values.description = value || defaults.description;
		if (field[1] === "envId") values.envId = value;
	}
	return values;
}
