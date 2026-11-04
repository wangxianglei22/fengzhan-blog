# 枫栈 · 功能使用表

> 站点名「枫栈」· 作者「林枫枫」· 墨蓝主色（`hue: 252`）+ 枫叶金点缀
> 目录：`D:\博客`　构建产物：`dist/`　预览：`http://localhost:4321/`

---

## 一、前台页面（13 个路由）

| 页面 | 网址 | 作用 | 怎么用 | 数据来源 |
| --- | --- | --- | --- | --- |
| 首页 | `/` | 大头像 Hero + 小游戏 + 文章列表（每页 8 篇） | Hero 占满首屏，向下滚动看文章，再往下是分页 | `src/content/posts/` |
| 文章总览 | `/archive/` | 全部文章时间轴 + 按分类/标签筛选 | 点顶部分类标签即筛选（URL 带 `?tag=` / `?category=` / `?uncategorized=true`） | `src/content/posts/` |
| 文章详情 | `/posts/<文件名>/` | 正文、目录 TOC、代码高亮、上一篇/下一篇 | `.md` 的文件名即网址 | 同上 |
| 日记 | `/diary/` | 心情日历 + 置顶日记卡片 + 列表 | 日历上的点可跳到对应日记 | `src/content/diary/` |
| 日记详情 | `/diary/<文件名>/` | 单篇日记正文 | 同上 | 同上 |
| 音乐 | `/music/` | 私人播放器：列表循环 / 单曲循环 / 随机、音量、进度拖拽 | 歌单空时显示「选择一首歌开始播放」 | `src/data/music.md` + `public/audio/` |
| 友链 | `/friends/` | 友链卡片墙 | 当前为空状态「友链名单还在等待添加」 | `src/data/friends.md` |
| 荣誉墙 | `/about/` 内嵌 | 荣誉列表，每页 5 条自动分页 | 当前为空状态「荣誉墙正在等待第一枚勋章」 | `src/data/honors.md` |
| 留言板 | `/guestbook/` | Twikoo 留言（后端在同域 `/api/twikoo`） | `envId` 写 `/api/twikoo` 即启用，写错或后端未部署 → 显示「留言板尚未配置」 | `src/data/guestbook.md` + D1 |
| 关于 | `/about/` | 头像、简介、地址/专业、兴趣清单、荣誉墙 | 地址/专业留空则整行不显示 | `src/config.ts` |
| 后台 | `/admin/` | 内容管理台（需密码） | 见「四、后台」 | Cloudflare Functions |
| RSS | `/rss.xml` | 订阅源 | 放订阅链接 | 自动 |
| 站点地图 | `/sitemap-index.xml` | 搜索引擎索引 | 自动 | 自动 |
| robots | `/robots.txt` | 爬虫规则 | 自动 | 自动 |

---

## 二、右上角工具栏

| 工具 | 位置 | 作用 | 说明 |
| --- | --- | --- | --- |
| 搜索 | 导航栏放大镜 | 全站全文搜索 | **必须 `pnpm build && pnpm preview`**；dev 模式只有假结果（Pagefind 索引只在 build 生成） |
| 外观设置 | 导航栏调色板图标 | 切换亮色 / 暗色 / 跟随系统 + **拖动色相滑块换主题色** | 色相存 localStorage `hue`，默认取 `themeColor.hue`=252；`themeColor.fixed: true` 可隐藏滑块 |
| 菜单 | 导航栏汉堡（移动端） | 移动端抽屉导航 | — |
| 返回顶部 | 右下角 | 回到页面顶部 | — |

---

## 三、首页与侧栏互动

| 功能 | 位置 | 玩法 |
| --- | --- | --- |
| 背景粒子 | 全站背景 | 暗色金+钢蓝 / 亮色暗金+灰蓝，随主题变 |
| 翻卡语录 | 首页小游戏 tab1 | 按主题筛选语录，翻牌看内容 |
| 心情签 | 首页小游戏 tab2 | 抽一个心情 emoji |
| 二选一 | 首页小游戏 tab3 | 随机抛出一个选择题（如「写代码 vs 看剧」） |
| 今日手账 | 文章页侧栏 | 实时时钟、年度进度条、**点语录换一句**（语录池 `src/data/quotes.ts`） |
| 日历 | 文章页侧栏 | 本月视图，标出今天/节日/有文章的日期，显示本月文章数 |
| 分类 / 标签 | 文章页侧栏 | 点击跳转归档页对应筛选 |
| 站点统计 | 首页侧栏 | 见下方「八、站点统计的真实情况」 |

---

## 四、后台 `/admin/`（Cloudflare Pages Functions）

| 模块           | 能做什么                                                         | 关键点                                           |
| ------------ | ------------------------------------------------------------ | --------------------------------------------- |
| 登录           | 密码登录，会话存 Cookie                                              | 需先配 `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` |
| 文章           | 列表 / 新建 / 编辑 / 删除、Markdown 工具栏、**保存草稿 vs 发布**、封面、分类、语言、摘要、标签 | 保存后自动提交到 GitHub 触发重新构建                        |
| 日记           | 同上 + 表情选择器（心情）、置顶开关                                          | —                                             |
| 音乐           | 歌单编辑 + **上传本地音频**（提交到 `public/audio/`）                       | —                                             |
| 荣誉墙          | 条目增删改                                                        | —                                             |
| 友链           | 条目增删改                                                        | —                                             |
| 留言板          | 跳转到 Twikoo 管理页 `/guestbook/?admin=1`                         | 需 Twikoo 后端已部署并绑定 D1                      |
| 插入模板         | 在编辑器里插入空白模板                                                  | —                                             |
| Markdown 工具栏 | H₂ / B / I / ❝ / 列表 / 链接 / 代码 / 图片 / 表格 / 分割线 / 表情           | —                                             |

> ⚠️ **本地预览打不开后台 API**：`/api/admin/login` 在 `pnpm preview` 下返回 404，因为 `functions/` 只在 Cloudflare Pages 部署后生效。本地测后台需 `wrangler pages dev`，或直接部署到 Cloudflare。

---

## 五、配置入口速查

| 想改什么 | 改哪里 |
| --- | --- |
| 站点名 / 副标题 / 作者 / 简介 / 地址 / 职业 / 社交图标 | `src/config.ts` → `siteConfig` / `profileConfig` |
| 主题色相 | `src/config.ts:10` → `themeColor.hue`（当前 252） |
| 全站配色变量 | `src/styles/variables.styl`（`--primary`、`--accent` 等 30+ 个） |
| 导航栏菜单 | `src/config.ts` → `navBarConfig.links` |
| 目录层级深度 | `src/config.ts` → `toc.depth`（当前 2） |
| 横幅图 | `src/config.ts` → `banner.enable`（当前 false）+ `public/images/banner.svg` |
| 头像 / favicon | `src/config.ts` → `profileConfig.avatar` / `siteConfig.favicon` |
| 站点运行起始日 | `src/config.ts` → `siteStartedAt`（当前 2026-11-04，统计组件按它算运行时长） |
| 文章许可协议 | `src/config.ts` → `licenseConfig`（当前 CC BY-NC-SA 4.0） |
| **正式域名** | 环境变量 `SITE_URL`（见「六、部署配置」） |
| 随机语录池 | `src/data/quotes.ts` |
| 社交图标 | `src/config.ts` → `profileConfig.links`（当前空数组 → 图标不显示） |

---

## 六、部署配置

### 站点正式地址

`astro.config.mjs` 不再内置任何示例域名，改为读环境变量：

```js
const siteUrl = (process.env.SITE_URL || "http://localhost:4321").replace(/\/+$/, "");
```

- **本地**：不设 `SITE_URL` → 退回 `http://localhost:4321`
- **Cloudflare Pages**：在项目 **Settings → Environment variables** 添加
  - `SITE_URL` = `https://你的域名`（变量名不加 `PUBLIC_` 前缀）
- 影响范围：sitemap、RSS 的 `<link>`、canonical、robots.txt 的 `Sitemap:` 指向、文章页 JSON-LD 的 `author.url`

### 后台所需环境变量（Cloudflare Pages Functions）

```
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
ADMIN_EMAIL=          # 可选，仅用于展示管理员信息
```

敏感值在 Cloudflare 控制台存为 **Secret**。不要使用 `PUBLIC_` / `VITE_` 前缀暴露服务端密钥。参考 `.env.example`。

### 站点统计所需环境变量

| 变量 | 前台 / 服务端 | 说明 |
| --- | --- | --- |
| `PUBLIC_CF_BEACON_TOKEN` | 前台（`PUBLIC_` 前缀，会打进构建产物） | Cloudflare Web Analytics 站点 token，用于注入 beacon 采集脚本 |
| `CF_ACCOUNT_ID` | 服务端 | Cloudflare 账号 ID |
| `CF_API_TOKEN` | 服务端 | API Token，权限含 Account → Account Analytics → Read |
| `CF_SITE_TAG` | 服务端 | Web Analytics 站点 tag |

详见「八、站点统计的真实情况」。

---

## 七、常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 开发服务器（localhost:4321） |
| `pnpm build` | 构建静态页 + Pagefind 搜索索引 |
| `pnpm preview` | 预览构建结果（**搜索功能要在这里才能测**） |
| `pnpm check` | 类型检查（当前 0 errors / 0 warnings / 1 hint，上游插件的未使用参数提示） |
| `pnpm new-post <slug> "标题"` | 生成文章草稿（文件名只能小写字母 + 数字 + 连字符） |
| `pnpm lint` / `pnpm format` | Biome 检查 / 格式化 |
| `PYTHONIOENCODING=utf-8 python scripts/scan-pink.py` | 粉色残留扫描（改配色后自查） |

---

## 八、站点统计的真实情况

「站点统计」组件里的数字**全部来自真实数据**，没有写死的常量，也没有第三方贴链统计的假数据。

| 显示项 | 数据来源 | 是否真实 |
| --- | --- | --- |
| 本站已运行 | `siteConfig.siteStartedAt` 起算，JS 每秒刷新 | ✅ 真实（起点需自己设对） |
| 最近更新 / N 篇文章 / N 个分类 / N 个标签 | 构建时从 `src/content/posts/` 实时统计 | ✅ 真实 |
| 页面浏览 / 访问次数 | 前端请求 `/api/stats`，服务端调 Cloudflare Web Analytics GraphQL API，取最近 7 天 | ✅ 真实（近 7 天为精确值，更早的数据有采样） |

### 数据链路

```text
浏览器
  └─ fetch("/api/stats")
        └─ functions/api/stats.ts（Cloudflare Pages Function，服务端）
              └─ POST https://api.cloudflare.com/client/v4/graphql
                    └─ 数据集 rumPageloadEventsAdaptiveGroups
                          └─ count = 页面浏览，sum.visits = 访问次数
```

同时，`src/layouts/Layout.astro` 会在 `<head>` 注入 Cloudflare 的 beacon 脚本，负责**采集**数据：

```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token":"..."}'></script>
```

### 两种指标的区别

- **页面浏览（page views）**：成功返回 HTML 的页面请求数。
- **访问次数（visits）**：Referer 主机名与本站不同的页面浏览，含直接访问。

Cloudflare **不统计独立访客（unique visitors）、跳出率和停留时长**，所以这里没有「总访客」这一项。

### 需要配置的环境变量

| 变量 | 类型 | 用途 |
| --- | --- | --- |
| `PUBLIC_CF_BEACON_TOKEN` | 前台变量（`PUBLIC_` 前缀） | Web Analytics 站点 token，注入 beacon 脚本。**这是公开标识，不是密钥** |
| `CF_ACCOUNT_ID` | 服务端变量 | Cloudflare 账号 ID |
| `CF_API_TOKEN` | 服务端变量 | API Token，权限需包含 Account → Account Analytics → Read |
| `CF_SITE_TAG` | 服务端变量 | Web Analytics 的站点 tag，在面板 URL 里可以看到 |

不配置时组件显示「未接入访问统计」，**不会用假数字兜底**。

### 注意事项

- Cloudflare 的 RUM 数据集只对**美国元数据边界（US metadata boundary）**的账号返回。
- 采样策略与数据新旧有关：最近几天不采样（`sampleInterval = 1`），更早的数据约 10% 采样。**官方说明采样后的返回值已经按采样率放大，不需要再乘一次。**
- API 配额为 5 分钟内 300 次查询；接口端带 30 分钟缓存。
- 本地 `pnpm preview` 没有 Pages Functions，`/api/stats` 返回 404，属正常现象。

---

## 九、写内容

| 类型 | 位置 | 关键字段 |
| --- | --- | --- |
| 文章 | `src/content/posts/*.md` | `title` `published` `description` `image` `tags` `category` `draft` `hidden` `lang` |
| 日记 | `src/content/diary/*.md` | `title` `date` `mood` `moodLabel` `excerpt` `cover` `tags` `pinned` `draft` |
| 友链 | `src/data/friends.md` | `name` `url` `avatar` `description`（每段 `---` 分隔；`url` 只允许 http(s) 或 `/` 开头的站内路径） |
| 荣誉 | `src/data/honors.md` | `date` `name` `award` `category` `issuer` |
| 音乐 | `src/data/music.md` + `public/audio/` | `title` `artist` `url`（`url` 必须与实际文件名和扩展名完全一致） |
| 留言板 | `src/data/guestbook.md` | `title` `description` `envId`（`envId` 可写 `/api/twikoo` 相对路径或完整 http(s) 地址） |

模板文件：`templates/post-template.md`、`templates/diary-template.md`。
`draft: true` = 草稿（不显示、不进索引），改成 `false` 或删掉该行即发布。

---

## 十、当前待补清单

| 项          | 位置                                      | 说明                          |
| ---------- | --------------------------------------- | --------------------------- |
| ⬜ 正式域名     | 环境变量 `SITE_URL`                         | 未设则生成 `localhost` 链接，部署前必须填 |
| ⬜ 后台环境变量   | Cloudflare Pages                        | 7 个变量见「六」                   |
| ⬜ 社交图标     | `src/config.ts` → `profileConfig.links` | 空数组 → 导航区不显示社交按钮            |
| ⬜ 留言板后端   | Cloudflare Pages + D1                   | 已集成 Twikoo，需 `wrangler login`、创建 D1 并填 `wrangler.toml` 的 `database_id` |
| ⬜ 歌单       | `src/data/music.md` + `public/audio/`   | 放入有权公开播放的音频                 |
| ⬜ 友链 / 荣誉墙 | `src/data/friends.md` / `honors.md`     | 现为带格式说明的空模板                 |
| ⬜ 横幅图      | `src/config.ts` → `banner.enable`       | 当前 false，文章页已用 `banner.svg` |
| ⬜ 示例日记     | `src/content/diary/example-1..4.md`     | 内容可自行替换                     |
| ⬜ 运行时长起点   | `src/config.ts` → `siteStartedAt`       | 当前 2026-11-04               |
| ⬜ 统计环境变量   | Cloudflare Pages                        | 4 个变量见「六」与「八」              |
