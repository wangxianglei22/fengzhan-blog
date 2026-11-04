# 文章与日记写作指南

尚未部署网站时，先按 [从零部署完整指南](DEPLOYMENT.zh-CN.md) 完成初始配置，再回来查阅写作格式。

本博客会自动读取 `src/content/posts/` 中的每个 Markdown 文件：**一个 `.md` 文件就是一篇文章**。你可以放多个文件，也可以给文章建立独立文件夹；无需修改文章总览、首页或导航的代码。文件最前面的 `---` 区块叫“元数据”，网站从中读取标题、日期、分类、封面等信息；第二条 `---` 后面是正文。

可复制的模板放在 [文章模板](../templates/post-template.md) 和 [日记模板](../templates/diary-template.md)。模板故意放在 `src/content/` 之外，避免被识别为已经发布的内容。

## 一、创建一篇文章

1. 在自己的项目根目录打开 PowerShell，例如 `D:\Projects\my-blog`。
2. 选一个只含小写英文字母、数字和连字符的文件名，例如 `my-first-post`。文件名会成为网址的一部分，请保持唯一；以后改名，原网址也会改变。
3. 复制模板。没有本地封面时，用单文件方式：

   ```powershell
   Copy-Item .\templates\post-template.md .\src\content\posts\my-first-post.md
   ```

   若只通过本地文件写作，需要把封面和正文图片放在文章旁边时，也可以使用文件夹方式。**当前网页后台只列出文章目录下平铺的 `.md` 文件；希望在后台管理的文章，请使用上面的单文件方式，并将图片放在 `public/images/`。** 文件夹方式如下：

   ```powershell
   New-Item -ItemType Directory .\src\content\posts\my-first-post
   Copy-Item .\templates\post-template.md .\src\content\posts\my-first-post\index.md
   ```

   这两种方式都会生成 `/posts/my-first-post/`；**同一篇文章只选一种方式**，不要同时创建同名文件和文件夹。即使文章标题不同，文件名或文件夹名也必须不同。
   如果只需要单文件文章，也可以用现成的生成命令代替 `Copy-Item`：

   ```powershell
   corepack pnpm new-post my-first-post "我的第一篇文章"
   ```

   命令会按模板创建 `my-first-post.md`，自动填入当天日期，并保持 `draft: true`。第一个参数是网址用的英文文件名，不用写 `.md`；第二个参数是可选的文章标题。
4. 用 VS Code 打开新文件，修改 `title`、`published`、`description` 等字段，并在第二条 `---` 后写正文。保存为 UTF-8 编码的 `.md` 文件。
5. 本地预览：在项目根目录运行 `corepack pnpm dev`，打开终端显示的地址。新建文件通常会自动更新；如果没有出现，停止并重新运行开发服务器。
6. 写好后将 `draft: true` 改为 `draft: false`。运行 `corepack pnpm build`，确认构建成功；需要检查正式构建的样子，可运行 `corepack pnpm preview`。
7. 用 Git 提交并推送新文章，网站完成新一轮部署后才会更新。例如：

   ```powershell
   git add src/content/posts/my-first-post.md
   git commit -m "发布第一篇文章"
   git push
   ```

   如果使用文件夹方式，把 `git add` 的路径换成 `src/content/posts/my-first-post/`，这样封面和正文图片会一起提交。

第二篇文章只需重复以上步骤，改用新的文件名。文章总览会自动汇总所有已发布的文件；首页按 `published` 从新到旧显示，每页最多 8 篇。分类和标签也来自各文章的元数据。

## 二、文章元数据怎么写

元数据必须从文件**第一行**的 `---` 开始，以单独一行的 `---` 结束。字段名使用英文且区分拼写。`#` 开头的说明行只是注释，网站会忽略。不要把 Word 文档或 `.txt` 文件直接放入文章目录；这里识别的是 `.md`。

| 字段 | 必填 | 格式与作用 |
| --- | --- | --- |
| `title` | 是 | 文章标题。含 `:`、`#` 等特殊符号时用双引号包住，例如 `title: "C++: 第一课"`。页面会自动显示标题。 |
| `published` | 是 | 发布日期，写成 `YYYY-MM-DD`，例如 `2026-01-01`。不要加引号；首页和时间线依它排序。 |
| `updated` | 否 | 最后修改日期，格式同上。没有更新记录就删除此行或保留模板中的注释；它不会改变文章排序。 |
| `description` | 否 | 一句话摘要，显示在文章卡片中，也用于页面描述。不写可用 `description: ""`。 |
| `image` | 否 | 封面图片路径；`image: ""` 表示不显示封面。详见下一节。 |
| `tags` | 否 | 多个标签写成数组，例如 `tags: ["学习", "计算机"]`；没有标签写 `tags: []`。 |
| `category` | 否 | 一篇文章只能填一个分类，例如 `category: "学习笔记"`；留空会归入“未分类”。相同文字会合并为同一类。 |
| `draft` | 否 | 布尔值 `true` / `false`，不要加引号。`true` 不会部署到正式网站；模板默认是 `true`。 |
| `hidden` | 否 | `true` 从常规列表隐藏，但已发布的详情仍生成、原链接仍可访问；不是私密保护。默认 `false`。 |
| `lang` | 否 | 正文语言，例如 `zh_CN`、`en`；留空时使用网站默认语言。 |

`prevTitle`、`prevSlug`、`nextTitle`、`nextSlug` 是网站内部自动计算的字段，**不要写进文章**。必填字段缺失或字段类型写错会让构建报错；例如 `tags` 要用数组，`draft` 不能写成字符串 `"false"`。

## 三、封面和正文图片

使用网页后台时，推荐文章保持平铺，图片放到 `public/images/`，正文填写 `![图片说明](/images/photo.jpg)`。只通过本地文件管理文章时，也可以使用独立文件夹，图片跟 `index.md` 放在一起：

```text
src/content/posts/
└── my-first-post/
    ├── index.md
    ├── cover.jpg
    └── photo.jpg
```

这时元数据填 `image: "./cover.jpg"`，正文中插入 `![图片说明](./photo.jpg)`。图片文件名、扩展名和大小写必须与路径一致。

也可以把图片放入 `public/images/`，然后写 `image: "/images/cover.jpg"`；远程图片写完整的 `https://...` 地址。没有封面就保留 `image: ""`。复制文章文件时，记得一并复制它引用的本地图片。

## 四、正文和草稿

第二条 `---` 之后是普通 Markdown。标题已由 `title` 生成，所以正文建议从 `##` 小标题开始。段落之间空一行；可使用列表、引用、代码块、链接和图片。例如：

````md
## 今天学到的内容

第一段文字，**重点加粗**。

- 第一项
- 第二项

```python
print("hello")
```
````

文章的 `draft: true` 在本地开发模式下仍可能看得到，方便你预览；正式构建会排除它。**草稿只是控制网站是否展示，不会隐藏仓库里的源文件**。不要把密码、密钥或不想提交到仓库的私人内容写入草稿。

## 五、创建日记

日记同样是一篇一个文件，但要放在 `src/content/diary/`，不能放进文章目录。复制模板的示例：

```powershell
Copy-Item .\templates\diary-template.md .\src\content\diary\2026-01-01-my-day.md
```

修改 `title`、`date`、`mood`、`moodLabel`、`excerpt`，再写正文。`date` 是心情日历上的日期，格式为 `YYYY-MM-DD`；当天有日记时，点击日历日期会打开对应页面。同一天最好只写一篇日记，因为日历上的日期只链接到其中一篇。`mood` 可以是表情，例如 `"😊"`。`pinned: true` 会把它加入“置顶日记”卡片，多篇置顶可左右切换；`false` 则不显示在置顶区。日记模板的 `draft: true` 在本地和正式网站都不展示，需要改成 `false` 才能预览和发布。

日记封面 `cover: ""` 表示不用封面。若使用项目图片，将文件放在 `src/assets/images/`，`cover` 只填文件名，例如 `cover: "my-day.jpg"`；也可填 `/` 开头的 `public/` 路径或完整 `https://...` 地址。日记的 `tags` 格式与文章相同。

| 日记字段 | 必填 | 格式与作用 |
| --- | --- | --- |
| `title` | 是 | 日记标题；页面标题和置顶卡片会显示它。 |
| `date` | 是 | 日记日期，格式为 `YYYY-MM-DD`，不要加引号。它决定日历位置和排序。 |
| `mood` | 否 | 心情表情，例如 `"😊"`；日历上会显示。 |
| `moodLabel` | 否 | 心情文字，例如 `"开心"`；置顶卡片和详情页会显示。 |
| `excerpt` | 否 | 简短摘要；置顶卡片和详情页会显示。 |
| `cover` | 否 | 置顶卡片和详情页的封面；留空写 `cover: ""`。 |
| `tags` | 否 | 标签数组，例如 `tags: ["生活", "学习"]`，无标签写 `[]`。 |
| `pinned` | 否 | `true` 出现在置顶卡片，`false` 不置顶；不要加引号。 |
| `draft` | 否 | `true` 为草稿，日记页和正式网站都不展示；发布时改为 `false`。 |
| `hidden` | 否 | `true` 从日历与日记列表隐藏，但已发布的详情链接仍可访问；不能用于保存秘密。 |

置顶目前通过文件中的 `pinned` 字段维护。当前网页后台保存日记会写入 `pinned: false`；需要置顶时，在最后一次后台保存后修改文件为 `true` 并提交，再次通过后台保存时需留意该字段。

日记写好后同样运行 `corepack pnpm build`，然后用 `git add src/content/diary/你的文件名.md`、`git commit`、`git push` 发布。

## 六、常见问题

- **新增文件没出现：**确认 `.md` 位于正确目录，前后两条 `---` 完整，必填日期格式正确；正式网站还要检查 `draft: false`、是否提交图片，以及部署是否完成。本地开发模式可重启服务器。
- **封面构建报错：**检查图片是否已放在对应位置，路径是否以 `./` 或 `/` 正确开头，文件名与扩展名是否完全一致。
- **文章分类显示“未分类”：**检查 `category` 是否为空；标签则由 `tags` 数组决定，二者互不代替。
- **文章顺序不对：**检查 `published`；`updated` 不控制首页和时间线顺序。
- **改名后旧链接失效：**文章网址取自文件名或文件夹名，确定网址后尽量不要改名。
- **写了文档却没自动更新线上网站：**本站是静态构建，文件不会在访客浏览时实时读取；修改必须重新构建并部署。
- **删除全部示例后的构建提醒：**文章或日记目录暂时为空时，Astro 可能提示内容集合为空；只要 `corepack pnpm build` 最终成功，就可以继续使用。新增第一篇内容后提醒会消失。
