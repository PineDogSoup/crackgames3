import { useEffect, useState } from "react";

import { BottomNav } from "../components/BottomNav";
import { PUBLIC_TABS, type PublicTabId } from "../config";
import { loadCompetition } from "../data/loadCompetition";
import type { CompetitionData } from "../domain/types";
import { CompetitionPage } from "../pages/CompetitionPage";
import { EventsPage } from "../pages/EventsPage";
import { SchedulePage } from "../pages/SchedulePage";

function tabFromHash(): PublicTabId {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return PUBLIC_TABS.some((tab) => tab.id === hash)
    ? hash as PublicTabId
    : "competition";
}

export function App() {
  const [activeTab, setActiveTab] = useState<PublicTabId>(tabFromHash);
  const [competition, setCompetition] = useState<CompetitionData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");

    loadCompetition(controller.signal)
      .then(setCompetition)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "赛事数据加载失败");
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const handleHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function changeTab(tabId: PublicTabId) {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#/${tabId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <main className="mobile-board">
        {!competition && !error ? (
          <div className="state-panel panel" role="status">
            <span className="loading-dot" aria-hidden="true" />
            <strong>正在加载赛事数据</strong>
            <span>请稍候…</span>
          </div>
        ) : null}

        {error ? (
          <div className="state-panel panel" role="alert">
            <strong>页面加载失败</strong>
            <span>{error}</span>
            <button className="retry-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        ) : null}

        {competition && !error ? (
          <>
            {activeTab === "competition" ? <CompetitionPage data={competition} /> : null}
            {activeTab === "events" ? <EventsPage data={competition} /> : null}
            {activeTab === "schedule" ? <SchedulePage data={competition} /> : null}
          </>
        ) : null}
      </main>
      <BottomNav activeTab={activeTab} onChange={changeTab} />
    </div>
  );
}
