import type {
  CompetitionEvent,
  PublishedOverallRankingRow,
  Team
} from "../domain/types";

interface OverallRankingTableProps {
  ranking: PublishedOverallRankingRow[];
  teams: Team[];
}

export function OverallRankingTable({ ranking, teams }: OverallRankingTableProps) {
  const rankedNames = new Set(ranking.map((row) => row.team));
  const rows = [
    ...ranking.map((row) => ({
      rank: row.rank,
      team: row.team,
      total: row.total,
      status: row.status || "成绩实时",
      pending: row.total === 0
    })),
    ...teams
      .filter((team) => !rankedNames.has(team.name))
      .map((team, index) => ({
        rank: ranking.length + index + 1,
        team: team.name,
        total: 0,
        status: "待录入",
        pending: true
      }))
  ];

  return (
    <div className="panel ranking-card" role="table" aria-label="总成绩排名">
      <div className="ranking-row ranking-head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">队伍</span>
        <span role="columnheader">总分</span>
        <span role="columnheader">状态</span>
      </div>
      {rows.map((row) => (
        <div className={row.pending ? "ranking-row pending-rank" : "ranking-row"} role="row" key={row.team}>
          <span className="rank-num" role="cell">{row.rank}</span>
          <span className="team-name" role="cell">{row.team}</span>
          <span className="total-score" role="cell">{row.total}</span>
          <span className="rank-status" role="cell">{row.status}</span>
        </div>
      ))}
    </div>
  );
}

interface EventRankingTableProps {
  event: CompetitionEvent;
  teams: Team[];
}

export function EventRankingTable({ event, teams }: EventRankingTableProps) {
  const rankedNames = new Set(event.ranking.map((row) => row.team));
  const rows = [
    ...event.ranking.map((row) => ({
      rank: row.rank,
      team: row.team,
      score: row.score,
      points: row.points as number | string,
      pending: !row.score
    })),
    ...teams
      .filter((team) => !rankedNames.has(team.name))
      .map((team, index) => ({
        rank: event.ranking.length + index + 1,
        team: team.name,
        score: "待录入",
        points: "待算" as number | string,
        pending: true
      }))
  ];

  return (
    <div className="ranking-block" role="table" aria-label={`${event.name} 成绩排名`}>
      <div className="block-title-row">
        <h3 className="block-title">{event.icon} 成绩排名</h3>
        <span className="rank-note">{teams.length} 队</span>
      </div>
      <div className="event-rank-row event-rank-head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">队伍</span>
        <span role="columnheader">成绩</span>
        <span role="columnheader">分</span>
      </div>
      {rows.map((row) => (
        <div className={row.pending ? "event-rank-row pending-rank" : "event-rank-row"} role="row" key={row.team}>
          <span className="rank-num" role="cell">{row.rank}</span>
          <span className="team-name" role="cell">{row.team}</span>
          <span className="score-text" role="cell">{row.score}</span>
          <span className="points" role="cell">{row.points}</span>
        </div>
      ))}
    </div>
  );
}
