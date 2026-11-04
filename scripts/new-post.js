import fs from "node:fs";
import path from "node:path";

const [slug, title = slug] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
	console.error('用法：corepack pnpm new-post <英文文件名> ["文章标题"]');
	console.error("文件名只能包含小写英文字母、数字和连字符，例如 my-first-post。");
	process.exit(1);
}

const target = path.resolve("src/content/posts", `${slug}.md`);
const folder = path.resolve("src/content/posts", slug);
if (fs.existsSync(target) || fs.existsSync(folder)) {
	console.error(`文章网址已被占用：${slug}（检查同名 .md 文件或文件夹）`);
	process.exit(1);
}

const today = new Date();
const published = [
	today.getFullYear(),
	String(today.getMonth() + 1).padStart(2, "0"),
	String(today.getDate()).padStart(2, "0"),
].join("-");
const template = fs.readFileSync(new URL("../templates/post-template.md", import.meta.url), "utf8");
const content = template
	.replace(/^title: .*$/m, `title: ${JSON.stringify(title)}`)
	.replace(/^published: .*$/m, `published: ${published}`);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, content, { flag: "wx" });
console.log(`已创建草稿：${target}`);
