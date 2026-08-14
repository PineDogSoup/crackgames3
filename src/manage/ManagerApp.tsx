import { useEffect, useMemo, useState } from "react";

import { loadManagerState, publishManagerDraft, saveManagerDraft } from "./api";
import { ScheduleManager } from "./ScheduleManager";
import { ScoreManager } from "./ScoreManager";
import type { ManagerScope, ManagerState } from "./types";

type ManagerTab = "schedule" | "scores";
type BusyState = { scope: ManagerScope; action: "save" | "publish" } | null;

interface Notice {
  kind: "success" | "error";
  text: string;
  commit?: string;
}

function remoteLabel(remote: string): string {
  return remote.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "") || "未配置";
}

export function ManagerApp() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("schedule");
  const [managerState, setManagerState] = useState<ManagerState | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [dirty, setDirty] = useState<Record<ManagerScope, boolean>>({ schedule: false, scores: false });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pendingPublish, setPendingPublish] = useState<ManagerScope | null>(null);
  const teamNames = useMemo(() => new Map(
    managerState?.source.teams.map((team) => [team.id, team.name]) ?? []
  ), [managerState?.source.teams]);

  useEffect(() => {
    loadManagerState()
      .then(setManagerState)
      .catch((error: unknown) => setLoadError(
        error instanceof Error ? error.message : "本地管理工具加载失败"
      ));
  }, []);

  async function save(scope: ManagerScope): Promise<void> {
    if (!managerState) return;
    setBusy({ scope, action: "save" });
    setNotice(null);
    try {
      const nextState = await saveManagerDraft(
        scope,
        managerState.schedule,
        managerState.scores
      );
      setManagerState(nextState);
      setDirty((current) => ({ ...current, [scope]: false }));
      setNotice({ kind: "success", text: scope === "schedule" ? "赛程已保存到本地" : "成绩已保存到本地" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setBusy(null);
    }
  }

  async function publish(scope: ManagerScope): Promise<void> {
    if (!managerState) return;
    setPendingPublish(null);
    setBusy({ scope, action: "publish" });
    setNotice(null);
    try {
      const result = await publishManagerDraft(
        scope,
        managerState.schedule,
        managerState.scores
      );
      setManagerState(result.state);
      setDirty((current) => ({ ...current, [scope]: false }));
      setNotice({ kind: "success", text: result.message, commit: result.commit });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "发布失败" });
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <main className="manager-load-state">
        <div className="panel" role="alert"><strong>管理工具加载失败</strong><p>{loadError}</p></div>
      </main>
    );
  }

  if (!managerState) {
    return (
      <main className="manager-load-state">
        <div className="panel" role="status"><span className="loading-dot" /><strong>正在加载本地赛事数据</strong></div>
      </main>
    );
  }

  const activeBusy = busy?.scope === activeTab ? busy.action : null;

  return (
    <div className="manager-shell">
      <header className="manager-topbar">
        <div className="manager-brand">
          <span>CRACK GAMES III</span>
          <strong>本地管理工具</strong>
        </div>
        <div className="manager-git-state" aria-label="Git 状态">
          <span className={managerState.git.branch === "main" ? "is-ready" : "is-warning"}>
            {managerState.git.branch || "未知分支"}
          </span>
          <strong>{remoteLabel(managerState.git.remote)}</strong>
          <small>
            {managerState.git.identityConfigured
              ? `${managerState.git.userName} · ${managerState.git.ahead} ahead / ${managerState.git.behind} behind`
              : "尚未配置 Git 提交身份"}
          </small>
        </div>
      </header>

      <nav className="manager-main-tabs" aria-label="管理工具主导航">
        <button
          type="button"
          className={activeTab === "schedule" ? "is-active" : ""}
          aria-current={activeTab === "schedule" ? "page" : undefined}
          onClick={() => setActiveTab("schedule")}
        >
          <span>01</span>赛程管理
        </button>
        <button
          type="button"
          className={activeTab === "scores" ? "is-active" : ""}
          aria-current={activeTab === "scores" ? "page" : undefined}
          onClick={() => setActiveTab("scores")}
        >
          <span>02</span>成绩管理
        </button>
      </nav>

      {notice ? (
        <div className={`manager-notice is-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          <strong>{notice.kind === "error" ? "操作未完成" : "操作完成"}</strong>
          <span>{notice.text}{notice.commit ? ` · commit ${notice.commit}` : ""}</span>
        </div>
      ) : null}

      <main className="manager-main">
        {activeTab === "schedule" ? (
          <ScheduleManager
            schedule={managerState.schedule}
            teamNames={teamNames}
            savedAt={managerState.savedAt.schedule}
            dirty={dirty.schedule}
            busy={activeBusy}
            onChange={(schedule) => {
              setManagerState((current) => current ? { ...current, schedule } : current);
              setDirty((current) => ({ ...current, schedule: true }));
            }}
            onSave={save}
            onPublish={setPendingPublish}
          />
        ) : (
          <ScoreManager
            source={managerState.source}
            schedule={managerState.schedule}
            scores={managerState.scores}
            savedAt={managerState.savedAt.scores}
            dirty={dirty.scores}
            busy={activeBusy}
            onChange={(scores) => {
              setManagerState((current) => current ? { ...current, scores } : current);
              setDirty((current) => ({ ...current, scores: true }));
            }}
            onSave={save}
            onPublish={setPendingPublish}
          />
        )}
      </main>

      {pendingPublish ? (
        <div className="manager-dialog-backdrop" role="presentation">
          <div className="manager-dialog panel" role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title">
            <span className="manager-dialog-kicker">PUBLISH TO MAIN</span>
            <h2 id="publish-dialog-title">确认发布{pendingPublish === "schedule" ? "赛程" : "成绩"}？</h2>
            <p>工具会先同步 GitHub 最新版本，然后生成赛事数据、运行测试并推送到 main。推送成功后 GitHub Pages 会自动部署。</p>
            <div className="manager-dialog-actions">
              <button type="button" className="manager-button manager-dialog-cancel" onClick={() => setPendingPublish(null)}>
                取消
              </button>
              <button type="button" className="manager-button manager-button-primary" onClick={() => publish(pendingPublish)}>
                确认发布
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
