# 模板使用文档

第一次使用请先看 [从零部署完整指南](DEPLOYMENT.zh-CN.md)。快速开始和默认状态见 [README](../README.md)。以下内容介绍功能与写作格式；模板中的示例可自行删除。


本文档对应当前仓库的博客版本，适合第一次维护这个项目时查阅。博客使用 Astro + Tailwind CSS 构建，内容主要写在 Markdown 文件中，部署到 Cloudflare Pages；文章、日记和站点模块也可以通过 /admin/ 后台编辑。

## 1. 项目简介

这是一个面向个人展示的二次元风格静态博客，当前包含：

- 首页个人介绍、头像、运行时间、日历、文章摘要和互动组件。
- 文章总览、分类、标签、搜索、时间线和文章详情页。
- 日记页面、心情日历、置顶日记卡片和日记详情页。
- 本地音乐歌单，访客可以播放、暂停、切歌和调节音量。
- 关于页面、个人资料、联系方式和荣誉墙。
- Twikoo 留言板，访客可以评论，管理员可以在 Twikoo 管理界面审核。
- 主题颜色、浅色/深色模式、背景粒子动画、响应式布局。
- /admin/ 内容后台，用于编辑文章、日记、音乐、荣誉墙、友链和留言板配置。
- Pagefind 静态搜索；RSS 和站点地图由构建过程生成。

项目的内容模型是“文件即内容”：

1. 在指定目录新增或修改 Markdown 文件。
2. Git 提交并推送到 GitHub。
3. Cloudflare Pages 自动构建。
4. 构建完成后，网站显示新的内容。

后台的保存操作本质上也是向 GitHub 提交文件，所以后台保存后仍需要等待 Cloudflare Pages 完成一次部署。

## 2. 技术和目录结构

主要技术：

- Astro 5：页面和静态构建。
- Tailwind CSS：基础样式工具。
- Svelte：部分交互组件。
- Astro Content Collections：文章和日记的数据校验。
- Markdown：文章、日记和站点数据文件。
- Pagefind：构建后的全文搜索。
- Cloudflare Pages Functions：后台 API。
- GitHub Contents API：后台读取和写入仓库文件。
- Twikoo：留言板服务。

重要目录：

~~~text
blog-template/
├─ src/
│  ├─ config.ts                 # 站点标题、导航、头像、联系方式、留言服务地址
│  ├─ content/
│  │  ├─ posts/                 # 文章，每个 .md 或文件夹是一篇文章
│  │  ├─ diary/                 # 日记，每个 .md 是一篇日记
│  │  └─ spec/about.md          # 关于页面的正文
│  ├─ data/
│  │  ├─ music.md               # 音乐歌单
│  │  ├─ honors.md              # 荣誉墙
│  │  ├─ guestbook.md           # 留言板标题、说明和 Twikoo 地址
│  │  └─ quotes.ts              # 互动组件使用的语录
│  ├─ pages/                    # 页面路由
│  └─ components/               # 页面组件和交互组件
├─ public/
│  ├─ audio/                    # 本地音乐文件
│  └─ favicon/                  # 浏览器图标和头像
├─ templates/
│  ├─ post-template.md          # 文章模板
│  └─ diary-template.md         # 日记模板
├─ functions/api/admin/         # Cloudflare Pages 后台 API
├─ docs/                        # 项目说明文档
└─ package.json                 # 命令和依赖
~~~

不要把密码、GitHub Token、私钥或其他私有信息写入 src、public、Markdown 文件或提交到 GitHub。

## 3. 本地运行和检查

### 3.1 环境要求

- Node.js 20 或更高版本。
- pnpm 9 或更高版本。
- Git。
- 一个 GitHub 仓库。
- 如果要运行后台，还需要 Cloudflare Pages Functions 的环境变量。

检查是否已经安装：

~~~powershell
node --version
corepack --version
corepack pnpm --version
git --version
~~~

如果电脑启用了 Corepack，可以直接使用 corepack pnpm。第一次安装依赖：

~~~powershell
corepack pnpm install
~~~

### 3.2 开发服务器

在项目根目录 blog-template 中运行：

~~~powershell
corepack pnpm dev
~~~

浏览器打开终端显示的地址，通常是：

~~~text
http://localhost:4321/
~~~

停止开发服务器：回到终端按 Ctrl + C。

常用命令：

| 命令 | 用途 |
| --- | --- |
| corepack pnpm install | 安装或更新依赖 |
| corepack pnpm dev | 启动本地开发服务器 |
| corepack pnpm check | 检查 Astro 类型和内容数据 |
| corepack pnpm build | 执行正式构建并生成 Pagefind 搜索索引 |
| corepack pnpm preview | 预览刚刚生成的 dist |
| corepack pnpm format | 使用 Biome 格式化 src |
| corepack pnpm new-post slug "标题" | 按模板新建文章 |

如果 4321 被占用，Astro 会自动尝试下一个端口。以终端最后显示的地址为准，不要同时启动多个 dev 进程。

## 4. 修改个人资料和主题

大部分基础资料位于 src/config.ts。

### 4.1 网站标题和运行时间

修改 siteConfig：

~~~ts
title: "枫栈",
subtitle: "",
siteStartedAt: "2026-11-04",
lang: "zh_CN",
~~~

siteStartedAt 决定首页运行时间的起点，请填写网站正式上线日期，格式为 YYYY-MM-DD。subtitle 留空时不显示副标题。

首页侧栏的「站点统计」里，访问次数与页面浏览来自 Cloudflare Web Analytics，配置方法见 [部署文档的 8.4 节](DEPLOYMENT.zh-CN.md)。未配置时这两个数字显示「—」，并标注「未接入访问统计」，不会用本地假数据替代。

### 4.2 头像

头像路径可以指向 src/assets 中的图片，也可以指向 public 路径。当前浏览器标签图标使用 public/images/avatar.svg。

替换头像时要同时检查：

- src/config.ts 中的 profileConfig.avatar。
- public/images/avatar.svg。
- 如果页面使用了其他头像图片，检查对应组件中的路径。

建议使用正方形图片，文件名使用英文、数字、短横线，避免路径编码问题。

### 4.3 导航栏

导航配置在 src/config.ts 的 navBarConfig.links。每一项包含 name 和 url，例如：

~~~ts
{
  name: "日记",
  url: "/diary/",
}
~~~

修改后重新启动本地开发服务器，确认链接地址以 / 结尾。

### 4.4 联系方式

联系方式也在 src/config.ts 的 profileConfig.links。每项通常包含：

~~~ts
{
  name: "Bilibili",
  icon: "fa6-brands:bilibili",
  url: "https://space.bilibili.com/你的编号",
}
~~~

icon 使用 Iconify 图标名称。修改联系方式时，检查 url 是否是完整的 https 地址。

### 4.5 关于页面

关于页面正文在 src/content/spec/about.md。个人资料卡片中的基本信息和兴趣内容在 src/pages/about.astro 中维护。

修改后可以先运行 dev，在 /about/ 查看效果，再提交。

## 5. 写文章

### 5.1 创建文章文件

文章放在 src/content/posts/。最简单的方式：

~~~powershell
corepack pnpm new-post my-first-post "我的第一篇文章"
~~~

命令会生成一个 Markdown 文件，并默认写入 draft: true。也可以复制模板：

~~~powershell
Copy-Item .\templates\post-template.md .\src\content\posts\my-first-post.md
~~~

文件名会成为网址的一部分。例如：

~~~text
src/content/posts/my-first-post.md
网址：/posts/my-first-post/
~~~

文件名建议只使用小写英文、数字和短横线，并且保持唯一。发布后尽量不要改文件名，否则旧链接会失效。

### 5.2 文章模板

~~~yaml
---
title: "文章标题"
published: 2026-01-01
updated: 2026-01-01
description: "文章摘要"
image: ""
tags: ["学习", "计算机"]
category: "学习笔记"
draft: false
hidden: false
lang: "zh_CN"
---

## 第一部分

在这里写正文。
~~~

字段说明：

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| title | 是 | 页面标题。包含冒号或 # 等符号时使用引号。 |
| published | 是 | 发布日期，格式为 YYYY-MM-DD。文章按它从新到旧排序。 |
| updated | 否 | 最后修改日期，只用于显示更新时间。 |
| description | 否 | 列表卡片和页面摘要。 |
| image | 否 | 封面路径；没有封面使用空字符串。 |
| tags | 否 | 标签数组，例如 ["学习", "生活"]。 |
| category | 否 | 单个分类，例如 "学习笔记"。 |
| draft | 否 | true 为草稿；正式构建不会展示。 |
| hidden | 否 | true 时从首页、总览、分类、标签和 RSS 隐藏，但原文章链接仍可访问。 |
| lang | 否 | 文章语言，例如 zh_CN、en。 |

draft 和 hidden 的区别：

- draft：尚未发布的草稿，正式网站不会生成可见内容。
- hidden：文章已经存在，但不希望出现在公开列表；知道原链接的人仍然可以打开。

文章正文从第二个 --- 后开始，使用标准 Markdown。支持标题、列表、引用、表格、代码块、图片、链接、数学公式以及项目中启用的扩展语法。

### 5.3 图片

推荐为每篇文章建立独立文件夹：

~~~text
src/content/posts/my-first-post/
├─ index.md
├─ cover.jpg
└─ photo.jpg
~~~

index.md 中：

~~~yaml
image: "./cover.jpg"
~~~

正文中：

~~~md
![图片说明](./photo.jpg)
~~~

也可以将图片放在 public/images/，然后使用：

~~~yaml
image: "/images/cover.jpg"
~~~

图片文件名、扩展名和大小写必须完全一致。

### 5.4 发布文章

本地检查：

~~~powershell
corepack pnpm check
corepack pnpm build
~~~

确认 draft 已改为 false 后提交：

~~~powershell
git add src/content/posts/my-first-post.md
git commit -m "发布第一篇文章"
git push origin main
~~~

如果文章使用文件夹，把 git add 的路径改为对应文件夹。

## 6. 写日记

日记放在 src/content/diary/。复制模板：

~~~powershell
Copy-Item .\templates\diary-template.md .\src\content\diary\2026-01-01-my-day.md
~~~

日记模板：

~~~yaml
---
title: "今天的记录"
date: 2026-01-01
mood: "😊"
moodLabel: "心情不错"
excerpt: "今天想记录的一句话"
cover: ""
tags: ["生活"]
pinned: false
draft: false
hidden: false
---

## 今天的记录

在这里写日记正文。
~~~

字段说明：

- title：日记标题。
- date：日记日期，格式为 YYYY-MM-DD。日历会根据它定位。
- mood：显示在日历和卡片上的表情。
- moodLabel：心情说明。
- excerpt：日记摘要。
- cover：封面地址；没有封面使用空字符串。
- tags：日记标签数组。
- pinned：true 会加入首页或日记页的置顶日记卡片。
- draft：true 时不显示。
- hidden：true 时不出现在日记列表，但详情链接仍可访问。

日历点击规则：有日记的日期可以跳转到对应日记。建议同一天只写一篇，因为日期是日历定位的依据。

日记完成后：

~~~powershell
corepack pnpm check
corepack pnpm build
git add src/content/diary/2026-01-01-my-day.md
git commit -m "新增日记"
git push origin main
~~~

## 7. 添加本地音乐

博客使用本地音频，不依赖在线音乐链接。

### 7.1 添加音频文件

把音频放进：

~~~text
public/audio/
~~~

支持常见的 mp3、m4a、ogg、wav、flac、aac 文件。音频文件会进入 Git 仓库并参与部署，文件越多、体积越大，构建和下载时间越长。建议只放自己拥有使用权的音乐，并控制文件大小。

### 7.2 编辑歌单

打开 src/data/music.md，每首歌曲使用一段 --- 包围：

~~~yaml
---
title: 歌曲名称
artist: 歌手名称
url: /audio/song.mp3
---
~~~

例如 public/audio/blue-sky.mp3 对应：

~~~yaml
url: /audio/blue-sky.mp3
~~~

注意：

- url 必须以 /audio/ 开头。
- 文件名和扩展名必须与 public/audio/ 中完全一致。
- 中文文件名可以使用，但英文、数字和短横线更不容易出错。
- title 和 url 必须填写，artist 可以省略。
- 可连续添加多段歌曲记录。

保存后运行：

~~~powershell
corepack pnpm build
~~~

如果提示找不到音频文件，先检查文件路径、扩展名和大小写。

### 7.3 后台添加音乐

登录 /admin/，点击音乐模块，可以：

1. 上传本地音频到 public/audio/。
2. 在配置编辑器中填写歌曲名、歌手和路径。
3. 保存配置，等待 GitHub 提交和 Cloudflare 部署。

访客只能查看和播放歌单，不能通过前端添加或修改歌曲。

## 8. 编辑荣誉墙

荣誉墙数据位于 src/data/honors.md。每条荣誉是一段由 --- 分隔的记录：

~~~yaml
---
date: 2026-06
name: 示例设计比赛
award: 示例奖项
category: 竞赛
issuer: 颁发单位
description: 一句简短说明
icon: material-symbols:auto-awesome-rounded
---
~~~

字段：

- date：YYYY-MM 或 YYYY-MM-DD，页面按日期从新到旧排序。
- name：比赛、活动或证书名称；必填。
- award：获得等级或结果。
- category：竞赛、学业、实践等分类。
- issuer：颁发单位。
- description：简短说明。
- icon：Iconify 图标名称。

name 也可以写成 title，但推荐统一使用 name。date 和 name 缺失的记录会被忽略。关于页面的荣誉墙每页最多显示 5 项，超过 5 项会分页。

后台方式：登录 /admin/，选择荣誉墙，编辑文本并保存。保存后等待部署。

## 9. 留言板

留言板使用 Twikoo，评论数据保存在 Cloudflare D1 数据库中，不会写入 GitHub 仓库。

本项目已把 Twikoo 后端集成进博客自己的 Cloudflare Pages Function，留言接口与博客同域（/api/twikoo），不需要单独部署 Twikoo 服务，也不需要额外域名。

留言板基础配置位于 src/data/guestbook.md：

~~~yaml
---
title: 留言板
description: 留下你的想法，和我打个招呼吧。
envId: /api/twikoo
---
~~~

如果只是修改标题或说明，编辑这个文件即可。envId 可以写相对路径 /api/twikoo（推荐，随域名自动适配），也可以写完整的 http(s) 地址。留空则留言板显示「留言板尚未配置」。

后端首次部署需要三步：wrangler login 登录 Cloudflare、wrangler d1 create twikoo 创建数据库并把 database_id 填进 wrangler.toml、wrangler d1 execute twikoo --remote --file=./functions/vendor/twikoo/schema.sql 建表。详见 docs/DEPLOYMENT.zh-CN.md 第 12 章。

访客使用 /guestbook/ 页面留言。管理员审核、隐藏、删除、编辑或置顶留言时，打开留言板管理入口，使用 Twikoo 管理员密码登录。后台 /admin/ 的留言板模块主要用于修改留言板配置，并提供进入现有留言管理的入口；它不是评论数据库本身。

## 10. 友链

导航栏中的“友链”会打开 /friends/ 页面。友链卡片使用三列布局，桌面端一行显示三张卡片，窄屏会自动改为两列或一列。每张卡片包含头像、网站名、简介和跳转按钮，点击后在新标签页打开对方主页。

友链数据位于 src/data/friends.md。每位朋友使用一段由 --- 分隔的记录：

~~~yaml
---
name: 朋友的博客
url: https://your-blog.pages.dev
avatar: https://your-blog.pages.dev/avatar.png
description: 分享技术、生活和正在学习的事情
---
~~~

字段说明：

- name：网站名称，必填。
- url：网站主页，必填，只允许 http、https 或站内路径。
- avatar：头像地址，可写 /images/avatar.png 或 https 图片地址；留空时显示名称首字母。本地图片必须放在 public/images/ 并一起提交到 GitHub。
- description：一行简介，建议控制在两行以内。

添加友链后运行 corepack pnpm build，确认构建成功，再执行 git add src/data/friends.md、git commit 和 git push。也可以登录 /admin/，进入友链模块编辑并保存；两种方式最终都会更新 src/data/friends.md。

## 11. 后台管理

后台地址：

~~~text
https://你的域名/admin/
~~~

后台支持：

- 文章：新建、编辑、Markdown 工具栏、表情、保存草稿、发布、隐藏、删除。
- 日记：新建、编辑、日期、心情表情、摘要、封面、隐藏和删除。置顶通过文件的 pinned 字段维护；当前后台保存日记会将 pinned 写为 false。
- 音乐：上传本地音频、编辑歌单配置。
- 荣誉墙：编辑荣誉记录。
- 友链：编辑好友网站名称、主页、头像和简介。
- 留言板：编辑标题、说明和 Twikoo 地址，并进入 Twikoo 留言管理。

### 11.1 Cloudflare Pages 环境变量

在 Cloudflare Pages 项目的 Settings → Variables and Secrets 中配置 Production，修改后创建新的部署才会生效；需要在 Preview 测试时，为 Preview 配置独立测试仓库或分支：

| 变量 | 用途 |
| --- | --- |
| GITHUB_TOKEN | GitHub Fine-grained Token |
| GITHUB_OWNER | GitHub 用户名或组织名 |
| GITHUB_REPO | 仓库名，例如 blog-template |
| GITHUB_BRANCH | 分支名，通常是 main |
| ADMIN_PASSWORD | 后台登录密码 |
| ADMIN_SESSION_SECRET | 会话签名密钥，必须与密码不同 |
| ADMIN_EMAIL | 可选，仅用于界面显示 |

GITHUB_TOKEN 建议创建 Fine-grained token：

1. Repository access 选择 Only select repositories。
2. 只选择博客仓库。
3. Repository permissions → Contents 选择 Read and write。
4. Metadata 保持 Read-only。
5. 在 Cloudflare 中按加密 Secret 保存，不要写进代码。

生成随机密码或会话密钥：

~~~powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
~~~

ADMIN_PASSWORD 和 ADMIN_SESSION_SECRET 各生成一次，两个值不要相同。

#### 可选：站点统计变量

首页「站点统计」的访问数据来自 Cloudflare Web Analytics，需要额外配置四个变量：

| 变量 | 用途 |
| --- | --- |
| PUBLIC_CF_BEACON_TOKEN | Web Analytics 站点 token，前台变量，会公开出现在页面里 |
| CF_ACCOUNT_ID | Cloudflare 账号 ID，服务端变量 |
| CF_API_TOKEN | API Token，权限需含 Account → Account Analytics → Read，服务端变量 |
| CF_SITE_TAG | Web Analytics 站点 tag，服务端变量 |

配置步骤见 [部署文档的 8.4 节](DEPLOYMENT.zh-CN.md)。

### 11.2 登录和保存流程

1. 先确认环境变量已经生效。
2. 打开 /admin/，输入 ADMIN_PASSWORD。
3. 选择文章、日记或站点模块。
4. 编辑并保存。
5. 后台调用 Pages Function，向 GitHub 创建一次提交。
6. Cloudflare Pages 检测到提交并重新构建。
7. 等部署成功后刷新前台。

本地 astro dev 只负责显示 /admin/ 页面，不会完整模拟 Cloudflare Pages Functions。要测试后台读写，使用 Cloudflare Pages Preview 或配置 Wrangler 的本地环境。

### 11.3 可选：增加 Cloudflare Access

可以在 Cloudflare Zero Trust 中为以下路径增加 Access Application：

~~~text
/admin/*
/api/admin/*
~~~

Access 是额外的访问保护层；后台本身仍然会校验 ADMIN_PASSWORD。登录接口还有限制失败次数，建议同时为 /api/admin/login 配置 WAF 或 Rate Limiting。

## 12. Cloudflare Pages 部署和更新

### 12.1 首次配置

在 Cloudflare Pages 连接 GitHub 仓库：

- 生产分支：main。
- 构建命令：pnpm build。
- 输出目录：dist。
- Node.js：22，设置 NODE_VERSION=22。
- pnpm：9.14.4，设置 PNPM_VERSION=9.14.4。

确认环境变量已经加入 Production。Cloudflare 会自动部署 main 分支的新提交。

### 12.2 日常更新

内容更新的一般流程：

~~~powershell
git status
corepack pnpm check
corepack pnpm build
git add .
git commit -m "更新博客内容"
git push origin main
~~~

推送后在 Cloudflare Pages 的 Deployments 中查看构建状态。部署成功后使用浏览器强制刷新；如果看到旧页面，等待 CDN 缓存更新或重新打开无痕窗口。

## 13. 安全注意事项

- 不要把 GITHUB_TOKEN、ADMIN_PASSWORD、ADMIN_SESSION_SECRET 提交到 GitHub。
- 只使用 Fine-grained GitHub Token，并限制到当前仓库的 Contents 权限。
- 后台密码建议使用至少 32 位随机字符串。
- 定期轮换 Token、密码和会话密钥。
- 不要把私密信息写入公开的文章、日记、音乐元数据或荣誉墙。
- 音频文件和图片会进入 Git 历史；删除文件后，旧提交中仍可能保留它们。
- 如果 Token 泄露，立即在 GitHub 撤销并重新生成。
- 后台保存会创建 GitHub Commit，不要短时间重复点击保存。
- 只上传自己拥有版权或明确获准使用的音乐和图片。

## 14. 常见问题

### 新文章没有出现在网站

检查：

1. 文件是否放在 src/content/posts/。
2. 文件名是否以 .md 结尾。
3. 开头和结尾是否有完整的 ---。
4. published 是否为 YYYY-MM-DD。
5. draft 是否已经改成 false。
6. 是否已经 git push。
7. Cloudflare Pages 构建是否成功。

### 文章能打开，但首页找不到

文章可能设置了 hidden: true。hidden 文章原链接仍可访问，但不会出现在首页、文章总览、分类、标签和 RSS。

### 日记日期点击没有跳转

检查日记的 date 是否为 YYYY-MM-DD，并确认该日期只有一篇日记。修改后要重新构建部署。

### 音乐显示但无法播放

检查：

- 文件是否真的在 public/audio/。
- music.md 的 url 是否写成 /audio/文件名。
- 扩展名和大小写是否一致。
- 浏览器是否允许自动播放；通常需要用户先点击播放。
- 音频格式是否被当前浏览器支持。

### 修改文件后线上没有变化

这是静态站点，访客打开页面时不会直接读取仓库文件。必须提交并推送，等待 Cloudflare Pages 重新构建；本地 dev 和线上部署是两套环境。

### 后台提示无法连接

检查：

1. 当前访问的是 Cloudflare Pages 部署地址，而不是只运行 Astro 的 localhost。
2. functions/api/admin/ 是否已经提交到 GitHub。
3. Cloudflare Pages 的环境变量是否配置在正确的 Production 或 Preview 环境。
4. GitHub Token 是否仍有效、仓库名和分支名是否正确。
5. Cloudflare 部署日志中是否有 Functions 构建错误。

### 留言板不能评论

检查 src/data/guestbook.md 的 envId 是否正确，Twikoo 服务是否在线，浏览器控制台是否有跨域或网络错误。留言管理密码属于 Twikoo，和博客后台 ADMIN_PASSWORD 是两套密码。

### 端口被占用

查看当前端口：

~~~powershell
Get-NetTCPConnection -LocalPort 4321,4322 -ErrorAction SilentlyContinue
~~~

停止占用端口的进程，先读取 OwningProcess，再执行：

~~~powershell
Stop-Process -Id 进程号
~~~

只停止确定属于本项目的开发服务器，避免误结束其他程序。

## 15. 发布前检查清单

- [ ] 文章和日记的标题、日期、分类和标签正确。
- [ ] 要发布的内容已设置 draft: false。
- [ ] 不希望出现在列表中的内容已明确设置 hidden: true。
- [ ] 图片和音乐路径都能在本地构建中找到。
- [ ] 已运行 corepack pnpm check。
- [ ] 已运行 corepack pnpm build。
- [ ] Git diff 中没有密码、Token 或私密信息。
- [ ] 已 git push origin main。
- [ ] Cloudflare Pages 部署成功后，再检查首页、文章、日记、音乐、留言板和后台。

