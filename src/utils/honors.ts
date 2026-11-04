export type Honor = {
	date: string;
	name: string;
	award: string;
	category: string;
	issuer: string;
	description: string;
	icon: string;
};

const fields = ["date", "name", "award", "title", "category", "issuer", "description", "icon"] as const;

/**
 * Parse the small Markdown-like data file in src/data/honors.md.
 * Each record is delimited by --- and uses one `field: value` per line.
 */
export function parseHonors(source: string): Honor[] {
	const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");

	return withoutComments
		.split(/^\s*---\s*$/m)
		.map((block) => {
			const values: Partial<Record<(typeof fields)[number], string>> = {};
			for (const line of block.split(/\r?\n/)) {
				const match = line.match(/^\s*([a-z]+)\s*:\s*(.*?)\s*$/i);
				if (!match) continue;
				const key = match[1].toLowerCase() as (typeof fields)[number];
				if (fields.includes(key)) values[key] = match[2].replace(/^['"]|['"]$/g, "").trim();
			}

			if (!values.date || (!values.name && !values.title)) return null;
			return {
				date: values.date,
				name: values.name || values.title || "",
				award: values.award || "",
				category: values.category || "荣誉",
				issuer: values.issuer || "",
				description: values.description || "",
				icon: values.icon || "material-symbols:auto-awesome-rounded",
			};
		})
		.filter((honor): honor is Honor => honor !== null)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function formatHonorDate(value: string): string {
	const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
	const date = new Date(`${normalized}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(date);
}
