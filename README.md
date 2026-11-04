# 枫栈

林枫枫的个人博客。基于 Astro、Svelte、Tailwind CSS 和 Fuwari，保留首页大头像、动态背景、文章、心情日历与日记、音乐播放器、友链、荣誉墙、小游戏、深浅主题、搜索和可选后台。

配色为墨蓝主色 + 枫叶金点缀（`themeColor.hue = 252`），站点名「枫栈」、作者名「林枫枫」。

此版本不含个人音频、真实联系方式和真实留言数据；友链与荣誉墙为空模板，待填入真实内容。留言后端（Twikoo）已集成进同域 /api/twikoo，部署 Cloudflare 后即可用。

上游模板仓库：[23ypz/blog_template](https://github.com/23ypz/blog_template)。

**第一次使用：请从 [从零部署完整指南](docs/DEPLOYMENT.zh-CN.md) 开始。** 按顺序完成创建自己的 GitHub 仓库、本地预览、Cloudflare Pages 上线、后台管理，以及音乐、日记、友链、荣誉墙和留言服务配置；附常见错误排查与上线验收清单。

同一份完整教程已作为公开文章放入 [src/content/posts/blog-deployment-guide.md](src/content/posts/blog-deployment-guide.md)，部署后可在首页、文章总览或 `/posts/blog-deployment-guide/` 阅读。后续修改教程时，请同步更新文档版和文章版。

## 本地预览

建议使用 Node.js 22，以及 pnpm 9.14.4。先将自己的仓库 clone 到本地，下面以 `D:\Projects\my-blog` 为例：

```powershell
cd D:\Projects\my-blog
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

打开终端显示的地址，通常是 `http://localhost:4321/`。停止服务按 Ctrl+C。

```powershell
corepack pnpm build
corepack pnpm preview
```

构建命令会生成静态页面和 Pagefind 搜索索引。开发模式不生成完整搜索索引，搜索请用 build + preview 验证。

### 本机环境适配（D:\博客）

这台机器上实际生效的配置与上游模板有三点差异：

| 项目 | 上游模板 | 本机实际 |
| --- | --- | --- |
| Node | 建议 22 | v24.21.0 |
| pnpm | `pnpm@9.14.4` | `pnpm@11.22.0`（`packageManager` 字段未改，装依赖不受影响） |
| Pagefind | 依赖平台包自动选择 | 额外装了 `@pagefind/windows-x64@1.4.0`，否则 `pnpm build` 的 pagefind 步骤在 Windows 上找不到二进制 |

`pnpm install --frozen-lockfile` 在本机验证通过，`pnpm check` 为 0 errors / 0 warnings / 1 hint（上游插件的未使用参数提示），`pnpm build` 产出 13 个页面并为 5 篇内容建立 Pagefind 索引。

## 修改入口

| 内容 | 文件 |
| --- | --- |
| 标题、头像、昵称、简介、导航、主题色、社交链接 | `src/config.ts` |
| 网站正式地址（影响 sitemap、RSS、规范链接） | `astro.config.mjs` 的 site |
| 关于页面的城市、专业、兴趣和介绍 | `src/pages/about.astro`（城市/专业取自 `src/config.ts` 的 `location` / `occupation`，留空则整行不显示） |
| 首页兴趣标签 | `src/components/HomeHero.astro` |
| 文章、日记 | `src/content/posts/`、`src/content/diary/` |
| 荣誉墙、友链、歌单、留言板配置 | `src/data/` |
| 随机语录 | `src/data/quotes.ts` |
| 头像与横幅图片 | `public/images/avatar.svg`、`public/images/banner.svg` |

[完整部署指南](docs/DEPLOYMENT.zh-CN.md) · [写作与使用文档](docs/USAGE.zh-CN.md) · [文章与日记格式](docs/CONTENT_GUIDE.md) · [后台配置](docs/admin-deployment.md) · [模板清理说明](docs/TEMPLATE_REVIEW.md)

## 部署到 Cloudflare Pages

将这个目录上传到你自己的新 GitHub 仓库，连接 Cloudflare Pages：

- 项目类型：Pages，连接 Git 仓库。
- 构建命令：`pnpm build`。
- 输出目录：`dist`。
- 项目根目录：仓库根目录。
- 构建环境变量：`NODE_VERSION=22`、`PNPM_VERSION=9.14.4`。

前台可以直接部署；后台需要同仓库中的 `functions/` 和你自己的服务端环境变量。单独上传 `dist` 只能得到静态页面，不会部署后台接口。保存后台内容后会提交到你的 GitHub，再触发站点重新构建。

## 可选服务

- 留言板：后端已集成（Twikoo + Cloudflare D1，同域 /api/twikoo），部署时创建 D1 并填好 database_id 即可启用。
- 音乐：模板为空歌单，放入自己的音频并填写数据文件后启用。
- 后台：`/admin/`，默认没有密码、Token 和仓库配置，不提供公共演示账户。
- 统计：接入 Cloudflare Web Analytics。配置 `PUBLIC_CF_BEACON_TOKEN` 与三个服务端变量后，首页侧栏显示最近 7 天的真实页面浏览与访问次数；未配置时显示「未接入访问统计」，不使用假数据兜底。


## 来源与许可

框架基于 [Fuwari](https://github.com/saicaca/fuwari) 修改，保留其 [MIT License](LICENSE) 与版权声明。原主题的多语言说明保留作上游参考，本模板的部署与使用以当前 README 和中文使用文档为准。模板附带的 SVG 示例图片由简单矢量图形组成，可以随模板使用；文章页显示的 CC 协议是内容展示配置，与源码 MIT 许可分开设置。
