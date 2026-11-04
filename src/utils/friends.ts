export type FriendLink = {
	name: string;
	url: string;
	avatar: string;
	description: string;
	category: string;
};

const fields = ["name", "url", "avatar", "description", "category"] as const;

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
				throw new Error(`站点第 ${index + 1} 段缺少 name 或 url。`);
			}
			if (!isSafeLink(values.url)) {
				throw new Error(`站点第 ${index + 1} 段的 url 只允许 http(s) 或站内路径。`);
			}

			return {
				name: values.name,
				url: values.url,
				avatar: values.avatar && isSafeLink(values.avatar) ? values.avatar : "",
				description: values.description || "常去的地方，顺手记下来。",
				category: values.category || "常用",
			};
		})
		.filter((friend): friend is FriendLink => friend !== null);
}

/** Group links by category, keeping the order of first appearance. */
export function groupFriendsByCategory(friends: FriendLink[]): { category: string; items: FriendLink[] }[] {
	const groups: { category: string; items: FriendLink[] }[] = [];
	for (const friend of friends) {
		const existing = groups.find((group) => group.category === friend.category);
		if (existing) existing.items.push(friend);
		else groups.push({ category: friend.category, items: [friend] });
	}
	return groups;
}
