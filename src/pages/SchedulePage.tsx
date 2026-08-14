import { useState } from "react";

import { SectionHeading } from "../components/SectionHeading";
import { StatusBadge } from "../components/StatusBadge";
import { getLaneLabel } from "../domain/scoreboard";
import type { CompetitionData } from "../domain/types";

interface SchedulePageProps {
  data: CompetitionData;
}

export function SchedulePage({ data }: SchedulePageProps) {
  const scheduleItems = data.eventSchedule.filter((item) => item.heats.length > 0);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    () => new Set(scheduleItems[0] ? [scheduleItems[0].id] : [])
  );
  const activeGroup = data.groups[0];

  function toggleEvent(id: string) {
    setExpandedEvents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page schedule-page">
      <SectionHeading
        title="团队赛程"
        description="本次比赛只有 3 人团队一个组别，以下为 E1-E3 的完整现场时间安排。"
        eyebrow="SCHEDULE"
      />

      <section className="panel schedule-card" aria-labelledby="group-name">
        <header className="schedule-head">
          <div>
            <h2 className="group-name" id="group-name">{activeGroup.name}</h2>
            <p className="group-note">{activeGroup.note}</p>
          </div>
          <span className="pill">{activeGroup.badge}</span>
        </header>

        <div className="slot-list">
          {activeGroup.slots.map((slot) => (
            <div className="slot" key={`${slot.time}-${slot.label}`}>
              <div className="time-box">
                <strong className="time">{slot.time}</strong>
                <span className="label">{slot.label}</span>
              </div>
              <div className="slot-main">
                <strong className="slot-event-name">{slot.event}</strong>
                <span className="zone">{slot.zone}</span>
              </div>
              <StatusBadge status={slot.status} label={data.statusText[slot.status]} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel schedule-heats-card" aria-labelledby="heat-schedule-title">
        <header className="heat-head">
          <h2 className="heat-title" id="heat-schedule-title">Heat 出场安排</h2>
          <p className="heat-subtitle">展开项目查看每个 Heat 的出场时间和队伍</p>
        </header>

        {scheduleItems.map((eventItem) => {
          const expanded = expandedEvents.has(eventItem.id);
          const event = data.events.find((candidate) => candidate.name === eventItem.name);
          return (
            <article className="heat-event" key={eventItem.id}>
              <button
                className="heat-event-head"
                type="button"
                onClick={() => toggleEvent(eventItem.id)}
                aria-expanded={expanded}
              >
                <span className="heat-event-main">
                  <strong className="heat-event-name">{eventItem.name}</strong>
                  <span className="heat-event-note">{eventItem.window} · {eventItem.note}</span>
                </span>
                <span className="heat-event-action">
                  <StatusBadge status={eventItem.status} label={eventItem.statusText} />
                  <span className="toggle-text">{expanded ? "收起" : "展开"}</span>
                </span>
              </button>

              {expanded ? (
                <div className="schedule-heat-list">
                  {eventItem.heats.map((heat) => (
                    <div className="heat-item" key={heat.id}>
                      <header className="heat-item-head">
                        <span>
                          <strong className="heat-name">{heat.name}</strong>
                          <span className="heat-time">{heat.time}</span>
                        </span>
                        <StatusBadge status={heat.status} label={heat.statusText} />
                      </header>
                      <div className="team-list">
                        {heat.teams.map((team, index) => (
                          <div className="schedule-heat-team" key={team.id}>
                            <span className="lane">{event ? getLaneLabel(event.id, index) : `lane ${index + 1}`}</span>
                            <span className="heat-team-main">
                              <strong className="heat-team-name">{team.name}</strong>
                              <span className="heat-team-athletes">{team.athletes.join(" / ")}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
