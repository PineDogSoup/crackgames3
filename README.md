# Crack Games III Web

Crack Game III 的手机优先赛事网页。项目把原微信小程序的公开展示功能重构为 GitHub Pages 静态站，不包含微信云开发、登录鉴权、云数据库或公网写入接口。

目标站点：<https://pinedogsoup.github.io/crackgames3/>

## 功能

- 比赛页：赛事海报、全天时间安排、Heat 与队伍展开、总成绩榜
- 项目页：Event 1/2/3 规则、项目内容和单项成绩榜
- 赛程页：团队组别时间线、Heat、lane、队伍和队员
- 排名算法：原项目的成绩标准化、100–50 积分、总榜与 Heat 重排规则
- 移动端 UI：支持 320–480px，兼容底部安全区；大屏显示居中的移动端容器
- 静态发布：所有页面和数据均可由 GitHub Pages 托管

当前公开数据包含 14 支队伍、3 个比赛项目和 1 个团队组别。未录入成绩时，各排名表仍会完整展示所有队伍。

## 技术栈

- Node.js 24
- pnpm 11
- Vite 8
- React 19
- TypeScript 7
- Vitest 4

项目采用 hash 导航：

- `#/competition`
- `#/events`
- `#/schedule`

这样直接打开或刷新页面时，不需要 GitHub Pages 提供服务端路由回退。

## 本地开发

```sh
pnpm install
pnpm dev
```

开发地址默认是：

<http://localhost:5173/crackgames3/>

常用检查命令：

```sh
pnpm data:validate  # 校验源赛事数据
pnpm data:build     # 生成网页读取的赛事数据
pnpm check          # TypeScript 检查
pnpm test           # 单元测试与数据测试
pnpm build          # 生成数据、检查类型并构建 dist
pnpm preview        # 本地预览生产构建
```

## 更新赛事数据

唯一需要手工维护的赛事数据是：

```text
source-data/competition.json
```

更新流程：

1. 修改 `source-data/competition.json`。
2. 运行 `pnpm data:validate`，确认队伍、项目、Heat 和引用完整。
3. 运行 `pnpm data:build`，生成 `public/data/competition.json`。
4. 运行 `pnpm test` 和 `pnpm build`。
5. 检查页面后再提交两个 JSON 文件和相关代码。

不要直接维护 `public/data/competition.json`。它是生成文件，包含 hydrated 队伍、单项榜、总榜、录入结构和 `generatedAt`。

## 本地管理工具

本地管理工具提供“赛程管理”和“成绩管理”两个标签，只在本机运行，不会进入 GitHub Pages 的生产构建。

```sh
pnpm manage
```

默认打开：

<http://127.0.0.1:4174/manage.html>

每个管理标签底部有两项操作：

- **保存本地**：把当前标签写入 `.local-data/competition-manager.json` 草稿，不修改 Git，也不会更新网站。
- **发布到网站**：同步远端 `main`，把当前标签合并到最新赛事数据，运行校验、测试和构建，只提交两个赛事 JSON，然后推送 `origin/main`。GitHub Actions 会自动部署 Pages。

### GitHub 推送权限

公开仓库允许任何人查看和 clone，但不代表任何人都能更新成绩。当前工具会直接推送 `origin/main`，因此发布者必须同时满足：

- 是仓库所有者，或者已被仓库所有者添加为 GitHub Collaborator 并接受邀请。
- GitHub 账号对本仓库拥有写权限。
- 本机 Git 已完成 HTTPS 或 SSH 认证。
- `main` 没有禁止该账号直接推送的分支保护规则。如果以后开启“必须通过 Pull Request”，本工具的直接发布会被 GitHub 拒绝。

仓库所有者可以在 GitHub 仓库的 **Settings → Collaborators** 中邀请另一位管理员。不要共享 GitHub 密码或 token，每位管理员应使用自己的 GitHub 账号和本机凭证。

### 第二位管理员首次配置

1. 接受仓库所有者发送的 GitHub Collaborator 邀请。
2. 安装 Node.js 24 或更高版本。
3. clone 仓库并进入项目：

```sh
git clone https://github.com/PineDogSoup/crackgames3.git
cd crackgames3
```

4. 安装项目固定版本的 pnpm：

```sh
npm install --global pnpm@11.19.0
hash -r
pnpm --version
```

`pnpm --version` 应显示 `11.19.0`。如果暂时不想全局安装，也可以先执行 `npx --yes pnpm@11.19.0 install`，但正式发布建议安装固定版本的 pnpm。

5. 安装依赖并配置自己的 Git 提交身份：

```sh
pnpm install
git config user.name "你的名字"
git config user.email "你的 GitHub 邮箱"
```

6. 确认远端、分支和推送权限：

```sh
git remote -v
git branch --show-current
git pull --ff-only origin main
git push --dry-run origin main
```

远端应是 `PineDogSoup/crackgames3.git`，当前分支应是 `main`，最后两条命令不应报权限错误。

### 每次更新成绩

1. 进入仓库并取得 GitHub 最新版本：

```sh
cd crackgames3
git pull --ff-only origin main
pnpm manage
```

2. 保持终端窗口运行，在自动打开的 <http://127.0.0.1:4174/manage.html> 中进入“成绩管理”。
3. 录入成绩并检查实时排名、积分和 Heat 安排。
4. 点击 **保存本地**，确认页面显示“成绩已保存到本地”。这一步不会更新网站。
5. 点击 **发布到网站**，再在确认框中点击 **确认发布**。
6. 等待页面显示“已推送到 GitHub”和 commit 编号。在此之前不要关闭终端或管理页面。
7. 在 GitHub Actions 中确认 **Deploy to GitHub Pages** 成功，再刷新公开网站。

发布过程中工具会检查：当前分支是否为 `main`、远端是否有更新、Git 提交身份是否完整，以及赛事 JSON 是否存在工具之外的未提交修改。发布成功后只会提交：

```text
source-data/competition.json
public/data/competition.json
```

如果发布失败，本地草稿仍保存在 `.local-data/competition-manager.json`。先阅读页面上的红色错误提示，不要重复录入成绩。工具不会读取或保存 GitHub token，所有 push 都使用管理员电脑现有的 Git 凭证。

## 目录结构

```text
.github/workflows/     GitHub Pages 构建与发布
public/assets/         公开图片资源
public/data/           生成后的网页数据
scripts/               数据校验与生成脚本
source-data/           唯一手工维护的数据源
src/app/               应用入口与页面切换
src/components/        导航、状态和排名组件
src/data/              浏览器数据加载
src/domain/            类型、排名与 Heat 业务规则
src/pages/             比赛、项目、赛程三个公开页面
src/styles/            手机优先样式
tests/                 算法和数据测试
```

## GitHub Pages 发布

`.github/workflows/deploy-pages.yml` 会在 `main` 分支更新时执行以下流程：

1. 安装固定版本的 Node.js 与 pnpm。
2. 校验赛事数据。
3. 运行全部测试。
4. 以 `/crackgames3/` 为基础路径生成 `dist/`。
5. 上传并发布 GitHub Pages artifact。

首次发布还需要在仓库的 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。本地验收完成前不应推送。

## 数据与安全边界

- 网站只读，不提供公网成绩录入或赛程管理。
- 数据更新通过本地 JSON、测试、Git 提交和 GitHub Actions 完成。
- 仓库不得加入微信 appid、CloudBase envId、OPENID、管理员密码、GitHub token 或其他凭证。
- 原小程序导出包不属于本仓库，也不会随网页发布。
