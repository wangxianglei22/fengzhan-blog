export type QuoteCategory = "daily" | "study" | "healing" | "dream";

export interface QuoteItem {
	text: string;
	category: QuoteCategory;
	label: string;
}

// 主页的语录集中放在这里，后续只需要继续添加对象即可同步到各个语录组件。
export const quoteItems: QuoteItem[] = [
	{ text: "把喜欢的事做久一点，就成了生活。", category: "daily", label: "日常" },
	{ text: "不用赶路，走稳比走快重要。", category: "healing", label: "治愈" },
	{ text: "认真吃饭，认真休息，也是在认真生活。", category: "daily", label: "日常" },
	{ text: "每天推进一点，平凡的日子也在往前。", category: "healing", label: "治愈" },
	{ text: "先完成，再完善；每一步都算数。", category: "study", label: "学习" },
	{ text: "现在的每一笔，都在给以后打底。", category: "dream", label: "向前" },
	{ text: "把今天能做的事做好，答案会在路上出现。", category: "study", label: "学习" },
	{ text: "允许自己停一停，节奏乱了可以重来。", category: "healing", label: "治愈" },
	{ text: "热爱不是轰轰烈烈，而是愿意一次次回来。", category: "dream", label: "向前" },
	{ text: "生活的惊喜，常常藏在不经意的小事里。", category: "daily", label: "日常" },
	{ text: "不必和别人比进度，按自己的节奏来。", category: "healing", label: "治愈" },
	{ text: "给灵感一点时间，它会自己找上门。", category: "dream", label: "向前" },
	{ text: "今天学会的一点点，会成为明天的底气。", category: "study", label: "学习" },
	{ text: "把注意力放回当下，答案往往就在手边。", category: "daily", label: "日常" },
	{ text: "走过的每一步，都算数。", category: "dream", label: "向前" },
	{ text: "累了就休息，重新出发也不算迟。", category: "healing", label: "治愈" },
];
