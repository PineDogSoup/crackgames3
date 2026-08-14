import { EventRankingTable } from "../components/RankingTables";
import { SectionHeading } from "../components/SectionHeading";
import type { CompetitionData } from "../domain/types";

interface EventsPageProps {
  data: CompetitionData;
}

export function EventsPage({ data }: EventsPageProps) {
  return (
    <div className="page events-page">
      <SectionHeading
        title="项目公布"
        description="本次比赛为 3 人团队单组别。每个项目下方展示该项目成绩排名。"
        eyebrow="EVENTS"
      />

      <div className="event-list">
        {data.events.map((eventItem) => (
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
              <h3 className="block-title">项目内容</h3>
              <ul className="detail-list">
                {eventItem.details.map((detail, index) => (
                  <li key={`${eventItem.id}-${index}`}>{detail}</li>
                ))}
              </ul>
            </section>

            <EventRankingTable event={eventItem} teams={data.teams} />
          </article>
        ))}
      </div>
    </div>
  );
}
