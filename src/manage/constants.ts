import type { CompetitionStatus, EventId } from "../domain/types";

export const STATUS_OPTIONS: Array<{ value: CompetitionStatus; label: string }> = [
  { value: "later", label: "未开始" },
  { value: "next", label: "待检录" },
  { value: "open", label: "进行中" },
  { value: "done", label: "已结束" }
];

export const EVENT_RULES: Record<EventId, {
  rule: string;
  primary: string;
  time: string;
  tiebreak: string;
}> = {
  e1: {
    rule: "完成目标 Cal 的队伍按用时排名；未完成队伍按累计 Cal 排名。",
    primary: "例：200 / 18:42 或 194",
    time: "",
    tiebreak: ""
  },
  e2: {
    rule: "录入总 reps、完成时间和 tiebreak；完成队伍按时间，未完成队伍按 reps 排名。",
    primary: "reps，例：132",
    time: "完成时间，例：06:18",
    tiebreak: "TB，例：05:40"
  },
  e3: {
    rule: "录入总 reps、完成时间和 tiebreak；完成队伍按时间，未完成队伍按 reps 排名。",
    primary: "reps，例：208",
    time: "完成时间，例：15:26",
    tiebreak: "TB，例：09:45"
  }
};
