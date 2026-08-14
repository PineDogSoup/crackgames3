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
