import { useState } from "react";

import { EventRankingTable } from "../components/RankingTables";
import { SectionHeading } from "../components/SectionHeading";
import type { CompetitionData, EventId } from "../domain/types";

const eventContentImages: Record<EventId, Array<{ src: string; alt: string }>> = {
  e1: [
    { src: "assets/events/event-1.png", alt: "Event 1 项目内容" }
  ],
  e2: [
    { src: "assets/events/event-2-zh.png", alt: "Event 2 中文项目内容" },
    { src: "assets/events/event-2-en.png", alt: "Event 2 English workout details" }
  ],
  e3: [
    { src: "assets/events/event-3-zh.png", alt: "Event 3 中文项目内容" },
    { src: "assets/events/event-3-en.png", alt: "Event 3 English workout details" }
  ]
};

const scoringDetailPrefixes: Partial<Record<EventId, string>> = {
  e2: "Buy In Rep Count:",
  e3: "Rep Count:"
};

interface EventsPageProps {
  data: CompetitionData;
}

export function EventsPage({ data }: EventsPageProps) {
  const [expandedContent, setExpandedContent] = useState<Set<EventId>>(new Set());

  function toggleContent(id: EventId) {
    setExpandedContent((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page events-page">
      <SectionHeading
        title="项目公布"
        description="本次比赛为 3 人团队单组别。每个项目下方展示该项目成绩排名。"
        eyebrow="EVENTS"
      />

      <div className="event-list">
        {data.events.map((eventItem) => {
          const contentExpanded = expandedContent.has(eventItem.id);
          const contentId = `event-content-${eventItem.id}`;
          const scoringPrefix = scoringDetailPrefixes[eventItem.id];
          const scoringStartIndex = scoringPrefix
            ? eventItem.details.findIndex((detail) => detail.startsWith(scoringPrefix))
            : -1;
          const scoringDetails = scoringStartIndex >= 0
            ? eventItem.details.slice(scoringStartIndex)
            : [];
          return (
            <article className="event-card panel" key={eventItem.id}>
              <header className="event-card-head">
                <span className="event-icon">{eventItem.icon}</span>
                <span className="event-tags">
                  <span className="pill">{eventItem.category}</span>
                  <span className="type">{eventItem.typeName}</span>
                </span>
              </header>
              <h2 className="event-card-title">{eventItem.name}</h2>
              <p className="event-subtitle">{eventItem.subtitle}</p>
              <p className="event-summary">{eventItem.summary}</p>

              <dl className="meta">
                <div className="meta-row"><dt>计分</dt><dd>{eventItem.scoring}</dd></div>
                <div className="meta-row"><dt>组别</dt><dd>{eventItem.groups}</dd></div>
                <div className="meta-row"><dt>时间</dt><dd>{eventItem.window}</dd></div>
                <div className="meta-row"><dt>Time Cap</dt><dd>{eventItem.cap}</dd></div>
              </dl>

              <section className="detail-block">
                <button
                  className="event-content-toggle"
                  type="button"
                  onClick={() => toggleContent(eventItem.id)}
                  aria-expanded={contentExpanded}
                  aria-controls={contentId}
                >
                  <span className="block-title">项目内容</span>
                  <span className="event-content-action">{contentExpanded ? "收起" : "展开图片"}</span>
                </button>
                {contentExpanded ? (
                  <div className="event-content-images" id={contentId}>
                    {eventContentImages[eventItem.id].map((image) => (
                      <img
                        className="event-content-image"
                        src={`${import.meta.env.BASE_URL}${image.src}`}
                        alt={image.alt}
                        loading="lazy"
                        decoding="async"
                        key={image.src}
                      />
                    ))}
                    {scoringDetails.length > 0 ? (
                      <section className="event-scoring-details" aria-label={`${eventItem.name} 积分说明`}>
                        <h3>积分说明</h3>
                        <ul>
                          {scoringDetails.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <EventRankingTable event={eventItem} teams={data.teams} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
