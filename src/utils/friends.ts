export type FriendLink = {
	name: string;
	url: string;
	avatar: string;
	description: string;
};

const fields = ["name", "url", "avatar", "description"] as const;

function isSafeLink(value: string): boolean {
	return (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value);
}

/** Parse the small Markdown-like data file in src/data/friends.md. */
export function parseFriends(source: string): FriendLink[] {
	const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");

	return withoutComments
		.split(/^\s*---\s*$/m)
		.map((block, index) => {
			const values: Partial<Record<(typeof fields)[number], string>> = {};
			for (const line of block.split(/\r?\n/)) {
				const match = line.match(/^\s*([a-z]+)\s*:\s*(.*?)\s*$/i);
				if (!match) continue;
				const key = match[1].toLowerCase() as (typeof fields)[number];
				if (fields.includes(key)) {
					values[key] = match[2].replace(/^['"]|['"]$/g, "").trim();
				}
			}

			if (!values.name && !values.url) return null;
			if (!values.name || !values.url) {
				throw new Error(`友链第 ${index + 1} 段缺少 name 或 url。`);
			}
			if (!isSafeLink(values.url)) {
				throw new Error(`友链第 ${index + 1} 段的 url 只允许 http(s) 或站内路径。`);
			}

			return {
				name: values.name,
				url: values.url,
				avatar: values.avatar && isSafeLink(values.avatar) ? values.avatar : "",
				description: values.description || "记录生活与想法的个人空间",
			};
		})
		.filter((friend): friend is FriendLink => friend !== null);
}
