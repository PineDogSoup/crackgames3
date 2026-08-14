import { useMemo, useState } from "react";

import { hydrateCompetition } from "../domain/competition-data";
import {
  getEntryHeats,
  getEventRankings,
  getOverallRankings,
  getScheduleRows,
  setScorePrimary,
  setScoreTiebreak,
  setScoreTime
} from "../domain/scoreboard";
import type { EntryRow, EventId, Scores } from "../domain/types";
import { EVENT_RULES } from "./constants";
import { ManageActions } from "./ManageActions";
import type { ManagerScope, ManagerState, ScheduleDraft } from "./types";

type ScorePanel = "entry" | "ranking" | "schedule" | "roster";
type ScoreInputField = "score" | "scoreTime" | "tiebreak";

interface ScoreInputDraft {
  score: string;
  scoreTime: string;
  tiebreak: string;
}

const SCORE_PANELS: Array<{ id: ScorePanel; label: string }> = [
  { id: "entry", label: "成绩录入" },
  { id: "ranking", label: "实时排名" },
  { id: "schedule", label: "Heat 安排" },
  { id: "roster", label: "队伍名单" }
];

function scoreDraftKey(eventId: EventId, teamId: string): string {
  return `${eventId}:${teamId}`;
}

function draftFromRow(row: EntryRow): ScoreInputDraft {
  return {
    score: row.scoreInput,
    scoreTime: row.scoreTimeInput,
    tiebreak: row.tiebreakInput
  };
}

interface ScoreManagerProps {
  source: ManagerState["source"];
  schedule: ScheduleDraft;
  scores: Scores;
  savedAt?: string;
  dirty: boolean;
  busy: "save" | "publish" | null;
  onChange: (scores: Scores) => void;
  onSave: (scope: ManagerScope) => void;
  onPublish: (scope: ManagerScope) => void;
}

export function ScoreManager({
  source,
  schedule,
  scores,
  savedAt,
  dirty,
  busy,
  onChange,
  onSave,
  onPublish
}: ScoreManagerProps) {
  const [activeEventId, setActiveEventId] = useState<EventId>("e1");
  const [activePanel, setActivePanel] = useState<ScorePanel>("entry");
  const [scoreInputDrafts, setScoreInputDrafts] = useState<Record<string, ScoreInputDraft>>({});
  const data = useMemo(() => hydrateCompetition({
    ...source,
    groups: schedule.groups,
    eventSchedule: schedule.eventSchedule
  }), [schedule, source]);
  const entryHeats = useMemo(() => getEntryHeats(
    activeEventId,
    data.events,
    data.eventSchedule,
    data.teams,
    scores,
    data.scoringScale
  ), [activeEventId, data, scores]);
  const eventRanking = useMemo(() => getEventRankings(
    activeEventId,
    data.teams,
    scores,
    data.scoringScale
  ), [activeEventId, data, scores]);
  const overallRanking = useMemo(() => getOverallRankings(
    data.events,
    data.teams,
    scores,
    data.scoringScale
  ), [data, scores]);
  const scheduleRows = useMemo(() => getScheduleRows(
    data.events,
    data.eventSchedule,
    data.teams,
    scores,
    data.scoringScale
  ), [data, scores]);
  const activeRule = EVENT_RULES[activeEventId];
  const enteredCount = Object.values(scores[activeEventId] ?? {}).filter(Boolean).length;

  function updateScoreDraft(row: EntryRow, field: ScoreInputField, value: string): void {
    const key = scoreDraftKey(activeEventId, row.id);
    setScoreInputDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? draftFromRow(row)),
        [field]: value
      }
    }));
  }

  function commitScoreDraft(row: EntryRow): void {
    const key = scoreDraftKey(activeEventId, row.id);
    const draft = scoreInputDrafts[key];
    if (!draft) return;

    let nextScores = scores;
    if (draft.score !== row.scoreInput) {
      nextScores = setScorePrimary(nextScores, activeEventId, row.id, draft.score);
    }
    if (draft.scoreTime !== row.scoreTimeInput) {
      nextScores = setScoreTime(nextScores, activeEventId, row.id, draft.scoreTime);
    }
    if (draft.tiebreak !== row.tiebreakInput) {
      nextScores = setScoreTiebreak(nextScores, activeEventId, row.id, draft.tiebreak);
    }

    setScoreInputDrafts((current) => {
      if (!current[key]) return current;
      const { [key]: _committedDraft, ...rest } = current;
      return rest;
    });
    if (nextScores !== scores) onChange(nextScores);
  }

  function scoreInputValue(row: EntryRow, field: ScoreInputField): string {
    const draft = scoreInputDrafts[scoreDraftKey(activeEventId, row.id)];
    if (draft) return draft[field];
    if (field === "score") return row.scoreInput;
    if (field === "scoreTime") return row.scoreTimeInput;
    return row.tiebreakInput;
  }

  return (
    <section className="manager-section" aria-labelledby="score-manager-title">
      <div className="manager-section-head">
        <p className="section-eyebrow">LOCAL SCOREBOARD</p>
        <h1 className="section-title" id="score-manager-title">成绩管理</h1>
        <p className="section-desc">按 Heat 录入成绩，自动计算单项排名、积分、总榜和后续 Heat。</p>
      </div>

      <div className="manager-metrics">
        <div className="manager-metric panel"><strong>{data.teams.length}</strong><span>参赛队伍</span></div>
        <div className="manager-metric panel"><strong>{data.events.length}</strong><span>比赛项目</span></div>
        <div className="manager-metric panel"><strong>{enteredCount}</strong><span>当前已录入</span></div>
        <div className="manager-metric panel"><strong>{data.scoringScale.firstPlace}</strong><span>第一名积分</span></div>
      </div>

      <div className="manager-segment panel" role="tablist" aria-label="成绩管理视图">
        {SCORE_PANELS.map((panel) => (
          <button
            className={activePanel === panel.id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activePanel === panel.id}
            key={panel.id}
            onClick={() => setActivePanel(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <div className="manager-event-tabs" role="tablist" aria-label="比赛项目">
        {data.events.map((eventItem) => (
          <button
            className={activeEventId === eventItem.id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeEventId === eventItem.id}
            key={eventItem.id}
            onClick={() => setActiveEventId(eventItem.id)}
          >
            {eventItem.name}
          </button>
        ))}
      </div>

      {activePanel === "entry" ? (
        <div className="manager-score-stack">
          {entryHeats.map((heat) => (
            <div className="manager-score-card panel" key={heat.id}>
              <div className="manager-score-card-head">
                <div><h2>{heat.name}</h2><span>{heat.time}</span></div>
                <span className={`manager-entry-status is-${heat.status.cls}`}>{heat.status.label}</span>
              </div>
              <p className="manager-rule-text">{activeRule.rule}</p>
              <div className="manager-score-table-wrap">
                <div className="manager-score-table" role="table" aria-label={`${heat.name} 成绩录入`}>
                  <div className="manager-score-row manager-score-head" role="row">
                    <span>Lane</span><span>队伍</span><span>成绩</span><span>名次</span><span>积分</span>
                  </div>
                  {heat.rows.map((row) => (
                    <div className="manager-score-row" role="row" key={row.id}>
                      <span className="lane">{row.lane}</span>
                      <strong className="team-name">{row.teamName}</strong>
                      <div className="manager-score-inputs">
                        <input
                          aria-label={`${row.teamName} ${activeEventId} 成绩`}
                          inputMode={activeEventId === "e1" ? "text" : "numeric"}
                          value={scoreInputValue(row, "score")}
                          placeholder={activeRule.primary}
                          onChange={(event) => updateScoreDraft(row, "score", event.target.value)}
                          onBlur={() => commitScoreDraft(row)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                        />
                        {row.hasScoreTime ? (
                          <input
                            aria-label={`${row.teamName} ${activeEventId} 完成时间`}
                            inputMode="text"
                            value={scoreInputValue(row, "scoreTime")}
                            placeholder={activeRule.time}
                            onChange={(event) => updateScoreDraft(row, "scoreTime", event.target.value)}
                            onBlur={() => commitScoreDraft(row)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                        ) : null}
                        {row.hasTiebreak ? (
                          <input
                            aria-label={`${row.teamName} ${activeEventId} tiebreak`}
                            inputMode="text"
                            value={scoreInputValue(row, "tiebreak")}
                            placeholder={activeRule.tiebreak}
                            onChange={(event) => updateScoreDraft(row, "tiebreak", event.target.value)}
                            onBlur={() => commitScoreDraft(row)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                        ) : null}
                      </div>
                      <strong className="manager-rank">{row.rank}</strong>
                      <strong className="manager-points">{row.points}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activePanel === "ranking" ? (
        <div className="manager-ranking-grid">
          <div className="manager-table-card panel">
            <div className="manager-card-head"><div><h2>总榜</h2><p>Event 1–3 积分合计。</p></div></div>
            <div className="manager-overall-row manager-table-head"><span>#</span><span>队伍</span><span>E1</span><span>E2</span><span>E3</span><span>总分</span></div>
            {overallRanking.map((row) => (
              <div className="manager-overall-row" key={row.team.id}>
                <strong>#{row.rank}</strong><strong>{row.team.name}</strong>
                <span>{row.eventPoints.e1 || "-"}</span><span>{row.eventPoints.e2 || "-"}</span>
                <span>{row.eventPoints.e3 || "-"}</span><strong>{row.total}</strong>
              </div>
            ))}
            {overallRanking.length === 0 ? <p className="manager-empty">暂无成绩</p> : null}
          </div>
          <div className="manager-table-card panel">
            <div className="manager-card-head"><div><h2>{activeEventId.toUpperCase()} 单项榜</h2><p>当前选中项目的实时排名。</p></div></div>
            <div className="manager-event-rank-row manager-table-head"><span>#</span><span>队伍</span><span>成绩</span><span>积分</span></div>
            {eventRanking.map((row) => (
              <div className="manager-event-rank-row" key={row.team.id}>
                <strong>#{row.rank}</strong><strong>{row.team.name}</strong><span>{row.score}</span><strong>{row.points}</strong>
              </div>
            ))}
            {eventRanking.length === 0 ? <p className="manager-empty">当前项目暂无成绩</p> : null}
          </div>
        </div>
      ) : null}

      {activePanel === "schedule" ? (
        <div className="manager-table-card panel">
          <div className="manager-card-head"><div><h2>Heat / Lane 安排</h2><p>Event 2/3 会随 Event 1 成绩重排。</p></div></div>
          <div className="manager-flat-schedule-wrap">
            <div className="manager-flat-schedule-row manager-table-head"><span>项目</span><span>Heat</span><span>时间</span><span>Lane</span><span>队伍</span></div>
            {scheduleRows.map((row) => (
              <div className="manager-flat-schedule-row" key={row.id}>
                <span>{row.event}</span><span>{row.heat}</span><span>{row.time}</span><strong>{row.lane}</strong><strong>{row.team}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activePanel === "roster" ? (
        <div className="manager-roster-grid">
          {data.teams.map((team) => (
            <div className="manager-roster-card panel" key={team.id}>
              <strong>{team.order}. {team.name}</strong>
              <span>{team.athletes.join(" / ")}</span>
            </div>
          ))}
        </div>
      ) : null}

      <ManageActions
        scope="scores"
        savedAt={savedAt}
        dirty={dirty}
        busy={busy}
        onSave={() => onSave("scores")}
        onPublish={() => onPublish("scores")}
      />
    </section>
  );
}
