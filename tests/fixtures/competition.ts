import type {
  CompetitionEvent,
  ScheduleEvent,
  ScoringScale,
  Team
} from "../../src/domain/types";

export const teams: Team[] = Array.from({ length: 14 }, (_, index) => ({
  id: `t${String(index + 1).padStart(2, "0")}`,
  order: index + 1,
  name: `队伍 ${index + 1}`,
  athletes: [`队员 ${index + 1}-1`, `队员 ${index + 1}-2`, `队员 ${index + 1}-3`]
}));

export const scoringScale: ScoringScale = {
  firstPlace: 100,
  lastPlace: 50,
  teamCount: 14,
  interval: 50 / 13
};

export const events: CompetitionEvent[] = (["e1", "e2", "e3"] as const).map((id, index) => ({
  id,
  icon: `E${index + 1}`,
  name: `Event ${index + 1}`,
  subtitle: "Test event",
  type: "team",
  typeName: "3人团队",
  category: "测试",
  scoring: "测试规则",
  groups: "3人团队",
  window: "10:00-11:00",
  cap: "10mins",
  summary: "测试项目",
  details: [],
  ranking: []
}));

function makeHeat(eventId: "e1" | "e2" | "e3", index: number, heatTeams: Team[]) {
  return {
    id: `${eventId}-h${index + 1}`,
    name: `Heat ${index + 1}`,
    time: "10:00-10:10",
    status: "later" as const,
    statusText: "未开始",
    teams: heatTeams,
    teamIds: heatTeams.map((team) => team.id)
  };
}

const eventOneTeamIndexes = [[0, 7, 6, 4], [10, 12, 9, 3, 8], [5, 11, 1, 2, 13]];
const reseedTeamIndexes = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9], [10, 11, 12, 13]];

export const eventSchedule: ScheduleEvent[] = events.map((eventItem) => {
  const indexes = eventItem.id === "e1" ? eventOneTeamIndexes : reseedTeamIndexes;
  return {
    id: `event-${eventItem.id}`,
    name: eventItem.name,
    window: "10:00-11:00",
    status: "later",
    statusText: "未开始",
    note: "",
    heats: indexes.map((teamIndexes, index) =>
      makeHeat(eventItem.id, index, teamIndexes.map((teamIndex) => teams[teamIndex]))
    )
  };
});
