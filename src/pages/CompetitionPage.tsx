import {
  type Dispatch,
  type SetStateAction,
  useMemo,
  useState
} from "react";

import { OverallRankingTable } from "../components/RankingTables";
import { SectionHeading } from "../components/SectionHeading";
import { getLaneLabel } from "../domain/scoreboard";
import type { CompetitionData, EventId } from "../domain/types";

interface CompetitionPageProps {
  data: CompetitionData;
}

export function CompetitionPage({ data }: CompetitionPageProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedHeats, setExpandedHeats] = useState<Set<string>>(new Set());
  const eventIdByName = useMemo(
    () => new Map(data.events.map((eventItem) => [eventItem.name, eventItem.id])),
    [data.events]
  );

  function toggle(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page competition-page">
      <img
        className="hero-poster"
        src={`${import.meta.env.BASE_URL}assets/crack-game-poster.png`}
        alt="Crack Game III 赛事海报"
      />

      <section className="section">
        <SectionHeading
          title="赛事时间安排"
          description="点击项目查看 Heat 时间，继续点击 Heat 查看参赛队伍。"
          eyebrow="RACE DAY"
        />
        <div className="schedule-list">
          {data.eventSchedule.map((eventItem) => {
            const hasHeats = eventItem.heats.length > 0;
            const eventExpanded = expandedEvents.has(eventItem.id);
            const eventId = eventIdByName.get(eventItem.name) as EventId | undefined;
            return (
              <article className="event-schedule panel" key={eventItem.id}>
                <button
                  className="event-toggle"
                  type="button"
                  onClick={() => hasHeats && toggle(setExpandedEvents, eventItem.id)}
                  aria-expanded={hasHeats ? eventExpanded : undefined}
                  disabled={!hasHeats}
                >
                  <span className="event-main">
                    <strong className="event-title">{eventItem.name}</strong>
                    <span className="event-note">{eventItem.note}</span>
                  </span>
                  <span className="event-side">
                    <span className="event-time">{eventItem.window}</span>
                  </span>
                  {hasHeats ? <span className="chevron">{eventExpanded ? "收起" : "展开"}</span> : null}
                </button>

                {eventExpanded && hasHeats ? (
                  <div className="heat-list">
                    {eventItem.heats.map((heat) => {
                      const heatExpanded = expandedHeats.has(heat.id);
                      return (
                        <div className="heat-card" key={heat.id}>
                          <button
                            className="heat-toggle"
                            type="button"
                            onClick={() => toggle(setExpandedHeats, heat.id)}
                            aria-expanded={heatExpanded}
                          >
                            <span>
                              <strong className="heat-name">{heat.name}</strong>
                              <span className="heat-meta">{heat.time} · {heat.teams.length} 支队伍</span>
                            </span>
                          </button>
                          {heatExpanded ? (
                            <div className="team-grid">
                              {heat.teams.map((team, index) => (
                                <div className="heat-team" key={team.id}>
                                  <span className="lane">{eventId ? getLaneLabel(eventId, index) : `lane ${index + 1}`}</span>
                                  <strong>{team.name}</strong>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SectionHeading
          title="成绩排名"
          description="当前为实时榜，最终结果以裁判确认后公布为准。"
          eyebrow="LEADERBOARD"
          level={2}
        />
        <OverallRankingTable ranking={data.overallRanking} teams={data.teams} />
      </section>
    </div>
  );
}
