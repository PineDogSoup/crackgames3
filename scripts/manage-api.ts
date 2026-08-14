import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import type { Plugin } from "vite";

import { readCompetitionSource, SOURCE_DATA_PATH } from "./competition-files";
import { applyScheduleToSource, applyScoresToSource } from "./manage-data";
import { scoresFromScoreEvents } from "../src/domain/scoreboard";
import type { Scores } from "../src/domain/types";
import type {
  ManagerDraftFile,
  ManagerGitState,
  ManagerScope,
  ManagerState,
  PublishResult,
  ScheduleDraft
} from "../src/manage/types";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = resolve(".");
const DRAFT_PATH = resolve(".local-data/competition-manager.json");
const PUBLIC_DATA_PATH = resolve("public/data/competition.json");
const SOURCE_DATA_FILE = "source-data/competition.json";
const PUBLIC_DATA_FILE = "public/data/competition.json";
const PAGES_URL = "https://pinedogsoup.github.io/crackgames3/";
const ACTIONS_URL = "https://github.com/PineDogSoup/crackgames3/actions";

interface SaveRequest {
  scope: ManagerScope;
  schedule?: ScheduleDraft;
  scores?: Scores;
}

function emptyDraft(): ManagerDraftFile {
  return { savedAt: {} };
}

async function readDraft(): Promise<ManagerDraftFile> {
  try {
    return JSON.parse(await readFile(DRAFT_PATH, "utf8")) as ManagerDraftFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDraft();
    throw error;
  }
}

async function writeTextAtomic(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, value, "utf8");
  await rename(temporaryPath, path);
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeDraft(draft: ManagerDraftFile): Promise<void> {
  await writeJsonAtomic(DRAFT_PATH, draft);
}

function safeRemoteUrl(remote: string): string {
  return remote.replace(/\/\/[^/@]+@/, "//").trim();
}

async function run(command: string, args: string[], timeout = 120_000): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout
    });
    return stdout.trim();
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    const detail = `${failure.stderr ?? ""}\n${failure.stdout ?? ""}`.trim();
    throw new Error(detail || failure.message);
  }
}

async function tryRun(command: string, args: string[]): Promise<string> {
  try {
    return await run(command, args, 20_000);
  } catch {
    return "";
  }
}

function parseAheadBehind(value: string): { ahead: number; behind: number } {
  const [aheadText = "0", behindText = "0"] = value.trim().split(/\s+/);
  return {
    ahead: Number(aheadText) || 0,
    behind: Number(behindText) || 0
  };
}

async function getGitState(): Promise<ManagerGitState> {
  const [branch, remote, userName, userEmail, status, counts] = await Promise.all([
    tryRun("git", ["branch", "--show-current"]),
    tryRun("git", ["remote", "get-url", "origin"]),
    tryRun("git", ["config", "user.name"]),
    tryRun("git", ["config", "user.email"]),
    tryRun("git", ["status", "--porcelain"]),
    tryRun("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"])
  ]);
  const { ahead, behind } = parseAheadBehind(counts);

  return {
    branch,
    remote: safeRemoteUrl(remote),
    userName,
    userEmail,
    dirtyFiles: status.split("\n").map((line) => line.trim()).filter(Boolean),
    ahead,
    behind,
    identityConfigured: Boolean(userName && userEmail)
  };
}

async function getManagerState(): Promise<ManagerState> {
  const [source, draft, git] = await Promise.all([
    readCompetitionSource(),
    readDraft(),
    getGitState()
  ]);

  return {
    source,
    schedule: draft.schedule ?? {
      groups: structuredClone(source.groups),
      eventSchedule: structuredClone(source.eventSchedule)
    },
    scores: draft.scores ?? scoresFromScoreEvents(source.scoreEvents),
    savedAt: draft.savedAt,
    git
  };
}

function assertSaveRequest(request: SaveRequest): void {
  if (request.scope === "schedule" && !request.schedule) {
    throw new Error("缺少赛程数据");
  }
  if (request.scope === "scores" && !request.scores) {
    throw new Error("缺少成绩数据");
  }
}

async function saveLocal(request: SaveRequest): Promise<ManagerState> {
  assertSaveRequest(request);
  const draft = await readDraft();
  const savedAt = new Date().toISOString();

  if (request.scope === "schedule") draft.schedule = structuredClone(request.schedule!);
  if (request.scope === "scores") draft.scores = structuredClone(request.scores!);
  draft.savedAt[request.scope] = savedAt;
  await writeDraft(draft);
  return getManagerState();
}

async function syncMainBranch(): Promise<void> {
  const before = await getGitState();
  if (before.branch !== "main") {
    throw new Error(`当前分支是 ${before.branch || "未知"}，请切换到 main 后再发布`);
  }
  if (!before.remote) throw new Error("没有找到 origin 远端仓库");
  if (!before.identityConfigured) {
    throw new Error("尚未配置 Git 提交身份，请先设置 git config user.name 和 user.email");
  }
  const dirtyDataFiles = await tryRun("git", [
    "status",
    "--porcelain",
    "--",
    SOURCE_DATA_FILE,
    PUBLIC_DATA_FILE
  ]);
  if (dirtyDataFiles) {
    throw new Error("赛事数据文件已有未提交修改，请先处理后再发布；本地草稿不会丢失");
  }

  await run("git", ["fetch", "origin", "main"], 120_000);
  const afterFetch = await getGitState();
  if (afterFetch.ahead > 0) {
    throw new Error("本地存在尚未推送的提交，请先处理这些提交后再发布");
  }
  if (afterFetch.behind > 0) {
    if (afterFetch.dirtyFiles.length > 0) {
      throw new Error("GitHub 上已有新版本且本地还有未提交修改，请先处理本地修改再同步");
    }
    await run("git", ["pull", "--ff-only", "origin", "main"], 120_000);
  }
}

async function clearPublishedDraft(scope: ManagerScope): Promise<void> {
  const draft = await readDraft();
  delete draft[scope];
  delete draft.savedAt[scope];
  await writeDraft(draft);
}

async function publish(request: SaveRequest): Promise<PublishResult> {
  await saveLocal(request);
  await syncMainBranch();

  const [source, draft] = await Promise.all([readCompetitionSource(), readDraft()]);
  const nextSource = request.scope === "schedule"
    ? applyScheduleToSource(source, draft.schedule!)
    : applyScoresToSource(source, draft.scores!);

  const [previousSource, previousPublicData] = await Promise.all([
    readFile(SOURCE_DATA_PATH, "utf8"),
    readFile(PUBLIC_DATA_PATH, "utf8")
  ]);
  await writeJsonAtomic(SOURCE_DATA_PATH, nextSource);
  try {
    await run("pnpm", ["data:validate"], 120_000);
    await run("pnpm", ["test"], 180_000);
    await run("pnpm", ["build"], 240_000);
  } catch (error) {
    await Promise.all([
      writeTextAtomic(SOURCE_DATA_PATH, previousSource),
      writeTextAtomic(PUBLIC_DATA_PATH, previousPublicData)
    ]);
    throw error;
  }
  await run("git", ["add", "--", SOURCE_DATA_FILE, PUBLIC_DATA_FILE]);

  const label = request.scope === "schedule" ? "schedule" : "scores";
  await run("git", ["commit", "-m", `data: publish ${label}`]);
  const commit = await run("git", ["rev-parse", "--short", "HEAD"]);
  await run("git", ["push", "origin", "main"], 180_000);
  await clearPublishedDraft(request.scope);

  return {
    message: "已推送到 GitHub，GitHub Pages 正在部署",
    commit,
    pagesUrl: PAGES_URL,
    actionsUrl: ACTIONS_URL,
    state: await getManagerState()
  };
}

async function readBody(request: IncomingMessage): Promise<SaveRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as SaveRequest;
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

export function localManagerPlugin(): Plugin {
  return {
    name: "local-competition-manager",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (!pathname.startsWith("/__manage/api/")) {
          next();
          return;
        }

        try {
          if (request.method === "GET" && pathname === "/__manage/api/state") {
            sendJson(response, 200, await getManagerState());
            return;
          }
          if (request.method === "POST" && pathname === "/__manage/api/save") {
            sendJson(response, 200, await saveLocal(await readBody(request)));
            return;
          }
          if (request.method === "POST" && pathname === "/__manage/api/publish") {
            sendJson(response, 200, await publish(await readBody(request)));
            return;
          }
          sendJson(response, 404, { error: "接口不存在" });
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : "操作失败"
          });
        }
      });
    }
  };
}
