#!/usr/bin/env node
/**
 * 枫栈博客 → Cloudflare Pages 一键部署脚本
 *
 * 原理：绕过 wrangler login 的 OAuth（国内线路不稳），改用 API Token +
 *       CLOUDFLARE_ACCOUNT_ID 环境变量驱动 wrangler 的非交互模式。
 *
 * 用法：
 *   node scripts/deploy-cloudflare.mjs --token <API_TOKEN> [--account <ACCOUNT_ID>]
 *
 * 脚本会依次完成：
 *   1. 校验 Token，拉取账号列表，确定 Account ID
 *   2. 创建 D1 数据库（若不存在）并把真实 database_id 写回 wrangler.toml
 *   3. 初始化 D1 表结构
 *   4. 构建静态站（SITE_URL 可用环境变量覆盖）
 *   5. 创建 Pages 项目（若不存在）
 *   6. 部署静态站 + functions/
 *   7. 写入服务端密钥变量（ADMIN_PASSWORD / ADMIN_SESSION_SECRET 等）
 *
 * 敏感值只从环境变量读取，不写进仓库。
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER_TOML = resolve(ROOT, "wrangler.toml");
const CF_API = "https://api.cloudflare.com/client/v4";

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const TOKEN = arg("token") || process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const PROJECT = arg("project") || process.env.PAGES_PROJECT_NAME || "fengzhan-blog";
const SITE_URL = arg("site-url") || process.env.SITE_URL || `https://${PROJECT}.pages.dev`;
const SKIP_BUILD = args.includes("--skip-build");
const SKIP_DEPLOY = args.includes("--skip-deploy");

if (!TOKEN) {
  console.error("缺少 API Token。请用 --token <TOKEN> 传入，或设置环境变量 CLOUDFLARE_API_TOKEN。");
  process.exit(1);
}

// ---------- 工具 ----------
function log(step, msg) {
  console.log(`\n=== [${step}] ${msg} ===`);
}

function run(cmd, argsList, opts = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, argsList, {
      cwd: ROOT,
      shell: process.platform === "win32",
      env: { ...process.env, ...(opts.env || {}) },
      stdio: opts.quiet ? ["pipe", "pipe", "pipe"] : "inherit",
    });
    let out = "";
    if (opts.quiet) {
      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (out += d.toString()));
    }
    if (opts.stdin !== undefined) {
      child.stdin.write(opts.stdin);
      child.stdin.end();
    }
    child.on("close", (code) => resolvePromise({ code, out }));
    child.on("error", (e) => resolvePromise({ code: -1, out: String(e) }));
  });
}

async function cfApi(path, method = "GET", body) {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbSignal(60_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} 返回非 JSON（${res.status}）：${text.slice(0, 200)}`);
  }
  if (!json.success) {
    throw new Error(`${method} ${path} 失败（${res.status}）：${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  return json.result;
}

function AbSignal(ms) {
  return AbortSignal.timeout(ms);
}

async function main() {
  const wranglerEnv = {
    CLOUDFLARE_API_TOKEN: TOKEN,
  };

  // ---------- 1. 校验 Token，确定 Account ID ----------
  log("1/7", "校验 API Token");
  await cfApi("/user/tokens/verify");
  console.log("Token 有效 ✓");

  let accountId = arg("account") || process.env.CLOUDFLARE_ACCOUNT_ID;
  const accounts = await cfApi("/accounts?per_page=20");
  if (!accountId) {
    if (!accounts.length) throw new Error("该 Token 下没有可访问的账号");
    accountId = accounts[0].id;
    console.log(`自动选择账号：${accounts[0].name}（${accountId}）`);
  } else {
    const found = accounts.find((a) => a.id === accountId);
    console.log(`使用指定账号：${found ? found.name : accountId}`);
  }
  wranglerEnv.CLOUDFLARE_ACCOUNT_ID = accountId;

  // ---------- 2. D1 数据库 ----------
  log("2/7", "准备 D1 数据库（留言板存储）");
  let toml = readFileSync(WRANGLER_TOML, "utf8");
  let dbId = toml.match(/database_id\s*=\s*"([^"]+)"/)?.[1];

  const d1List = await cfApi(`/accounts/${accountId}/d1/database`);
  let db = d1List.find((d) => d.name === "twikoo");
  if (!db) {
    console.log("未找到名为 twikoo 的数据库，创建一个…");
    const created = await run("wrangler", ["d1", "create", "twikoo"], { env: wranglerEnv, quiet: true });
    if (created.code !== 0) {
      console.error(created.out);
      throw new Error("wrangler d1 create 失败");
    }
    dbId = created.out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
    if (!dbId) throw new Error(`无法从 wrangler 输出解析 database_id：${created.out.slice(0, 400)}`);
    console.log(`创建成功，database_id = ${dbId}`);
  } else {
    dbId = db.uuid;
    console.log(`已存在：twikoo（${dbId}）`);
  }

  if (toml.includes("00000000-0000-0000-0000-000000000000") || toml.match(/database_id\s*=\s*"([^"]+)"/)?.[1] !== dbId) {
    toml = toml.replace(/(database_id\s*=\s*")[^"]+(")/, `$1${dbId}$2`);
    writeFileSync(WRANGLER_TOML, toml, "utf8");
    console.log("wrangler.toml 已更新 database_id ✓");
  }

  // ---------- 3. 初始化表结构 ----------
  log("3/7", "初始化 D1 表结构");
  const init = await run(
    "wrangler",
    ["d1", "execute", "twikoo", "--remote", "--file=./functions/vendor/twikoo/schema.sql"],
    { env: wranglerEnv, quiet: true },
  );
  console.log(init.code === 0 ? "表结构就绪 ✓" : init.out.slice(-600));

  // ---------- 4. 构建 ----------
  if (!SKIP_BUILD) {
    log("4/7", `构建静态站（SITE_URL=${SITE_URL}）`);
    const build = await run("pnpm", ["build"], {
      env: { SITE_URL, ...(process.env.PUBLIC_CF_BEACON_TOKEN ? { PUBLIC_CF_BEACON_TOKEN: process.env.PUBLIC_CF_BEACON_TOKEN } : {}) },
      quiet: true,
    });
    console.log(build.out.split("\n").filter((l) => /page\(s\)|Indexed|error|Error/i.test(l)).slice(-8).join("\n") || build.out.slice(-400));
    if (build.code !== 0) throw new Error("pnpm build 失败");
  } else {
    log("4/7", "跳过构建（--skip-build）");
  }

  // ---------- 5. Pages 项目 ----------
  log("5/7", "确认 Pages 项目存在");
  const projects = await cfApi(`/accounts/${accountId}/pages/projects`);
  if (!projects.some((p) => p.name === PROJECT)) {
    console.log(`创建 Pages 项目 ${PROJECT}…`);
    const created = await run("wrangler", ["pages", "project", "create", PROJECT, "--production-branch", "main"], {
      env: wranglerEnv,
      quiet: true,
    });
    if (created.code !== 0) {
      console.error(created.out);
      throw new Error("wrangler pages project create 失败");
    }
    console.log("创建成功 ✓");
  } else {
    console.log(`项目已存在：${PROJECT}`);
  }

  // ---------- 6. 部署 ----------
  if (!SKIP_DEPLOY) {
    log("6/7", "部署到 Cloudflare Pages（静态站 + Functions）");
    const deploy = await run(
      "wrangler",
      ["pages", "deploy", "dist", "--project-name", PROJECT, "--branch", "main", "--commit-dirty=true"],
      { env: wranglerEnv, quiet: true },
    );
    console.log(deploy.out.slice(-900));
    if (deploy.code !== 0) throw new Error("wrangler pages deploy 失败");
  } else {
    log("6/7", "跳过部署（--skip-deploy）");
  }

  // ---------- 7. 服务端密钥 ----------
  log("7/7", "写入服务端密钥变量");
  const secrets = [
    ["ADMIN_PASSWORD", process.env.ADMIN_PASSWORD],
    ["ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET],
    ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
    ["GITHUB_OWNER", process.env.GITHUB_OWNER],
    ["GITHUB_REPO", process.env.GITHUB_REPO],
    ["GITHUB_BRANCH", process.env.GITHUB_BRANCH || "main"],
    ["ADMIN_EMAIL", process.env.ADMIN_EMAIL],
    ["CF_ACCOUNT_ID", process.env.CF_ACCOUNT_ID],
    ["CF_API_TOKEN", process.env.CF_API_TOKEN],
    ["CF_SITE_TAG", process.env.CF_SITE_TAG],
  ].filter(([, v]) => v !== undefined && v !== "");

  if (!secrets.length) {
    console.log("没有提供任何密钥环境变量，跳过。");
  } else {
    for (const [key, value] of secrets) {
      const r = await run("wrangler", ["pages", "secret", "put", key, "--project-name", PROJECT], {
        env: wranglerEnv,
        quiet: true,
        stdin: `${value}\n`,
      });
      console.log(`  ${key}: ${r.code === 0 ? "已写入 ✓" : "失败 — " + r.out.slice(-160)}`);
    }
    console.log("提示：密钥写入后需要重新部署一次才会生效。");
  }

  console.log(`\n✅ 全部完成。访问 https://${PROJECT}.pages.dev 验证。`);
}

main().catch((e) => {
  console.error(`\n❌ 部署失败：${e.message}`);
  process.exit(1);
});
