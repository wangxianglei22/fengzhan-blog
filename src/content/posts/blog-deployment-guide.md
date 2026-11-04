---
title: "从零部署个人博客：完整使用指南"
published: 2026-11-02
description: "从 GitHub 获取模板开始，一步步完成 Cloudflare Pages 部署、后台写作、日记、音乐、友链、荣誉墙和 Twikoo 留言配置。"
image: "/images/banner.svg"
tags: ["博客搭建", "部署教程", "Cloudflare", "使用指南"]
category: "博客教程"
draft: false
hidden: false
lang: "zh_CN"
---

这份指南面向第一次使用本模板的人。从 GitHub 获取代码开始，完成本地预览、个人资料修改、Cloudflare Pages 上线、后台写作、音乐、日记、友链、荣誉墙和 Twikoo 留言板配置。

适用对象：本仓库当前模板版本。命令以 **Windows PowerShell** 为例；macOS / Linux 用户可将本地路径换成自己的路径，其余 Git、Node.js 和 pnpm 命令基本一致。

外部平台文档核对日期：**2026-11-02**。控制台可能调整按钮名称，下面同时给出功能名称和替代路径；遇到界面差异时，以链接中的官方说明为准。

## 目录

1. [先了解部署结果与所需账户](#step-1)
2. [从 GitHub 创建自己的博客仓库](#step-2)
3. [安装并检查本地工具](#step-3)
4. [拉取代码并启动本地预览](#step-4)
5. [修改博客身份与外观](#step-5)
6. [检查、构建并提交修改](#step-6)
7. [部署到 Cloudflare Pages](#step-7)
8. [填写正式网址与绑定域名](#step-8)
9. [启用后台管理系统](#step-9)
10. [发布文章和日记](#step-10)
11. [配置音乐、友链和荣誉墙](#step-11)
12. [部署并接入留言板](#step-12)
13. [日常维护、备份与版本更新](#step-13)
14. [常见错误排查](#step-14)
15. [上线验收清单](#step-15)
16. [配置速查与官方资料](#step-16)

<a id="step-1"></a>

## 1. 先了解部署结果与所需账户

### 1.1 最终会得到什么

| 功能 | 完成哪个阶段后可用 | 内容放在哪里 |
| --- | --- | --- |
| 主页、文章、日记、关于、友链、荣誉墙、小游戏、主题切换 | 首次部署成功 | GitHub 仓库内的代码与 Markdown |
| 搜索、RSS、站点地图 | 正式构建并部署成功 | 构建时自动生成 |
| 音乐播放、切歌、音量、播放模式 | 加入音频与歌单后 | 仓库的 `public/audio/` 与歌单文件 |
| 网页后台写文章、日记、编辑各内容模块 | 配好 Pages Functions 和后台变量后 | 后台向你的 GitHub 仓库提交文件 |
| 访客留言、留言审核与删除 | 另行接入自己的 Twikoo 服务后 | 独立留言服务的数据库 |
| 自定义域名 | 可选，绑定域名后 | 域名提供商与 Cloudflare 配置 |

模板已经有页面与交互，不需要从头开发。头像、个人资料、文章、日记等使用示例；歌单为空，留言服务与后台凭据未配置。

### 1.2 准备这些账户和工具

必需：

- GitHub 账户：保存自己的博客源码和文章。
- Cloudflare 账户：部署网站与现有后台 API。
- 一台安装 Git、Node.js 22 和 pnpm 9.14.4 的电脑。
- 一个代码编辑器，例如 VS Code。

按需准备：

- 域名：可以先使用免费的 `xxx.pages.dev` 地址。
- Cloudflare 账户：博客部署、后台接口与留言板都跑在同一个 Cloudflare 账号里。

**博客前台和写作后台不需要 MySQL 或单独购买服务器。** 留言数据存在 Cloudflare D1，可选启用。现有后台运行于 Cloudflare Pages Functions，GitHub Pages 本身不能运行这些接口。

平台有免费套餐及用量限制，不能理解为无限流量、无限构建或永久不变的免费政策。本文不要求先开付费套餐；创建资源时查看当前计费页，避免误选付费数据库或加购项目。

### 1.3 理解更新流程

前台是静态构建，后台是文件管理：

```text
本地编辑 → git push → GitHub → Cloudflare 自动构建 → 网站更新
网页后台保存 ─────────→ GitHub → Cloudflare 自动构建 → 网站更新

访客留言 → Twikoo 服务 → 留言数据库（不需要每条留言重建博客）
```

后台显示“保存成功”表示内容已经写入仓库，前台更新还要等部署完成。

### 1.4 本文占位符约定

| 示例 | 你应该替换成什么 |
| --- | --- |
| `23ypz/blog_template` | 本模板的公开仓库：<https://github.com/23ypz/blog_template> |
| `YOUR_GITHUB_NAME` | 你自己的 GitHub 用户名，或拥有博客仓库的组织名 |
| `my-blog` | 你自己新建的博客仓库名 |
| `D:\Projects\my-blog` | 你保存博客的本地目录，可自行更改 |
| `my-blog.pages.dev` | Cloudflare 实际分配的项目地址 |
| `https://你的域名.com` | 你自己的正式博客网址 |

复制命令前替换占位符。不要在 URL 或变量里保留“你的用户名”等说明文字。

<a id="step-2"></a>

## 2. 从 GitHub 创建自己的博客仓库

### 2.1 推荐：使用模板创建仓库

1. 打开模板仓库：[23ypz/blog_template](https://github.com/23ypz/blog_template)。
2. 如果页面有 **Use this template → Create a new repository**，点击它。
3. Owner 选择你自己；Repository name 填 `my-blog` 或喜欢的名称。
4. 若可选，选择只复制默认分支，无需其他分支。
5. 选择 Public 或 Private，创建仓库。

Cloudflare Pages 的 Git 集成支持公开与私有仓库；私有仓库需要在授权时允许 Cloudflare 读取。**网站部署后能访问的内容仍是公开的**，仓库设为 Private 不等于给网站加密码。[Cloudflare Git 集成说明](https://developers.cloudflare.com/pages/get-started/git-integration/)

### 2.2 没有 Use this template 时

可以点击 **Fork**，创建属于自己账户的副本，再部署自己的仓库。公开仓库的 Fork 通常保持公开；希望独立设为私有时，优先使用模板创建功能。

如果发布者未启用模板功能，而你需要私有仓库，可用以下方法创建独立副本：

1. 下载模板仓库的 **Code → Download ZIP**。
2. 解压到计划使用的博客目录，确认其中直接包含 `package.json`、`src`、`functions`。
3. 在 GitHub 新建一个空的 Private 仓库，先不要勾选生成 README、LICENSE 或 .gitignore。
4. 安装 Git 后，在解压目录运行：

```powershell
cd D:\Projects\my-blog
git init
git branch -M main
git add .
git commit -m "chore: initialize blog from template"
git remote add origin https://github.com/YOUR_GITHUB_NAME/my-blog.git
git push -u origin main
```

此方法只用于没有 Git 历史的 ZIP 目录。通过模板或 Fork 创建并 clone 的项目，跳过这些初始化命令。

若第一次 commit 提示缺少姓名或邮箱，先按第 6.2 节设置 Git 提交身份，再重试该命令。

### 2.3 检查结果

浏览器地址应该是：

```text
https://github.com/YOUR_GITHUB_NAME/my-blog
```

仓库根目录应看到 `package.json`、`pnpm-lock.yaml`、`astro.config.mjs`、`src/`、`public/`、`functions/` 等。以后部署、后台 Token 和提交操作都针对**这个属于你的仓库**。

<a id="step-3"></a>

## 3. 安装并检查本地工具

### 3.1 打开命令行

Windows 开始菜单搜索 PowerShell，打开普通终端即可。下文命令框不包含 `PS D:\...>` 提示符，只复制命令本身。一行一个命令，看到错误先处理，不要接着执行依赖它的后续步骤。

### 3.2 检查是否已经安装

```powershell
git --version
node --version
npm --version
corepack --version
```

预期：

- Git 能输出版本号。
- Node 输出 `v22.x.x`。为保持与此模板一致，建议先使用 Node 22。
- npm 随 Node 安装，用于安装包管理器。
- Corepack 可输出版本；如果没有，也可以走下面的 pnpm 备用安装方式。

未安装时从官网下载 [Git](https://git-scm.com/downloads)、[Node.js](https://nodejs.org/en/download) 和可选的 [VS Code](https://code.visualstudio.com/)。安装完成后关闭并重新打开 PowerShell，再检查。

### 3.3 使用 pnpm 9.14.4

本项目锁定 `pnpm@9.14.4`，不能用 `npm install` 或 Yarn 代替安装项目依赖。

有 Corepack 时先运行：

```powershell
corepack pnpm --version
```

进入项目根目录后应使用模板声明的 9.14.4。本文后续统一写 `corepack pnpm ...`。

如果提示找不到 Corepack，或 Corepack 下载/签名报错，可以安装指定版本的 pnpm：

```powershell
npm install --global pnpm@9.14.4
pnpm --version
```

然后将本文的 `corepack pnpm install`、`corepack pnpm dev` 等分别换成 `pnpm install`、`pnpm dev`。不要反复交替使用不同包管理器。

如果 PowerShell 提示 `pnpm.ps1` / `npm.ps1` 无法运行，可先用 `pnpm.cmd` / `npm.cmd` 执行对应命令，无需为了安装修改全局执行策略。

<a id="step-4"></a>

## 4. 拉取代码并启动本地预览

以下以“已经在 GitHub 创建自己的仓库”为前提。采用 ZIP 方法且已经有本地源码的读者，直接进入该目录，从安装依赖开始。

### 4.1 拉取自己的仓库

```powershell
New-Item -ItemType Directory -Force D:\Projects
cd D:\Projects
git clone https://github.com/YOUR_GITHUB_NAME/my-blog.git
cd .\my-blog
```

如果目标文件夹已经存在并有文件，不要覆盖或重复 clone 到里面。选择一个新路径，或确认已有目录就是正确的仓库后使用它。

检查位置：

```powershell
Get-Location
Test-Path .\package.json
git remote -v
```

应在自己的项目根目录，`Test-Path` 输出 `True`，`origin` 指向自己的仓库。

私有仓库 clone 时按 Git Credential Manager 的浏览器提示登录 GitHub。GitHub 网页登录密码不能直接当作 HTTPS Git 密码；不要把 Token 拼进 clone URL 或写入教程。

### 4.2 安装依赖

```powershell
corepack pnpm install --frozen-lockfile
```

第一次会下载较多依赖。看到安装完成、命令提示符重新出现，才进入下一步。保留仓库的 `pnpm-lock.yaml`，不要通过删除锁文件掩盖版本问题。

### 4.3 启动开发预览

```powershell
corepack pnpm dev
```

终端会显示类似 `http://localhost:4321/`，在浏览器打开它。端口被占用时可能换成 4322 等，始终以当前终端显示的地址为准。

成功标志：能看到示例头像和主页，并打开文章、日记、音乐、友链、留言板、关于页面。此时：

- 空歌单正常。
- 留言板显示尚未配置正常。
- 后台可以展示界面，但不能靠这个开发命令完成登录。
- 开发模式尚无完整搜索索引，搜索应在构建预览或正式站检查。

编辑文件、按 Ctrl+S 保存后，开发页面通常会自动更新。关闭浏览器不会停止服务；返回运行服务的终端按 **Ctrl+C** 才会停止。

### 4.4 用编辑器打开

在 VS Code 中选择“文件 → 打开文件夹”，打开 `D:\Projects\my-blog`。若安装了 `code` 命令，也可在项目根目录执行：

```powershell
code .
```

<a id="step-5"></a>

## 5. 修改博客身份与外观

先改基本资料，保留示例文章和日记用于验证流程，全部打通后再删除。

### 5.1 修改标题、昵称、头像与主题色

打开 `src/config.ts`，修改现有对象中的字段，保留其他字段和 TypeScript 语法：

```ts
// siteConfig 中
title: "我的小站",
subtitle: "",
siteStartedAt: "2026-01-01",
themeColor: { hue: 252, fixed: false },

// profileConfig 中
avatar: "/images/avatar.svg",
name: "你的昵称",
bio: "记录生活、学习和正在发生的小事。",
```

- `subtitle: ""` 表示不填写副标题。
- `siteStartedAt` 是网站运行时间的起点，按 `YYYY-MM-DD` 填写。
- `hue` 是色相，通常在 0～360 之间；访客的主题选择可能已存在本地缓存中。
- 这些片段分属不同对象，不要当作整个配置文件覆盖粘贴。

### 5.2 更换头像和图标

模板头像在 `public/images/avatar.svg`。使用自己的图片可：

1. 把图片放到 `public/images/my-avatar.webp`。
2. 将 `profileConfig.avatar` 改为 `"/images/my-avatar.webp"`。
3. 如需同时用作网站图标，修改 `siteConfig.favicon` 的 `src`。
4. 后台页面独立：`src/pages/admin/index.astro` 的 favicon 和品牌名称也可同步修改。更换 favicon 格式时，同时修改或移除不匹配的 `type="image/svg+xml"`。

使用清晰、接近正方形的原图，例如 512×512 像素以上；大头像展示不适合拉伸很小的缩略图。

**路径规则：**`public/images/a.jpg` 在网页上的地址是 `/images/a.jpg`，不写 `/public/images/a.jpg`。不要把 JPG 仅改扩展名为 SVG；图片格式不会因重命名转换。线上文件名大小写敏感。

### 5.3 关于、首页标签与联系方式

| 你要改什么 | 修改文件 |
| --- | --- |
| 关于页城市、专业、性别、简介、兴趣 | `src/pages/about.astro` |
| 首页大头像区域的标签与文字 | `src/components/HomeHero.astro` |
| 昵称、简介、公开社交链接 | `src/config.ts` 的 `profileConfig` |
| 导航模块与顺序 | `src/config.ts` 的 `navBarConfig.links` |
| 随机语录 | `src/data/quotes.ts` |
| 后台顶栏博客名 | `src/pages/admin/index.astro` |

联系方式示例，放进现有 `profileConfig.links` 数组中：

```ts
{ name: "Bilibili", icon: "fa6-brands:bilibili", url: "https://space.bilibili.com/你的编号" },
```

使用前替换为真实地址。没有要公开的联系方式，保持空数组即可。新增图标名称需是当前项目图标工具支持的名称；优先参考现有图标，避免图标不存在导致构建失败。

### 5.4 背景与现有交互

模板保留动态背景、悬停动画、日历和小游戏，不需要额外购买插件。默认 `banner.enable: false`；修改横幅配置会改变页面展示，不必为了让现有主页工作而开启它。

先使用现有主题配置调整色调。若要修改组件样式，每次只改少量内容，并检查浅色、深色、桌面、手机布局。

<a id="step-6"></a>

## 6. 检查、构建并提交修改

### 6.1 本地检查

停止开发服务器，或另开终端进入项目根目录：

```powershell
corepack pnpm check
corepack pnpm build
corepack pnpm preview
```

三条命令分开运行，前一项成功再继续。`preview` 会持续占用终端，浏览器访问它输出的地址，结束按 Ctrl+C。

- `check` 检查 Astro / TypeScript。
- `build` 生成 `dist/` 和 Pagefind 搜索索引。
- `preview` 查看这次构建结果；源码改动后需要重新 build 才会更新此预览。
- `preview` 同样不运行 Cloudflare 后台接口。

成功标志：构建完成，没有报错；搜索能找到示例文章，页面和图片正常。

### 6.2 提交到自己的 GitHub

先查看待提交文件：

```powershell
git status
git diff
```

确认没有密码、Token、私人文档等，再运行：

```powershell
git add .
git commit -m "chore: personalize my blog"
git push
```

第一次提交若提示缺少姓名和邮箱，可仅对这个仓库设置：

```powershell
git config user.name "你的公开署名"
git config user.email "你在 GitHub 设置中复制的 noreply 邮箱"
```

邮箱可在 GitHub **Settings → Emails** 找到；随后重试 commit 和 push。如果显示 `nothing to commit`，说明当前没有新改动，不必强行重复提交。

`node_modules/`、`dist/`、`.astro/`、`.env*`、`.dev.vars*` 等已通过忽略规则排除；保留作为空白配置示例的 `.env.example`。上传源码与锁文件即可。

<a id="step-7"></a>

## 7. 部署到 Cloudflare Pages

这一节只部署博客，后台密码稍后配置。

### 7.1 创建 Git 集成的 Pages 项目

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages**（Workers 和 Pages）。
3. 选择 **Create application**，切到 **Pages**。
4. 选择 **Connect to Git / Import an existing Git repository**。
5. 连接 GitHub，授权 Cloudflare 访问你自己的博客仓库。
6. 选择 `YOUR_GITHUB_NAME/my-blog`，进入构建配置。

如果默认展示的是创建 Worker 的页面，寻找 Pages 标签或切换入口。本项目主路线是 **Pages + Git 集成**，不需要自行改成 Worker，也不需要安装 Astro SSR 适配器。

官方当前指南提供上述入口；不同控制台可能分别写“Connect to Git”或“Import an existing Git repository”。[Astro 部署指南](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)

### 7.2 填写构建参数

| 项目 | 填写值 |
| --- | --- |
| Project name | 自定义，例如 `my-little-blog`；影响默认网址 |
| Production branch | 你的主分支，本文用 `main` |
| Framework preset | Astro；也可以不选，手动填写下面两项 |
| Build command | **`pnpm build`** |
| Build output directory | **`dist`** |
| Root directory / Path | 留空使用仓库根目录；不要填 `src` 或 `dist` |

构建命令使用项目的 `pnpm build`，其中包含搜索索引生成。不要只写 `astro build`。

在构建环境变量中设置：

| 名称 | 值 | 类型 |
| --- | --- | --- |
| `NODE_VERSION` | `22` | 普通变量 |
| `PNPM_VERSION` | `9.14.4` | 普通变量 |

版本覆盖变量来自 Cloudflare 的构建环境说明，避免平台默认 pnpm 版本变化影响锁文件。[构建镜像与版本覆盖](https://developers.cloudflare.com/pages/configuration/build-image/)

### 7.3 首次部署

点击 **Save and Deploy / Deploy**，等待构建和发布完成。状态成功后，打开 Cloudflare 给出的：

```text
https://你的项目名.pages.dev
```

记录这个真实地址。此时前台应该能访问，空歌单和未配置留言提示仍然正常。

**保留根目录的 `functions/` 并通过 Git 集成构建。** 只把 `dist/` 拖到普通静态上传入口，不能按本文方式获得完整后台接口。

### 7.4 后续如何更新、重新部署

连接 Git 后，每次向生产分支 push 新提交，通常都会自动部署，不需要每次新建项目。

查看项目的 **Deployments** 页面，核对最近一项的分支、提交号和状态。修改变量后，应创建使用新配置的部署；可使用界面提供的 **Create deployment / Retry deployment / Redeploy** 等操作，以实际项目界面为准。

如果找不到按钮，先确认本地没有需要处理的改动，并已同步仓库，然后推送一条空提交触发新部署：

```powershell
cd D:\Projects\my-blog
git status
git pull --ff-only
git commit --allow-empty -m "chore: redeploy after configuration change"
git push
```

这里只向自己的博客仓库操作。若 `pull` 报冲突或工作区有未提交内容，先按第 13 节处理，不要强制覆盖。

> **重要：后台改完文章后，站点不会立刻更新。** 后台保存文章是把内容提交到 GitHub（一次 commit），Cloudflare 再由这次 push 触发重新构建，通常需要 1–3 分钟。想立刻看到效果，就在 Deployments 页面点 **Retry deployment** 或 **Redeploy**。

### 7.5 用命令行检查部署状态

不想打开控制台时，可以用 wrangler 查询：

```bash
wrangler pages deployment list --project-name=YOUR_PROJECT_NAME
wrangler pages project list
```

`wrangler pages deployment list` 会列出每次部署的 id、分支、提交号与状态，最新一条是 `Production` 即当前线上版本。

> **注意：改动环境变量后必须重新部署才生效。** 在控制台改完变量不会自动重建站点，需要手动触发一次部署（Retry / Redeploy / 推空提交）。
>
> **Direct Upload 与 Git 集成不能互相转换。** 一个用 `wrangler pages deploy` 上传的项目，无法在控制台或 API 里切换成 Git 集成，反之亦然。想换方式只能新建项目。

<a id="step-8"></a>

## 8. 填写正式网址与绑定域名

### 8.1 不买域名也可以使用

`pages.dev` 可用于浏览博客和登录后台。是否购买域名取决于你是否需要独立网址；域名不是接入本文后台或留言方案的必需条件。

跨地区访问质量受网络影响，免费地址和自定义域名都不能保证在所有网络下始终畅通。用手机流量和其他网络分别测试。

### 8.2 修改站点正式地址

打开 `astro.config.mjs`，找到：

```js
const siteUrl = (process.env.SITE_URL || "http://localhost:4321").replace(/\/+$/, "");
```

**通常不用改这个文件。** 正式地址通过 Cloudflare Pages 的环境变量 `SITE_URL` 传入，构建时自动生效。例如：

```
SITE_URL=https://fengzhan.pages.dev
```

本地不设置这个变量时会退回 `http://localhost:4321`，不会生成指向示例域名的链接。

这里只写站点来源地址，不填 `/admin/`，也不填 GitHub 仓库 URL。该配置影响规范链接、RSS 和站点地图，正式部署前必须填上自己的地址。

改环境变量后需要触发一次重新部署（Retry / Redeploy）才生效。

如果确实要写死进 `astro.config.mjs`（不推荐，域名会因此写死在代码里），改完记得提交并推送：

```powershell
git add astro.config.mjs
git commit -m "chore: set production site URL"
git push
```

### 8.3 可选：绑定自己的域名

在 Pages 项目进入 **Custom domains → Set up a domain**，先在项目里添加域名，再按引导配置 DNS。

两种情况：

- **根域名 `你的域名.com`：**按 Pages 官方要求，把该域名作为站点加入同一 Cloudflare 账户，并在注册商处将名称服务器切换为 Cloudflare 分配的地址。切换前先核对并保留已有网站、邮箱等 DNS 记录。
- **子域名 `blog.你的域名.com`：**可继续使用现有 DNS 服务商，在 Pages 添加后，根据提示新增 CNAME，目标为 `你的项目.pages.dev`，不带 `https://` 和路径。

不要只添加一条 CNAME 而跳过 Pages 内的域名绑定。等待域名状态和 HTTPS 证书正常后再访问。[Cloudflare 自定义域名说明](https://developers.cloudflare.com/pages/configuration/custom-domains/)

成功后，再将 `astro.config.mjs` 的 `site` 改为最终域名，提交并等待部署。如果以后更换域名，也要同步留言服务的来源域名配置。

### 8.4 可选：接入 Cloudflare Web Analytics

博客首页侧栏的「站点统计」读取的是 Cloudflare 自带的 Web Analytics 数据。默认不配置，组件显示「未接入访问统计」，**不会用假数字兜底**。想要真实访问数据时按下面配置。

**第一步：在 Pages 里开启 Web Analytics**

进入项目 **Metrics → Web Analytics → Enable**。如果用的是 **Enable with JS snippet installation**（手动安装），把面板给出的 token 记下来。Pages 的自动注入在部分站点上不生效，本项目采用手动注入方式。

**第二步：配置四个环境变量**

在 **Settings → Variables and Secrets** 添加：

| 名称 | 类型 | 从哪里取 |
| --- | --- | --- |
| `PUBLIC_CF_BEACON_TOKEN` | 普通变量 | Web Analytics 面板给出的站点 token |
| `CF_ACCOUNT_ID` | 普通变量 | Cloudflare 账号 ID |
| `CF_API_TOKEN` | Secret，保密 | 见下方说明 |
| `CF_SITE_TAG` | 普通变量 | Web Analytics 面板 URL 里的站点 tag |

`PUBLIC_CF_BEACON_TOKEN` 会打进前端构建产物并在页面里明文出现，这是**公开标识而不是密钥**，可以放心使用。其余三个是服务端变量，`functions/api/stats.ts` 在 Cloudflare 侧读取，不要加 `PUBLIC_` 前缀。

**第三步：创建 API Token**

进入 Cloudflare 控制台的 **My Profile → API Tokens → Create Token**，使用 **Edit Cloudflare Workers** 模板或自定义 Token，权限需要包含：

```text
Account → Account Analytics → Read
```

创建后把 Token 值填入 `CF_API_TOKEN`，存为 Secret。

**第四步：重新部署并验证**

保存变量后创建一次新部署（见 7.4 节）。打开首页侧栏的「站点统计」，应看到「页面浏览」和「访问次数」两个数字，底部标注「近 7 天 · 数据来自 Cloudflare」。

**关于指标口径**

- 页面浏览：成功返回 HTML 的页面请求数。
- 访问次数：Referer 主机名与本站不同的页面浏览，含直接访问。

Cloudflare **不统计独立访客数、跳出率和停留时长**，所以组件里没有「总访客」这一项。

**已知限制**

- Cloudflare 的 RUM 数据集只对**美国元数据边界（US metadata boundary）**的账号返回，其他区域的账号可能查不到数据。
- 采样与数据新旧有关：最近几天是精确值，更早的数据约 10% 采样，界面只取最近 7 天。Cloudflare 官方说明采样后的返回值已经放大过，不需要再乘一次。
- GraphQL API 配额为每 5 分钟 300 次查询；接口端带 30 分钟缓存，正常浏览不会超限。
- 本地 `pnpm preview` 不运行 Pages Functions，`/api/stats` 返回 404 属正常，需到线上验证。

[Cloudflare Web Analytics 文档](https://developers.cloudflare.com/web-analytics/)

<a id="step-9"></a>

## 9. 启用后台管理系统

后台地址是：

```text
https://你的博客网址/admin/
```

没有附带默认密码。后台有独立登录页面，但需要以下配置才能读写你自己的仓库。

### 9.1 创建 GitHub Fine-grained Token

1. 登录拥有博客仓库的 GitHub 账户。
2. 进入个人 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
3. 选择 **Generate new token**。
4. Token name 可写 `my-blog-admin`。
5. 设置有效期，并记录续期日期。
6. **Resource owner** 选拥有博客仓库的个人或组织。
7. **Repository access → Only select repositories**，只勾选自己的 `my-blog`。
8. 在 **Repository permissions** 设置：
   - **Contents：Read and write**。
   - **Metadata：Read-only**，通常自动包含。
9. 创建并复制 Token，暂存到密码管理器中，页面通常只显示一次。

不要将 Token 写入源码、文章、截图或浏览器端配置。Cloudflare 读取仓库的 GitHub App 授权和这里的写作 Token 是两件事，需要分别配置。组织仓库还可能需要管理员审批。[GitHub Token 官方说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### 9.2 生成两个不同的随机值

在自己电脑的 PowerShell 运行下面命令两次，每次都会输出不同的值：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- 第一个作为 `ADMIN_PASSWORD`：你登录后台时输入的密码。
- 第二个作为 `ADMIN_SESSION_SECRET`：服务器签名会话的密钥，不在登录框输入。

两者分别保存，不使用模板名称或“123456”等简单内容，不把示例变量名本身当作值。

### 9.3 在 Pages 中设置服务端变量

进入 **Workers & Pages → 你的 Pages 项目 → Settings → Variables and Secrets → Add**，选 **Production / 生产环境**。这是 Cloudflare 官方提供的环境变量位置。[Pages Functions 绑定与变量](https://developers.cloudflare.com/pages/functions/bindings/)

| 名称，必须完全一致 | 示例 / 填写规则 | 保存类型 |
| --- | --- | --- |
| `GITHUB_TOKEN` | 上一步创建的 Token | Secret，保密 |
| `GITHUB_OWNER` | `YOUR_GITHUB_NAME`，仓库拥有者的用户名或组织名 | 普通变量 |
| `GITHUB_REPO` | `my-blog`，只填仓库短名 | 普通变量 |
| `GITHUB_BRANCH` | `main`，与 Pages 生产分支一致 | 普通变量 |
| `ADMIN_PASSWORD` | 第一个随机值 | Secret，保密 |
| `ADMIN_SESSION_SECRET` | 第二个随机值 | Secret，保密 |
| `ADMIN_EMAIL` | 可选，管理员显示信息 | 需要保护邮箱时存 Secret |

填写值时不要加额外引号、空格或换行。不要给变量名添加 `PUBLIC_` 或 `VITE_` 前缀。

`GITHUB_OWNER` 不是显示昵称或邮箱；`GITHUB_REPO` 不是整个 HTTPS 地址。后台写入分支必须是实际部署的分支，否则“保存成功”也不会更新正式站。

根目录 `.env.example` 只列出变量名称。**在本地复制成 .env，不会自动配置 Cloudflare 远程环境，也不会让 `pnpm dev` 运行 Pages Functions。**

预览部署不必开放管理权限；如果需要测试后台，应使用测试仓库或测试分支的配置，避免预览页面写入正式内容。

### 9.4 重新部署并登录

1. 保存变量。
2. 按第 7.4 节触发新的生产部署。
3. 等待成功后打开正式域名的 `/admin/`。
4. 输入 `ADMIN_PASSWORD`。
5. 检查文章和日记列表能否读取。

如果没有启用 Cloudflare Access，本文也可以正常使用。Access 是可选增强功能，不是第一版后台的必经步骤。

### 9.5 做一次完整写作测试

1. 后台新建一篇文章。
2. 填标题、日期、唯一英文文件名、摘要和正文。
3. 先保存草稿，确认重新进入后能读取。
4. 点击发布。
5. 打开自己的 GitHub 仓库，确认新增文件和提交。
6. 打开 Pages 的 Deployments，等待这条提交对应的部署成功。
7. 打开前台文章总览和文章详情，确认内容正确。
8. 下次在电脑上继续编辑前，先 `git pull --ff-only` 拉取后台产生的提交。

**后台能力边界：**文章与日记编辑器提供 Markdown 工具、预览和表情；音乐可上传与改歌单；友链、荣誉墙、留言板配置通过文本编辑。头像、导航和整体样式仍通过源码调整。访客无法通过普通音乐页面修改歌单。

<a id="step-10"></a>

## 10. 发布文章和日记

可以用后台操作，也可以本地编辑 Markdown。两种方式都修改同一个 GitHub 仓库，避免同时编辑同一文件。

### 10.1 新建文章

主路线使用平铺文件：

```text
src/content/posts/my-first-post.md
```

当前后台列表直接管理这一层的 `.md` 文件。前台虽支持文件夹文章，若希望持续在现有后台编辑，优先使用平铺文件，把图片放在 `public/images/`。

命令创建文章：

```powershell
corepack pnpm new-post my-first-post "我的第一篇文章"
```

也可以复制 `templates/post-template.md`，改名后放入上述目录。

完整元数据示例：

```md
---
title: "我的第一篇文章"
published: 2026-01-01
# updated: 2026-01-02
description: "这是文章列表中显示的摘要。"
image: "/images/banner.svg"
tags: ["学习", "生活"]
category: "学习笔记"
draft: false
hidden: false
lang: "zh_CN"
---

## 第一段

这里是正文，可以写 **加粗**、列表、链接和图片。

![图片说明](/images/banner.svg)
```

使用时把日期、正文和分类换成自己的内容。没有封面写 `image: ""`，没有标签写 `tags: []`。

- 第一行必须是 `---`，元数据结束也用单独一行 `---`。
- 日期按 `YYYY-MM-DD` 写，不加引号。
- `draft`、`hidden` 使用 `true` / `false`，不加引号。
- 文件名用小写英文、数字和连字符，确定后尽量不改；它决定 `/posts/my-first-post/` 地址。
- 一篇文章一个分类；相同的分类文字会自动聚合。
- 新建命令默认 `draft: true`，准备上线时改为 `false`。
- 中文内容建议 `lang: "zh_CN"`。

更多 Markdown、封面、字段规则见 仓库内的文章与日记写作指南（`docs/CONTENT_GUIDE.md`）。

### 10.2 草稿、隐藏与删除的区别

| 状态 | 正式网站列表 | 正式详情页面 |
| --- | --- | --- |
| `draft: false, hidden: false` | 显示 | 可访问 |
| `draft: true` | 不显示 | 正式构建不生成该草稿详情 |
| `draft: false, hidden: true` | 常规列表不显示 | 原链接仍然可访问 |
| 删除文件并重新部署 | 不显示 | 新构建不再提供该页面 |

文章草稿在本地开发模式可能出现，便于预览；日记草稿在本地列表也被过滤。

隐藏适合暂时不放进列表，**不适合保密**。隐藏详情仍被构建，不应依赖它阻止被搜索或被转发。公开仓库里的草稿、隐藏内容及历史提交也可能被读取。

### 10.3 新建日记

文件位置：

```text
src/content/diary/2026-01-01-my-day.md
```

可复制 `templates/diary-template.md`，或在后台选择“日记”新建。示例：

```md
---
title: "普通又开心的一天"
date: 2026-01-01
mood: "😊"
moodLabel: "开心"
excerpt: "完成了一个小目标。"
cover: "/images/banner.svg"
tags: ["生活"]
pinned: true
draft: false
hidden: false
---

今天做了什么，记录在这里。
```

- `date` 决定心情日历上的位置；有对应日记的日期可点击进入详情。
- 同一天建议一篇，避免同一天多个详情只有一个日历入口。
- `mood` 写表情，`moodLabel` 写心情文字。
- `pinned: true` 加入置顶区；桌面一次展示三张，超过三张可左右切换。
- 不要封面写 `cover: ""`。
- 日记模板默认草稿，需改为 `draft: false` 才会显示。

当前后台保存日记会写入 `pinned: false`，置顶需要在文件中设置：完成后台编辑后将对应文件的 `pinned` 改为 `true` 并提交。如果之后再次在后台保存该日记，需要重新核对置顶字段。

### 10.4 本地发布内容

保存文件后运行：

```powershell
corepack pnpm check
corepack pnpm build
git status
git add src/content public/images
git commit -m "content: publish a new post"
git push
```

如果没有新增图片也不影响该命令。确认 `git status` 中的改动符合预期，再提交。

### 10.5 删除示例内容

流程打通后，可在后台逐篇删除示例，或在编辑器中删除不需要的 `.md` 文件并提交。不要删除 `src/content/config.ts`、整个 `src/pages/` 或模板解析代码。

目录暂时没有内容时，可能出现内容集合为空的提示，以最终构建是否成功为准。删除示例图片前，先检查文章、日记、友链是否仍然引用它。

<a id="step-11"></a>

## 11. 配置音乐、友链和荣誉墙

这些模块使用“一个文本文件存多条记录”的格式。每条记录用一对单独占行的 `---` 包裹；后续记录继续复制完整区块。文章和日记则是一篇一个文件，不要混淆。

### 11.1 本地音乐：推荐先添加一首验证

1. 准备你有权公开播放的音频，例如 `my-song.mp3`。
2. 放到 `public/audio/my-song.mp3`。
3. 打开 `src/data/music.md`。
4. 在现有 `<!-- ... -->` 注释**后面**添加：

```yaml
---
title: 我的第一首歌
artist: 示例作者
url: /audio/my-song.mp3
---
```

第二首示例：

```yaml
---
title: 我的第二首歌
artist: 示例作者
url: /audio/another-song.mp3
---
```

第二条必须有真实对应文件，不要仅复制示例而不上传音频，否则会构建失败。

当前版本的歌单解析器只接受 `/audio/` 开头、实际存在于 `public/audio/` 内的路径，**不支持直接填写外部音频 URL**。路径不要带问号参数、反斜杠或 `../`，不写电脑磁盘绝对路径。

成功标志：

- 音乐页出现歌曲，列表每页最多 10 首。
- 点播放后有声音，可调进度与音量。
- 默认列表循环，可选单曲循环和随机播放。
- 从主页进入其他站内页面时，已开始的播放可持续。
- 浏览器通常要求用户主动点击；刷新、关闭、外链打开新站不属于站内持续播放。

### 11.2 用后台上传音乐

1. 登录后台，进入音乐模块。
2. 选择本地音频上传，等上传完成。
3. 按返回路径编辑歌单，确认歌名、歌手与 `url` 对应。
4. 保存歌单配置。
5. 等待最后一次提交对应的 Pages 部署成功，再测试。

后台接受 mp3、m4a、ogg、wav、flac、aac，但浏览器解码支持可能不同，新手优先 MP3。后台代码上限为 30 MiB，Cloudflare Pages 单个静态资源上限为 **25 MiB**；实际应遵守更小的平台限制，建议单曲压缩到 **20 MiB 以下**，超时则继续缩小文件。[Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)

上传音频与保存歌单可能分别产生提交，第一次构建先于歌单更新属于正常情况，以最后一次部署为准。音频会占用仓库空间，不适合把大量无损音乐打包进去。

### 11.3 添加友链

编辑 `src/data/friends.md`，或使用后台友链模块：

```yaml
---
name: 朋友的网站
url: https://example.org
avatar: /images/friend-avatar.webp
description: 记录生活与技术的小站。
---
```

字段：

- `name`：卡片显示的网站名。
- `url`：点击卡片跳转的网址，带 `https://`。
- `avatar`：图片地址，不能填“某网站主页”。
- `description`：简短介绍。

本地头像应放到 `public/images/friend-avatar.webp`；也可填外部 HTTPS 图片，但对方可能限制防盗链。有权使用时保存到自己站内更稳定。桌面布局一行三张，小屏幕会自动调整。

### 11.4 添加荣誉墙

编辑 `src/data/honors.md`，或使用后台荣誉模块：

```yaml
---
date: 2026-06
name: 示例设计比赛
award: 二等奖
issuer: 示例组织
category: 比赛
description: 一句简短补充说明。
---
```

- `date`：显示时间，推荐 `YYYY-MM`。
- `name`：比赛、活动或证书名称。
- `award`：奖项或等级，和名称分开填写。
- `issuer`、`category`、`description`：可选补充信息。

荣誉展示在关于页面，一页最多 5 条，超过后翻页。信息尽量简短，保持类似简历的行式排版。纯文本模块按自己的解析规则读取，不要随意更改字段名或插入多行复杂 YAML 结构。

<a id="step-12"></a>

## 12. 部署并接入留言板

本节可最后完成。不需要留言时保持 `envId: ""`，不影响其他功能。

当前模板集成 **Twikoo**，本地客户端文件为 `public/vendor/twikoo-2.0.17.min.js`。不要照 Waline、Giscus 或其他评论系统的变量表配置。

### 12.1 本文路线：Cloudflare Pages 同域 + D1

主路线：**把 Twikoo 后端编译进博客自己的 Cloudflare Pages Function，数据存 Cloudflare D1**。

| 组成 | 位置 | 说明 |
| --- | --- | --- |
| 博客静态页面 | Cloudflare Pages | Astro 构建产物 |
| 博客后台 API | `functions/api/admin/*` | Pages Function，已自带 |
| 留言板后端 | `functions/api/twikoo/[[path]].ts` | Twikoo 适配器，与博客同域名 |
| 留言数据 | Cloudflare D1（绑定名 `DB`） | 建表脚本 `functions/vendor/twikoo/schema.sql` |

这套方案的特点：

- **不依赖第三方平台**，不用注册 MongoDB Atlas、Netlify、Hugging Face 等外部服务。
- **不需要额外的子域名**。留言接口是 `https://你的博客域名/api/twikoo`，与博客同域，不存在 `*.workers.dev` 在国内被 DNS 污染而超时的问题。
- **全部在免费额度内**：Pages 免费版每月 500 次构建，静态资源流量不限；Workers Free 每天 10 万次请求，留言量远达不到。
- **博客与留言共用一个 Cloudflare 账号**，不用在多个平台之间来回配置。

Twikoo 服务与写作后台独立，管理员密码也独立。访客通过评论表单留言，不要求持有 GitHub 账户。

> **已包含在本仓库里**：Twikoo 的 Cloudflare 适配器已经构建好并放进 `functions/vendor/twikoo/`，你不需要自己下载源码或执行构建命令。本节只涉及创建数据库和填数据库 ID。

### 12.2 准备 Cloudflare 登录

部署需要 Cloudflare 账号和账号 ID。

1. 注册并登录 [Cloudflare](https://dash.cloudflare.com/)。
2. 安装 wrangler（如果还没有）：

   ```powershell
   npm install -g wrangler@4
   ```

3. 登录（会打开浏览器让你授权）：

   ```powershell
   wrangler login
   ```

4. 确认登录状态：

   ```powershell
   wrangler whoami
   ```

   输出里能看到账号 ID 就说明成功。记下这个 Account ID，后面要在 Cloudflare 面板创建 D1 数据库。

### 12.3 创建 D1 数据库并初始化表结构

D1 是 Cloudflare 的免费无服务器数据库，专门存这种小数据。

1. 创建数据库：

   ```powershell
   wrangler d1 create twikoo
   ```

   命令会输出类似这样的结果：

   ```text
   🌀 Creating Cloudflare D1 database with name "twikoo"...
   ✅ Success, your database was created!
   ```

   其中 `database_id` 是一串 UUID，**记下来**。

2. 把 `database_id` 填进项目根目录的 **`wrangler.toml`**：

   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "twikoo"
   database_id = "把这里换成上一步的 UUID"
   ```

3. 初始化表结构（可以跳过，因为适配器首次请求时会自动建表，但手动执行更保险）：

   ```powershell
   wrangler d1 execute twikoo --remote --file=./functions/vendor/twikoo/schema.sql
   ```

4. 验证表已建好：

   ```powershell
   wrangler d1 execute twikoo --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
   ```

   应该能看到 `comment` 和 `cap_kv` 两张表。

> **关于 `wrangler.toml`**：这个文件里带 `pages_build_output_dir` 字段后，它就是 Pages 项目的配置唯一来源，`[[d1_databases]]` 会随部署一起应用到生产与预览环境。仪表盘上再改同名绑定会被覆盖，改配置请改这个文件。

### 12.4 接入博客

打开 **`src/data/guestbook.md`**，修改现有区块：

```yaml
---
title: 留言板
description: 留下你的想法，和站长打个招呼吧。
envId: "/api/twikoo"
---
```

`envId` 写站内相对路径 `/api/twikoo` 即可，页面脚本会按当前域名自动补全，**换域名时不用改这里**。也可以写完整地址，例如 `https://fengzhan.pages.dev/api/twikoo`。

这里的 `envId` 就是留言接口地址，配置组件实际读取这个文件，**只修改 `src/config.ts` 的同名配置不会完成接入**。

可以在博客后台的留言板模块编辑同一个区块。保存后等待 Pages 重新部署；本地修改则提交：

```powershell
git add src/data/guestbook.md
git commit -m "feat: connect Twikoo guestbook"
git push
```

### 12.5 设置留言管理员并验证

1. 打开正式站 `/guestbook/?admin=1`。
2. 使用评论区域的小齿轮管理入口，按 Twikoo 提示设置自己的管理员密码。
3. 此密码独立于博客后台的 `ADMIN_PASSWORD`，也不是数据库密码。
4. 使用普通访客窗口发布一条测试留言。
5. 使用管理员窗口检查审核、删除或垃圾留言处理是否正常。
6. 切换到其他页面再返回留言板，确认样式和留言列表仍正常。

非腾讯云部署的管理员初始化方式由 Twikoo 前端文档说明。[Twikoo 前端与管理入口](https://twikoo.js.org/frontend.html)

博客后台的"留言板"模块负责服务地址与页面文案，并提供"管理现有留言"的入口。**现有留言的审核与删除在 Twikoo 管理面板完成**，不会作为文章文件保存在 GitHub。

分页、每页数量、匿名/邮箱要求等，使用当前 Twikoo 管理面板实际提供的设置，不需要改博客文章分页。不要向访客公开管理员密码或数据库 ID。

### 12.6 留言故障先按这个顺序查

1. 浏览器直接访问 `https://你的博客域名/api/twikoo`，应返回 `{"code":100,"message":"Twikoo 云函数运行正常..."}`。
2. 如果返回 404，检查 Pages 部署是否包含 `functions/api/twikoo/` 与 `functions/vendor/twikoo/`。
3. 如果报"未绑定 D1 数据库"，检查 `wrangler.toml` 里的 `database_id` 是否填对，并重新部署。
4. 检查 D1 里是否已有表：`wrangler d1 execute twikoo --remote --command "SELECT count(*) FROM comment"`。
5. 检查博客 `envId` 是否填写（不能是空字符串）。
6. 检查 Pages 是否已部署含最新 `guestbook.md` 的提交。
7. 浏览器 F12 → Network 查看接口是否被跨域策略拒绝。
8. 用其他网络测试，区分配置问题与网络访问问题。

只刷新博客不能修复数据库绑定或留言服务部署错误。

> **本地调试提示**：`pnpm preview` 不运行 Pages Functions，本地访问 `/api/twikoo` 一定是 404，这是正常的。需要联调时用 `wrangler pages dev dist --d1 DB=twikoo`，它会在本地启动包含 Functions 的完整环境。

## 13. 日常维护、备份与版本更新

### 13.1 每次本地编辑前先同步

后台写作会自动向 GitHub 提交。电脑上的本地目录不会自动跟着更新。

```powershell
cd D:\Projects\my-blog
git status
git pull --ff-only
```

确认工作区干净再 pull；拉取成功后开始编辑。若有未提交的更改，先保存并整理为自己的提交，或明确暂存这些改动；不确定时先复制相关改动文件作为备份。

如果提示 `Not possible to fast-forward`，说明本地和远程都产生了新提交，需要合并或 rebase 并解决冲突，不要用 `push --force` 覆盖后台写的新文章。

### 13.2 常用命令

| 目的 | 项目根目录中运行 |
| --- | --- |
| 安装锁定依赖 | `corepack pnpm install --frozen-lockfile` |
| 开发预览 | `corepack pnpm dev` |
| 类型检查 | `corepack pnpm check` |
| 正式构建与搜索索引 | `corepack pnpm build` |
| 预览上一次构建 | `corepack pnpm preview` |
| 停止预览 | 在对应终端按 Ctrl+C |
| 查看改动 | `git status`、`git diff` |
| 同步后台提交 | `git pull --ff-only` |
| 推送已提交的改动 | `git push` |

### 13.3 需要备份什么

- **博客内容与代码：**GitHub 仓库，并定期保存自己的离线副本。
- **留言：**独立备份 Twikoo / D1 数据（`wrangler d1 export`），备份仓库不会包含留言。
- **密钥：**使用密码管理器保存 Cloudflare、Token 有效期、后台密码、签名密钥和数据库凭据。
- **域名：**记录注册商、到期时间与 DNS 配置。

私有仓库不能代替密钥管理。不要为了备份把服务器变量写回公开仓库。

### 13.4 修改密码或 Token

- 后台密码修改：更新 Pages 的 `ADMIN_PASSWORD`，创建新部署。
- 需要让既有会话失效：同时轮换 `ADMIN_SESSION_SECRET` 并重新部署。
- Token 到期：创建同范围的新 Token，更新 `GITHUB_TOKEN` 并重新部署，确认读写后撤销旧 Token。
- 留言数据清理：`wrangler d1 execute twikoo --remote --command "DELETE FROM comment"`。

### 13.5 模板更新与回滚

新模板版本发布后，先查看差异并备份自己的修改，逐项合并。不要把自己的整个 `src/config.ts`、`src/data/`、`src/content/` 覆盖成新版示例。

网站出问题时，可先在 Cloudflare 部署历史中恢复一个成功版本；长期修复仍应在 GitHub 更正代码或通过 revert 创建撤销提交，使下一次部署与源码一致。回滚部署不会自动撤销仓库里已经保存的内容。

<a id="step-14"></a>

## 14. 常见错误排查

| 现象 | 重点检查与处理 |
| --- | --- |
| 命令提示找不到 package.json | 执行 `Get-Location`、`Test-Path .\package.json`，切到真正项目根目录 |
| 提示只允许使用 pnpm | 用 pnpm 9.14.4，不使用 npm / Yarn 安装本项目依赖 |
| 冻结锁文件安装失败 | 确认 pnpm 版本和仓库锁文件；不要先删除锁文件 |
| pnpm.ps1 不能执行 | 使用对应的 `pnpm.cmd`，或 Corepack 的可用命令入口 |
| 4321 和 4322 页面不同 | 两个旧预览服务可能同时运行；在各自终端 Ctrl+C 停止，只重开需要的一个 |
| 源码改了，preview 不变 | 先重新 `pnpm build` 再预览 |
| 开发模式搜索不工作 | 正常；使用 build + preview 或正式站，确认云端命令是 `pnpm build` |
| 页面更新后样式像旧版本 | 核对部署提交号，完成后 Ctrl+F5；仍有问题再检查控制台和资源请求 |
| 本地正常，线上图片失败 | 检查文件是否提交、大小写、扩展名；路径不含 `public/` 前缀 |
| 新文章未出现 | 检查 `draft`、`hidden`、目录、日期和部署状态 |
| 日记日历没有新心情 | 日记必须已发布、未隐藏，检查 `date` 与当前查看月份 |
| 歌单为空 | 音频文件本身不会自动变成歌曲；须在 music.md 的注释外写记录 |
| 歌曲路径导致构建失败 | `/audio/文件名` 必须对应真实文件，不接受外部链接或磁盘路径 |
| 大音频部署失败 | 遵守 Pages 单文件上限，先用较小 MP3 测试 |
| 本地后台登录失败 | dev / preview 不运行 Pages Functions，使用云端完整部署 |
| 后台接口返回 404 或 HTML | 检查是否创建了正确 Pages 项目、仓库有 functions、是否仅上传静态产物 |
| 后台登录提示尚未配置 / 503 | 检查生产环境 ADMIN_PASSWORD 与 ADMIN_SESSION_SECRET，并部署新版本 |
| 后台登录 401 | 密码错误或会话失效，核对 Secret 并重新登录 |
| 后台登录 429 | 登录尝试过多，等待限流窗口结束再检查密码 |
| 登录成功但列表读不了 / GitHub 401、403、404 | 检查 Token 到期、Resource owner、目标仓库权限、仓库名和分支；私有仓库授权错误也可能返回 404 |
| 保存发生冲突 / 409 | 重新读取最新内容后再编辑，避免多个标签页同时覆盖同一文件 |
| 后台保存成功，前台没变 | 查看 GitHub 提交是否存在，确认写入生产分支并等待对应 Pages 部署 |
| 仓库里有文章但后台列表没看到 | 当前后台直接管理 posts / diary 下平铺的 .md 文件；避免放入子文件夹 |
| 友链头像不显示 | avatar 应是图片而非网页；外部图片可能防盗链 |
| 荣誉数量不对 | 检查每条记录的分隔线、name 与 award；超过 5 条应出现分页 |
| 留言管理和后台密码不通用 | 两套系统密码独立，Twikoo 使用自己的管理面板 |
| 留言板显示「尚未配置」 | 检查 src/data/guestbook.md 的 envId 是否为 /api/twikoo 或完整地址 |
| 留言提交失败 404 | 确认已部署含 functions/api/twikoo/ 的版本，且 Pages 项目启用了 Functions |
| 留言提交失败 500 | 检查 wrangler.toml 的 database_id 是否为真实 D1 UUID，D1 绑定名是否为 DB |
| 留言表不存在 | 执行 wrangler d1 execute twikoo --remote --file=./functions/vendor/twikoo/schema.sql |
| 留言能发但管理面板提示版本过旧 | 适配器需为 2.0.17，检查 functions/vendor/twikoo/ 是否为重新构建的产物 |
| 访客数在不同电脑不一样 | 访问数据来自 Cloudflare Web Analytics 服务端接口，各人看到的是同一份数据；本地预览无 Pages Functions 时显示「未接入访问统计」 |
| 统计一直显示「未接入访问统计」 | 检查 `PUBLIC_CF_BEACON_TOKEN` 与 `CF_ACCOUNT_ID` / `CF_API_TOKEN` / `CF_SITE_TAG` 四个变量是否都已配置并重新部署 |
| 统计接口返回 502 | 常见原因是 API Token 权限不足（需 Account → Account Analytics → Read）或账号不在美国元数据边界 |
| Git push 被拒绝 | 先检查本地改动与远程提交，处理同步或冲突，不要 force push |
| Cloudflare 看不到自己的仓库 | 检查 GitHub App 授权的账户和仓库范围；组织仓库可能还需批准 |

若怀疑后台接口问题，在正式站按 F12 → Network，点击登录或保存，检查 `/api/admin/...` 的 HTTP 状态及响应。分享截图前遮住 Cookie、Token、密码、数据库连接串和私人内容。

<a id="step-15"></a>

## 15. 上线验收清单

### 前台

- [ ] 标题、昵称、头像、关于页不再保留占位内容。
- [ ] 导航、文章详情、返回按钮和友链可正常跳转。
- [ ] 非主页没有错误显示首页大头像或左侧首页组件。
- [ ] 桌面和手机布局正常，没有横向溢出。
- [ ] 深浅主题、主题颜色与动态背景正常。
- [ ] 农历日历能切换月份；切换页面返回后时间继续更新。
- [ ] 日记日期能进入对应详情，多张置顶卡片能切换。
- [ ] 搜索能找到已发布文章。
- [ ] 环境变量 `SITE_URL` 已填正式地址，生成的链接不再指向本地地址。
- [ ] 示例内容已按需要保留或删除。

### 后台

- [ ] 未登录无法读写管理接口。
- [ ] 使用自己的密码可以登录并读到自己的文章。
- [ ] 新建、保存草稿、发布、隐藏与删除符合预期。
- [ ] 发布后 GitHub 有提交，Pages 自动构建，前台最终更新。
- [ ] 音乐、友链、荣誉墙配置可保存。
- [ ] Token 只授权自己的博客仓库，已记录过期时间。
- [ ] 未将任何真实凭据提交到 GitHub。

### 可选服务

- [ ] 音乐可播放、切歌、拖动进度、调音量，站内切页持续播放。
- [ ] 访客可以提交测试留言，接口为同域 /api/twikoo。
- [ ] Twikoo 管理员可以处理留言，普通访客没有管理权限。
- [ ] 留言板切页返回后仍正常，D1 数据已用 wrangler d1 export 独立备份。
- [ ] 自定义域名与 HTTPS 正常，手机流量也能测试。
- [ ] 统计只展示 Cloudflare Web Analytics 的真实数据；未接入时显示「未接入访问统计」，不用本地假数据凑数。

<a id="step-16"></a>

## 16. 配置速查与官方资料

### 16.1 文件入口

```text
项目根目录/
├── astro.config.mjs          正式站点地址
├── src/
│   ├── config.ts             标题、头像、导航、主题与公开链接
│   ├── content/
│   │   ├── posts/*.md        一篇文章一个文件
│   │   └── diary/*.md        一篇日记一个文件
│   ├── data/
│   │   ├── music.md          本地音乐歌单
│   │   ├── friends.md        友链
│   │   ├── honors.md         荣誉墙
│   │   ├── guestbook.md      留言板服务地址
│   │   └── quotes.ts         语录
│   └── pages/
│       ├── about.astro       个人介绍
│       └── admin/index.astro 后台页面
├── public/
│   ├── images/               头像与图片
│   └── audio/                音频
├── functions/
│   ├── api/admin/            Cloudflare 后台接口
│   ├── api/twikoo/           留言板后端（Twikoo）
│   └── vendor/twikoo/        Twikoo 适配器与建表脚本
├── templates/                可复制的文章与日记模板
├── wrangler.toml             Cloudflare Pages 配置（含 D1 绑定）
├── .env.example              变量名示例，不含真实密码
└── pnpm-lock.yaml            应提交的依赖锁文件
```

### 16.2 继续阅读

- 功能与使用手册：仓库中的 `docs/USAGE.zh-CN.md`
- 文章与日记完整格式：仓库中的 `docs/CONTENT_GUIDE.md`
- 后台配置速查：仓库中的 `docs/admin-deployment.md`
- 模板清理与验证记录：仓库中的 `docs/TEMPLATE_REVIEW.md`
- 源码许可证：仓库根目录的 `LICENSE`

### 16.3 官方资料

这些链接供遇到界面或平台政策变化时核对，不需要全部通读再开始：

- [Cloudflare Pages：Git 集成创建项目](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages：Astro](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Cloudflare Pages：构建镜像与版本设置](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Cloudflare Pages：Functions 环境变量与 Secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages：自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages：平台限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare：Web Analytics 概览](https://developers.cloudflare.com/web-analytics/)
- [Cloudflare：Web Analytics GraphQL API](https://developers.cloudflare.com/analytics/graphql-api/)
- [GitHub：创建模板仓库的项目](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
- [GitHub：管理 Personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Twikoo：部署方式](https://twikoo.js.org/backend.html)
- [Twikoo：前端与管理员入口](https://twikoo.js.org/frontend.html)
- [Cloudflare Pages：Wrangler 配置与绑定](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare：D1 数据库](https://developers.cloudflare.com/d1/)

