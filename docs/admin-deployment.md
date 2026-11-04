# 后台配置

第一次部署请先看 [从零部署完整指南](DEPLOYMENT.zh-CN.md)，其中有 GitHub Token 创建、Cloudflare 变量位置、重新部署和登录验收的逐步说明。本页用于配置速查。

后台页面位于 `/admin/`，服务端代码位于 `functions/api/admin/`。它使用 GitHub Contents API 编辑 Markdown，无需单独数据库。

## 1. 为自己的仓库创建 Token

创建 GitHub Fine-grained personal access token：

- 只选择你自己的博客仓库。
- Contents：Read and write。
- Metadata：Read-only。

复制 Token，用于下一步的 Cloudflare Secret。不要写进源码或前台配置。

## 2. Cloudflare Pages 服务端变量

在 Pages 项目设置中找到 Variables and Secrets / 环境变量区域，配置生产环境。界面名称可能随控制台更新；修改变量后创建新部署才会生效。

| 名称 | 填写方式 |
| --- | --- |
| GITHUB_TOKEN | 上一步的 Token，保存为 Secret |
| GITHUB_OWNER | 你自己的 GitHub 用户名或组织 |
| GITHUB_REPO | 新博客的仓库名 |
| GITHUB_BRANCH | 部署分支，通常为 main |
| ADMIN_PASSWORD | 你自己的随机长密码，保存为 Secret |
| ADMIN_SESSION_SECRET | 与密码不同的随机长字符串，保存为 Secret |
| ADMIN_EMAIL | 可选的管理员显示信息 |

生成随机值的本地命令（分别运行两次用于密码和签名密钥）：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

模板不附带可用凭据，未配置时不能登录或访问任何人的仓库。

## 3. 打开后台

Pages 自动部署完成后访问 `https://你的域名/admin/`，输入自己设置的 ADMIN_PASSWORD。

后台支持文章、日记、音乐文件与歌单、荣誉墙和友链管理。留言内容由你自己的 Twikoo 管理入口处理；博客后台不保存留言数据库。

保存会向 GitHub 创建提交；前台需要等待 Pages 新构建上线。预览环境应配置独立测试仓库或测试分支，否则也可能改动正式仓库。

## 本地预览的限制

`pnpm dev` 和 `pnpm preview` 可以展示后台界面，但不提供 Cloudflare Pages Functions API，因此本地登录失败不表示页面损坏。完整后台需部署到 Cloudflare Pages，或自行使用 Wrangler Pages 的本地环境。

## 凭据与内容

服务端密钥使用 Cloudflare Secret；不要放在 PUBLIC_ 或 VITE_ 开头的变量中。Token 应只授权目标仓库。draft 和 hidden 仅控制站点显示，公开 GitHub 仓库中的源文件仍可被读取。
