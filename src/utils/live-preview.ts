import type { EditorState, Range } from "@codemirror/state";
import type { Decoration as DecorationInstance, DecorationSet, EditorView } from "@codemirror/view";

/** 后端图片上传回调：返回可直接写进 Markdown 的地址。 */
export type LivePreviewImageHandler = (file: File) => Promise<string>;

export type LivePreviewOptions = {
	dark: boolean;
	onChange: (value: string) => void;
	onImage: LivePreviewImageHandler;
	onNotice?: (message: string, tone: "info" | "error") => void;
};

export type LivePreviewHandle = {
	getValue(): string;
	getSelectionText(): string;
	replaceSelection(text: string): void;
	focus(): void;
	destroy(): void;
};

type DecorationRange = { from: number; to: number; deco: DecorationInstance };

/**
 * 创建一个「Obsidian 式实时预览」编辑器：
 * - 光标所在行显示原始 Markdown，其它行把记号藏起来、按渲染效果排版
 * - 标题、引用、列表、任务框、分割线、代码块、图片、粗体、斜体、行内代码、链接都会就地渲染
 * - CodeMirror 只负责编辑与装饰，正文仍然由外层 textarea 承载，保存逻辑完全不用改
 */
export async function createLivePreview(host: HTMLElement, initial: string, options: LivePreviewOptions): Promise<LivePreviewHandle> {
	const [stateModule, viewModule, commands] = await Promise.all([
		import("@codemirror/state"),
		import("@codemirror/view"),
		import("@codemirror/commands"),
	]);
	const { EditorView, Decoration, ViewPlugin, WidgetType, drawSelection, keymap } = viewModule;
	const { defaultKeymap, history, historyKeymap, indentWithTab } = commands;
	const { StateField } = stateModule;

	class BulletWidget extends WidgetType {
		constructor(private readonly ordered: string) {
			super();
		}
		eq(other: BulletWidget): boolean {
			return other.ordered === this.ordered;
		}
		toDOM(): HTMLElement {
			const span = document.createElement("span");
			span.className = "cm-lp-bullet";
			span.textContent = this.ordered ? this.ordered : "•";
			return span;
		}
	}

	class TaskWidget extends WidgetType {
		constructor(private readonly checked: boolean) {
			super();
		}
		eq(other: TaskWidget): boolean {
			return other.checked === this.checked;
		}
		toDOM(): HTMLElement {
			const span = document.createElement("span");
			span.className = this.checked ? "cm-lp-task is-checked" : "cm-lp-task";
			span.textContent = this.checked ? "☑" : "☐";
			return span;
		}
	}

	class ImageWidget extends WidgetType {
		constructor(
			private readonly url: string,
			private readonly alt: string,
		) {
			super();
		}
		eq(other: ImageWidget): boolean {
			return other.url === this.url && other.alt === this.alt;
		}
		toDOM(): HTMLElement {
			const image = document.createElement("img");
			image.className = "cm-lp-image";
			image.src = this.url;
			image.alt = this.alt;
			image.loading = "lazy";
			// 图片还没随仓库构建上线时会 404，这时退化成文字，别让编辑区出现破图
			image.addEventListener("error", () => {
				const fallback = document.createElement("span");
				fallback.className = "cm-lp-image-fallback";
				fallback.textContent = this.alt ? `🖼 ${this.alt}` : "🖼 图片（尚未上线）";
				image.replaceWith(fallback);
			});
			return image;
		}
		ignoreEvent(): boolean {
			return false;
		}
	}

	type TableCell = string;

	class TableWidget extends WidgetType {
		constructor(
			private readonly head: TableCell[],
			private readonly body: TableCell[][],
			private readonly aligns: string[],
			private readonly raw: string,
			private readonly anchor: number,
		) {
			super();
		}
		eq(other: TableWidget): boolean {
			return other.raw === this.raw;
		}
		toDOM(): HTMLElement {
			const wrap = document.createElement("div");
			wrap.className = "cm-lp-table-wrap";
			// 点一下表格就把光标放进源码里，方便直接改（和 Obsidian 一样：要编辑就露源码）
			wrap.addEventListener("mousedown", (event) => {
				event.preventDefault();
				if (!activeView) return;
				activeView.dispatch({ selection: { anchor: this.anchor } });
				activeView.focus();
			});
			const table = document.createElement("table");
			table.className = "cm-lp-table";
			const thead = document.createElement("thead");
			const headRow = document.createElement("tr");
			this.head.forEach((cell, index) => {
				const th = document.createElement("th");
				th.textContent = cell;
				const align = this.aligns[index] ?? "";
				if (align) th.style.textAlign = align;
				headRow.appendChild(th);
			});
			thead.appendChild(headRow);
			table.appendChild(thead);
			if (this.body.length) {
				const tbody = document.createElement("tbody");
				this.body.forEach((row) => {
					const tr = document.createElement("tr");
					this.head.forEach((cell, index) => {
						void cell;
						const td = document.createElement("td");
						td.textContent = row[index] ?? "";
						const align = this.aligns[index] ?? "";
						if (align) td.style.textAlign = align;
						tr.appendChild(td);
					});
					tbody.appendChild(tr);
				});
				table.appendChild(tbody);
			}
			wrap.appendChild(table);
			return wrap;
		}
		ignoreEvent(): boolean {
			return true;
		}
	}

	const INLINE = /(!\[[^\]]*\]\([^)]*\))|(`[^`\n]+`)|(\*\*\*[^*\n]+\*\*\*)|(___(?!_)[^_\n]+___)|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(\[[^\]]*\]\([^)]*\))/g;
	// 可被反斜杠转义的字符（渲染时隐藏反斜杠本身）
	const ERASE_PATTERN = /\\([\\`*_{}\[\]()#+\-.!|~>])/g;

	// 把一行 | a | b | 拆成单元格（去掉首尾空段）
	const splitRow = (line: string): TableCell[] => {
		const trimmed = line.trim();
		const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
		const tail = inner.endsWith("|") ? inner.slice(0, -1) : inner;
		return tail.split("|").map((cell) => cell.trim());
	};

	// 第二行分隔符里的 :---: 决定每一列的对齐
	const parseAligns = (line: string, count: number): string[] => {
		const cells = splitRow(line);
		const aligns: string[] = [];
		for (let index = 0; index < count; index += 1) {
			const cell = cells[index] ?? "";
			const left = cell.startsWith(":");
			const right = cell.endsWith(":");
			aligns.push(left && right ? "center" : right ? "right" : left ? "left" : "");
		}
		return aligns;
	};

	// Obsidian 的表格可以省掉首尾竖线，所以按「竖线数量」判断，不要求首尾都有 |
	const pipeCount = (line: string): number => (line.match(/\|/g) ?? []).length;
	const isFenceLine = (line: string): boolean => /^\s*```/.test(line);
	const isTableHeaderLine = (line: string): boolean => pipeCount(line) >= 1 && !isFenceLine(line);
	const continuesTable = (line: string, headerPipes: number): boolean => pipeCount(line) >= Math.max(1, headerPipes) && !isFenceLine(line);
	const isTableSeparator = (line: string): boolean => line.includes("|") && /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && /-/.test(line);

	// 标题 1-6 级各有字号，5/6 级不再借用 4 级
	const headingClass = (level: number): string => `cm-lp-heading${Math.min(level, 6)}`;

	// 列表缩进用固定宽度的占位块：比例字体里空格太窄，嵌套层级看不出来
	class IndentWidget extends WidgetType {
		constructor(private readonly depth: number) {
			super();
		}
		eq(other: IndentWidget): boolean {
			return other.depth === this.depth;
		}
		toDOM(): HTMLElement {
			const span = document.createElement("span");
			span.className = "cm-lp-indent";
			span.style.display = "inline-block";
			span.style.width = `${0.7 * this.depth}rem`;
			return span;
		}
		ignoreEvent(): boolean {
			return true;
		}
	}

	function collectInline(text: string, base: number, ranges: DecorationRange[]): void {
		// 先把被反斜杠转义的字符打码（等长替换），避免强调/链接正则把 \* 当成语法
		const maskedText = text.replace(ERASE_PATTERN, (whole: string) => whole[0] + "\u0000");
		INLINE.lastIndex = 0;
		let match = INLINE.exec(maskedText);
		while (match) {
			const raw = match[0];
			const startIndex = match.index;
			// 反斜杠转义的记号（\* \_ \~ 等）保持字面，不当成格式
			if (startIndex > 0 && text[startIndex - 1] === "\\") {
				match = INLINE.exec(maskedText);
				continue;
			}
			const from = base + startIndex;
			const to = from + raw.length;
			if (match[1]) {
				const imageMatch = /^!\[([^\]]*)\]\(([^)]*)\)$/.exec(raw);
				if (imageMatch) {
					ranges.push({ from, to, deco: Decoration.replace({ widget: new ImageWidget(imageMatch[2].trim(), imageMatch[1]) }) });
				}
			} else if (match[2]) {
				ranges.push({ from, to: from + 1, deco: Decoration.replace({}) });
				ranges.push({ from: from + 1, to: to - 1, deco: Decoration.mark({ class: "cm-lp-code-inline" }) });
				ranges.push({ from: to - 1, to, deco: Decoration.replace({}) });
			} else if (match[3] || match[4]) {
				// ***粗斜体*** 与 ___粗斜体___
				ranges.push({ from, to: from + 3, deco: Decoration.replace({}) });
				ranges.push({ from: from + 3, to: to - 3, deco: Decoration.mark({ class: "cm-lp-strong cm-lp-em" }) });
				ranges.push({ from: to - 3, to, deco: Decoration.replace({}) });
			} else if (match[5]) {
				ranges.push({ from, to: from + 2, deco: Decoration.replace({}) });
				ranges.push({ from: from + 2, to: to - 2, deco: Decoration.mark({ class: "cm-lp-strong" }) });
				ranges.push({ from: to - 2, to, deco: Decoration.replace({}) });
			} else if (match[6]) {
				ranges.push({ from, to: from + 2, deco: Decoration.replace({}) });
				ranges.push({ from: from + 2, to: to - 2, deco: Decoration.mark({ class: "cm-lp-strike" }) });
				ranges.push({ from: to - 2, to, deco: Decoration.replace({}) });
			} else if (match[7]) {
				ranges.push({ from, to: from + 1, deco: Decoration.replace({}) });
				ranges.push({ from: from + 1, to: to - 1, deco: Decoration.mark({ class: "cm-lp-em" }) });
				ranges.push({ from: to - 1, to, deco: Decoration.replace({}) });
			} else if (match[8]) {
				const linkMatch = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(raw);
				if (linkMatch) {
					const textFrom = from + 1;
					const textTo = textFrom + linkMatch[1].length;
					ranges.push({ from, to: textFrom, deco: Decoration.replace({}) });
					ranges.push({ from: textFrom, to: textTo, deco: Decoration.mark({ class: "cm-lp-link" }) });
					ranges.push({ from: textTo, to, deco: Decoration.replace({}) });
				}
			}
			match = INLINE.exec(maskedText);
		}

		// 转义符本身不显示：\* 渲染成 *（和 Obsidian 一致）
		const escapePattern = ERASE_PATTERN;
		escapePattern.lastIndex = 0;
		let escapeMatch = escapePattern.exec(text);
		while (escapeMatch) {
			const escapeFrom = base + escapeMatch.index;
			// 已经被别的装饰覆盖的位置跳过（例如 **粗体里的 \* ** 内部），避免装饰重叠报错
			const overlaps = ranges.some((range) => range.from < escapeFrom + 1 && range.to > escapeFrom);
			if (!overlaps) {
				ranges.push({ from: escapeFrom, to: escapeFrom + 1, deco: Decoration.replace({}) });
			}
			escapeMatch = escapePattern.exec(text);
		}
	}

	function buildDecorations(view: EditorView): ReturnType<typeof Decoration.set> {
		const { state } = view;
		const doc = state.doc;
		const ranges: DecorationRange[] = [];
		const cursorLines = new Set<number>();
		for (const selection of state.selection.ranges) {
			cursorLines.add(doc.lineAt(selection.from).number);
			cursorLines.add(doc.lineAt(selection.to).number);
		}

		// 视口之外的围栏状态也要算上，否则滚动后代码块会错位
		const visible = view.visibleRanges;
		if (!visible.length) return Decoration.none;
		const firstLine = doc.lineAt(visible[0].from).number;
		const lastLine = doc.lineAt(visible[visible.length - 1].to).number;
		let inFence = false;
		for (let lineNumber = 1; lineNumber < firstLine; lineNumber += 1) {
			if (/^\s*```/.test(doc.line(lineNumber).text)) inFence = !inFence;
		}

		for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
			const line = doc.line(lineNumber);
			const text = line.text;
			const editing = cursorLines.has(lineNumber);
			const fence = /^\s*```(?:[\w-]*)\s*$/.exec(text);
			if (fence) {
				if (editing) {
					ranges.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-lp-fence" }) });
				} else {
					ranges.push({ from: line.from, to: line.to, deco: Decoration.replace({}) });
				}
				inFence = !inFence;
				continue;
			}
			if (inFence) {
				ranges.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-lp-code" }) });
				if (!editing) {
					let body = text;
					let base = line.from;
					const indent = /^\s*/.exec(text)?.[0] ?? "";
					if (indent) {
						body = text.slice(indent.length);
						base = line.from + indent.length;
					}
					collectInline(body, base, ranges);
				}
				continue;
			}

			// 表格：表头行 + 分隔行 + 若干含竖线的行，整块渲染成 <table>
			if (isTableHeaderLine(text) && lineNumber < doc.lines) {
				const headerPipes = pipeCount(text);
				const nextLine = doc.line(lineNumber + 1);
				if (isTableSeparator(nextLine.text)) {
					let endLine = lineNumber + 1;
					const rows: TableCell[][] = [splitRow(text)];
					while (endLine < doc.lines && continuesTable(doc.line(endLine + 1).text, headerPipes)) {
						endLine += 1;
						rows.push(splitRow(doc.line(endLine).text));
					}
					const blockFrom = line.from;
					const blockTo = doc.line(endLine).to;
					const cursorInside = view.state.selection.ranges.some((range) => range.from <= blockTo && range.to >= blockFrom);
					if (cursorInside) {
						// 光标在表格里：保持源码可编辑，只加点等宽样式（整块替换由 tableBlockField 负责）
						for (let index = lineNumber; index <= endLine; index += 1) {
							const current = doc.line(index);
							ranges.push({ from: current.from, to: current.from, deco: Decoration.line({ class: "cm-lp-table-src" }) });
						}
					}
					lineNumber = endLine;
					continue;
				}
			}

			const rule = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.exec(text);
			if (rule && !editing) {
				// 块级 widget 会干扰 CodeMirror 的高度测量，这里改成「行级样式 + 隐藏原文」
			ranges.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-lp-rule-line" }) });
			ranges.push({ from: line.from, to: line.to, deco: Decoration.replace({}) });
				continue;
			}

			let offset = 0;
			const heading = /^(#{1,6})\s+/.exec(text);
			if (heading) {
				const level = heading[1].length;
				ranges.push({ from: line.from, to: line.from, deco: Decoration.line({ class: ` ${headingClass(level)}` }) });
				if (!editing) {
					ranges.push({ from: line.from, to: line.from + heading[0].length, deco: Decoration.replace({}) });
				}
				offset = heading[0].length;
			} else {
				const quote = /^(\s*(?:>\s?)+)/.exec(text);
				if (quote) {
					// >> 这种嵌套引用，层级越深左边留白越多
					const quoteDepth = Math.min(3, (quote[1].match(/>/g) ?? []).length);
					ranges.push({ from: line.from, to: line.from, deco: Decoration.line({ class: quoteDepth > 1 ? `cm-lp-quote cm-lp-quote-${quoteDepth}` : "cm-lp-quote" }) });
					if (!editing && quote[1].length) {
						ranges.push({ from: line.from, to: line.from + quote[1].length, deco: Decoration.replace({}) });
					}
					offset = quote[1].length;
				}
				const task = /^(\s*)([-*+])(\s+)\[([ xX])\]\s+/.exec(text);
				const bullet = /^(\s*)([-*+])(\s+)/.exec(text);
				const ordered = /^(\s*)(\d+[.)])(\s+)/.exec(text);
				// 嵌套列表：把缩进空格换成固定宽度的占位块，层级才看得出来
				const indentLength = /^\s*/.exec(text)?.[0].length ?? 0;
				if (!editing && indentLength >= 2 && (task || bullet || ordered)) {
					ranges.push({ from: line.from, to: line.from + indentLength, deco: Decoration.replace({ widget: new IndentWidget(Math.floor(indentLength / 2)) }) });
				}
				if (task) {
					const start = line.from + offset;
					if (!editing) {
						ranges.push({ from: start, to: start + task[0].length - (task[1]?.length ?? 0), deco: Decoration.replace({ widget: new TaskWidget(task[4].toLowerCase() === "x") }) });
					}
					offset = Math.max(offset, task[0].length);
				} else if (bullet) {
					const markerFrom = line.from + offset + bullet[1].length;
					if (!editing) {
						ranges.push({ from: markerFrom, to: markerFrom + bullet[2].length, deco: Decoration.replace({ widget: new BulletWidget("") }) });
					}
					offset = Math.max(offset, bullet[0].length);
				} else if (ordered) {
					const markerFrom = line.from + offset + ordered[1].length;
					if (!editing) {
						ranges.push({ from: markerFrom, to: markerFrom + ordered[2].length, deco: Decoration.mark({ class: "cm-lp-ordered" }) });
					}
					offset = Math.max(offset, ordered[0].length);
				}
			}

			if (!editing && offset < text.length) {
				collectInline(text.slice(offset), line.from + offset, ranges);
			}
		}

		return Decoration.set(
			ranges.map((range): Range<DecorationInstance> => range.deco.range(range.from, range.to)),
			true,
		);
	}

	// 表格 widget 需要知道当前视图，才能把光标塞回源码里
	let activeView: EditorView | null = null;

	// 把全文里的表格块扫出来（表头行 + 分隔行 + 若干 | 行）
	function collectTableBlocks(state: EditorState): { from: number; to: number; head: TableCell[]; body: TableCell[][]; aligns: string[]; raw: string }[] {
		const blocks: { from: number; to: number; head: TableCell[]; body: TableCell[][]; aligns: string[]; raw: string }[] = [];
		const doc = state.doc;
		for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
			const line = doc.line(lineNumber);
			if (!isTableHeaderLine(line.text) || lineNumber >= doc.lines) continue;
			const headerPipes = pipeCount(line.text);
			const next = doc.line(lineNumber + 1);
			if (!isTableSeparator(next.text)) continue;
			let endLine = lineNumber + 1;
			const rows: TableCell[][] = [splitRow(line.text)];
			while (endLine < doc.lines && continuesTable(doc.line(endLine + 1).text, headerPipes)) {
				endLine += 1;
				rows.push(splitRow(doc.line(endLine).text));
			}
			const head = rows[0];
			const last = doc.line(endLine);
			blocks.push({ from: line.from, to: last.to, head, body: rows.slice(1), aligns: parseAligns(next.text, head.length), raw: doc.sliceString(line.from, last.to) });
			lineNumber = endLine;
		}
		return blocks;
	}

	function buildTableBlockDecorations(state: EditorState): DecorationSet {
		const ranges: Range<DecorationInstance>[] = [];
		for (const block of collectTableBlocks(state)) {
			const cursorInside = state.selection.ranges.some((range) => range.from <= block.to && range.to >= block.from);
			// 光标进到表格里就露出源码，让用户直接改
			if (cursorInside) continue;
			ranges.push(Decoration.replace({ widget: new TableWidget(block.head, block.body, block.aligns, block.raw, block.from), block: true }).range(block.from, block.to));
		}
		return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
	}

	// block 装饰必须由 StateField 提供：放到 ViewPlugin 里 CodeMirror 会直接抛
	// RangeError: Block decorations may not be specified via plugins
	const tableBlockField = StateField.define<DecorationSet>({
		create(state) {
			return buildTableBlockDecorations(state);
		},
		update(value, tr) {
			return tr.docChanged || tr.selection ? buildTableBlockDecorations(tr.state) : value;
		},
		provide: (field) => EditorView.decorations.from(field),
	});

	const livePreviewPlugin = ViewPlugin.fromClass(
		class {
			decorations: ReturnType<typeof Decoration.set>;
			constructor(view: EditorView) {
				this.decorations = buildDecorations(view);
			}
			update(update: { view: EditorView; docChanged: boolean; selectionSet: boolean; viewportChanged: boolean }) {
				if (update.docChanged || update.selectionSet || update.viewportChanged) {
					this.decorations = buildDecorations(update.view);
				}
			}
		},
		{ decorations: (plugin) => plugin.decorations },
	);

	const themeSpec: Record<string, Record<string, string>> = {
			"&": { color: "inherit", backgroundColor: "transparent" },
			".cm-scroller": {
				fontFamily: "inherit",
				lineHeight: "1.9",
				overflow: "auto",
			},
			".cm-content": { padding: "1.5rem 1.6rem", caretColor: "#2f7fbc" },
			".cm-line": { padding: "0 0" },
			// 行盒上不要用 margin（CodeMirror 量不到，点行底部会落到下一行），竖向间距一律用 padding
			".cm-cursor": { borderLeftWidth: "2px", borderLeftColor: "#2f7fbc" },
			"&.cm-focused": { outline: "none" },
			".cm-selectionBackground, ::selection": { backgroundColor: "#bcdcf54d" },
			".cm-lp-heading1": { fontSize: "1.6rem", fontWeight: "700", lineHeight: "1.5", paddingTop: "0.4rem" },
			".cm-lp-heading2": { fontSize: "1.36rem", fontWeight: "700", lineHeight: "1.55", paddingTop: "0.35rem" },
			".cm-lp-heading3": { fontSize: "1.16rem", fontWeight: "700", lineHeight: "1.6" },
			".cm-lp-heading4": { fontSize: "1.04rem", fontWeight: "700", lineHeight: "1.65" },
			".cm-lp-heading5": { fontSize: "0.98rem", fontWeight: "700", lineHeight: "1.7" },
			".cm-lp-heading6": { fontSize: "0.94rem", fontWeight: "700", lineHeight: "1.7" },
			".cm-lp-quote": { paddingLeft: "0.9rem", borderLeft: "3px solid #cfe0ec", color: "#5b6b74" },
			".cm-lp-quote-2": { paddingLeft: "1.75rem" },
			".cm-lp-quote-3": { paddingLeft: "2.6rem" },
			".cm-lp-code": {
				paddingLeft: "1rem",
				borderLeft: "3px solid #e2ebf0",
				backgroundColor: "#f4f8fb",
				fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
				fontSize: "0.86rem",
				lineHeight: "1.75",
			},
			".cm-lp-fence": { color: "#9fb0b8", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.8rem" },
			".cm-lp-bullet": { color: "#2f7fbc", paddingRight: "0.15rem" },
			".cm-lp-task": { color: "#2f7fbc", paddingRight: "0.2rem" },
			".cm-lp-task.is-checked": { color: "#3d9a6a" },
			".cm-lp-ordered": { color: "#2f7fbc", fontWeight: "600" },
			".cm-lp-strong": { fontWeight: "700" },
			".cm-lp-em": { fontStyle: "italic" },
			".cm-lp-strike": { textDecoration: "line-through", opacity: "0.75" },
			".cm-lp-code-inline": {
				padding: "0.1em 0.32em",
				borderRadius: "0.3rem",
				backgroundColor: "#eef4f8",
				fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
				fontSize: "0.88em",
			},
			".cm-lp-link": { color: "#2f7fbc", textDecoration: "underline" },
			".cm-lp-rule": { display: "none" },
			".cm-lp-rule-line": { borderTop: "1px solid #e2ebf0", padding: "0.62rem 0" },
			".cm-lp-image": { display: "inline-block", maxWidth: "100%", maxHeight: "22rem", borderRadius: "0.6rem", verticalAlign: "bottom" },
			".cm-lp-table-wrap": { padding: "0.35rem 0 0.5rem" },
			".cm-lp-table": { borderCollapse: "collapse", width: "100%", fontSize: "0.92rem", lineHeight: "1.6" },
			".cm-lp-table th, .cm-lp-table td": { border: "1px solid #dce7eb", padding: "0.42rem 0.6rem", verticalAlign: "top" },
			".cm-lp-table th": { backgroundColor: "#f2f7fb", fontWeight: "700" },
			".cm-lp-table tbody tr:nth-child(even)": { backgroundColor: "#fafcfe" },
			".cm-lp-table-src": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.88rem", color: "#5b6b74" },
			".cm-lp-image-fallback": { color: "#8fa2ac", fontSize: "0.86rem" },
		};

	// 暗色把覆盖项并进同一个 theme（两个 EditorView.theme 抢同一选择器时后注入的不一定赢）
	if (options.dark) {
		Object.assign(themeSpec, {
			".cm-content": { padding: "1.5rem 1.6rem", caretColor: "#8fbde8", color: "#dbe6ea" },
			".cm-cursor": { borderLeftWidth: "2px", borderLeftColor: "#8fbde8" },
			".cm-selectionBackground, ::selection": { backgroundColor: "#8fbde833" },
			".cm-lp-quote": { paddingLeft: "0.9rem", borderLeft: "3px solid #4c5c65", color: "#a8b8c0" },
			".cm-lp-quote-2": { paddingLeft: "1.75rem" },
			".cm-lp-quote-3": { paddingLeft: "2.6rem" },
			".cm-lp-code": { paddingLeft: "1rem", borderLeft: "3px solid #3b4a53", backgroundColor: "#26323a", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.86rem", lineHeight: "1.75", color: "#cfe0e8" },
			".cm-lp-fence": { color: "#829198", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.8rem" },
			".cm-lp-code-inline": { backgroundColor: "#2d3941", color: "#e6eef2" },
			".cm-lp-rule-line": { borderTop: "1px solid #3b4a53", padding: "0.62rem 0" },
			".cm-lp-bullet": { color: "#8fbde8", paddingRight: "0.15rem" },
			".cm-lp-task": { color: "#8fbde8", paddingRight: "0.2rem" },
			".cm-lp-task.is-checked": { color: "#5fbf8d" },
			".cm-lp-ordered": { color: "#8fbde8", fontWeight: "600" },
			".cm-lp-link": { color: "#8fbde8", textDecoration: "underline" },
			".cm-lp-table th, .cm-lp-table td": { border: "1px solid #3b4a53", padding: "0.42rem 0.6rem", verticalAlign: "top" },
			".cm-lp-table th": { backgroundColor: "#26323a", fontWeight: "700" },
			".cm-lp-table tbody tr:nth-child(even)": { backgroundColor: "#1d262c" },
			".cm-lp-table-src": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.88rem", color: "#a8b8c0" },
			".cm-lp-image-fallback": { color: "#829198", fontSize: "0.86rem" },
		});
	}

	const baseTheme = EditorView.theme(themeSpec, { dark: options.dark });

	const insertImage = async (view: EditorView, file: File): Promise<void> => {
		try {
			const url = await options.onImage(file);
			const alt = /^(image|clipboard|blob|paste[0-9-]*)$/i.test(file.name.replace(/\.[^.]+$/, "")) || !file.name ? "图片" : file.name.replace(/\.[^.]+$/, "");
			view.dispatch(view.state.replaceSelection(`![${alt}](${url})`));
			view.focus();
		} catch (error) {
			options.onNotice?.(error instanceof Error ? error.message : "图片上传失败。", "error");
		}
	};

	/** 用 Markdown 记号包住选区（没选中就插占位文字）。 */
	const wrapSelection = (before: string, after: string, placeholder: string) => (view: EditorView): boolean => {
		const { from, to } = view.state.selection.main;
		const selected = view.state.sliceDoc(from, to) || placeholder;
		view.dispatch({
			changes: { from, to, insert: `${before}${selected}${after}` },
			selection: { anchor: from + before.length, head: from + before.length + selected.length },
		});
		view.focus();
		return true;
	};

	const imageEvents = EditorView.domEventHandlers({
		paste: (event, view) => {
			const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
			if (!files.length) return false;
			event.preventDefault();
			void insertImage(view, files[0]);
			return true;
		},
		drop: (event, view) => {
			const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
			if (!files.length) return false;
			event.preventDefault();
			void insertImage(view, files[0]);
			return true;
		},
	});

	const state = stateModule.EditorState.create({
		doc: initial,
		extensions: [
			history(),
			drawSelection(),
			EditorView.lineWrapping,
			keymap.of([
				{ key: "Mod-b", run: wrapSelection("**", "**", "加粗文字") },
				{ key: "Mod-i", run: wrapSelection("*", "*", "斜体文字") },
				{ key: "Mod-k", run: wrapSelection("[", "](https://)", "链接文字") },
				...defaultKeymap,
				...historyKeymap,
				indentWithTab,
			]),
			tableBlockField,
			livePreviewPlugin,
			imageEvents,
			baseTheme,
			EditorView.updateListener.of((update) => {
				if (update.docChanged) options.onChange(update.state.doc.toString());
			}),
		],
	});

	const view = new EditorView({ state, parent: host });
	activeView = view;
	return {
		getValue: () => view.state.doc.toString(),
		getSelectionText: () => {
			const { from, to } = view.state.selection.main;
			return view.state.sliceDoc(from, to);
		},
		replaceSelection: (value: string) => {
			view.dispatch(view.state.replaceSelection(value));
			view.focus();
		},
		focus: () => view.focus(),
		destroy: () => {
			if (activeView === view) activeView = null;
			view.destroy();
		},
	};
}
