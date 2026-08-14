import { describe, expect, it } from "vitest";

import {
  buildScoreEvents,
  getEntryHeats,
  getEventHeats,
  getEventRankings,
  getLaneLabel,
  getOverallRankings,
  getScoreEntryParts,
  normalizeScore,
  setScore,
  setScorePrimary,
  setScoreTiebreak,
  setScoreTime
} from "../src/domain/scoreboard";
import type { Scores } from "../src/domain/types";
import { eventSchedule, events, scoringScale, teams } from "./fixtures/competition";

describe("score normalization", () => {
  it("normalizes split Event 1 and Event 2 inputs", () => {
    let scores: Scores = {};
    scores = setScorePrimary(scores, "e1", "t01", "194");
    scores = setScorePrimary(scores, "e2", "t03", "128");
    scores = setScoreTime(scores, "e2", "t03", "05:40");
    scores = setScoreTiebreak(scores, "e2", "t03", "04:55");

    expect(normalizeScore("e1", scores.e1?.t01 ?? "")).toBe("194 Cal");
    expect(normalizeScore("e2", scores.e2?.t03 ?? "")).toBe("128 reps / 05:40 / TB 04:55");
    expect(getScoreEntryParts("e2", scores.e2?.t03 ?? "")).toMatchObject({
      score: "128",
      scoreTime: "05:40",
      tiebreak: "04:55"
    });
  });
});

describe("event rankings", () => {
  it("ranks Event 1 completed teams by time and unfinished teams by calories", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e1", "t01", "200 Cal / 18:00");
    scores = setScore(scores, "e1", "t02", "220 Cal / 20:00");
    scores = setScore(scores, "e1", "t03", "199 Cal");
    scores = setScore(scores, "e1", "t04", "194 Cal");

    const ranking = getEventRankings("e1", teams, scores, scoringScale);
    expect(ranking.slice(0, 4).map((row) => row.team.id)).toEqual(["t01", "t02", "t03", "t04"]);
    expect(ranking.map((row) => row.score)).toEqual(["18:00", "20:00", "199 Cal", "194 Cal"]);
  });

  it("ranks Event 2 completed teams by time and unfinished teams by reps then tiebreak", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e2", "t01", "132 reps / 06:18 / TB 05:30");
    scores = setScore(scores, "e2", "t02", "132 reps / 06:10 / TB 05:20");
    scores = setScore(scores, "e2", "t03", "120 reps / TB 05:50");
    scores = setScore(scores, "e2", "t04", "120 reps / TB 05:40");
    scores = setScore(scores, "e2", "t05", "119 reps / TB 05:10");

    const ranking = getEventRankings("e2", teams, scores, scoringScale);
    expect(ranking.slice(0, 5).map((row) => row.team.id)).toEqual(["t02", "t01", "t04", "t03", "t05"]);
    expect(ranking[0].score).toBe("06:10");
    expect(ranking[2].score).toBe("120 reps");
  });

  it("uses the 208-rep completion threshold for Event 3", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e3", "t01", "208 reps / 15:26 / TB 09:45");
    scores = setScore(scores, "e3", "t02", "208 reps / 15:26 / TB 09:30");
    scores = setScore(scores, "e3", "t03", "180 reps / TB 09:50");
    scores = setScore(scores, "e3", "t04", "180 reps / TB 09:40");
    scores = setScore(scores, "e3", "t05", "176 reps / TB 09:10");

    const ranking = getEventRankings("e3", teams, scores, scoringScale);
    expect(ranking.slice(0, 5).map((row) => row.team.id)).toEqual(["t02", "t01", "t04", "t03", "t05"]);
    expect(ranking[0].score).toBe("15:26");
    expect(ranking[2].score).toBe("180 reps");
  });

  it("applies the 100-to-50 point scale across all 14 places", () => {
    let scores: Scores = {};
    teams.forEach((team, index) => {
      scores = setScore(scores, "e1", team.id, `${200 - index} Cal`);
    });
    const ranking = getEventRankings("e1", teams, scores, scoringScale);
    expect(ranking[0].points).toBe(100);
    expect(ranking[13].points).toBe(50);
  });
});

describe("Heat reseeding", () => {
  it("moves stronger Event 1 teams later and centers them inside the Heat", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e1", "t01", "200 Cal / 18:00");
    scores = setScore(scores, "e1", "t02", "220 Cal / 20:00");
    scores = setScore(scores, "e1", "t03", "199 Cal");
    scores = setScore(scores, "e1", "t04", "194 Cal");

    const heats = getEventHeats("e2", events, eventSchedule, teams, scores, scoringScale);
    expect(heats.flatMap((heat) => heat.teams.map((team) => team.id))).toEqual([
      "t05", "t07", "t06", "t08", "t10", "t09", "t12", "t14", "t13", "t11", "t03", "t01", "t02", "t04"
    ]);

    const fourthHeatRows = getEntryHeats("e2", events, eventSchedule, teams, scores, scoringScale)[3].rows;
    expect(fourthHeatRows.map((row) => `${row.lane}:${row.id}`)).toEqual([
      "lane 1:t03", "lane 2:t01", "lane 3:t02", "lane 4:t04"
    ]);
    expect(getLaneLabel("e3", 0)).toBe("lane 2");
  });
});

describe("derived competition structures", () => {
  it("builds score events and an overall ranking from the same score map", () => {
    let scores: Scores = {};
    scores = setScore(scores, "e1", "t01", "200 Cal / 18:42");
    scores = setScore(scores, "e2", "t01", "132 reps / 06:18 / TB 05:30");

    const scoreEvents = buildScoreEvents(events, eventSchedule, teams, scores, scoringScale);
    const overall = getOverallRankings(events, teams, scores, scoringScale);

    expect(scoreEvents).toHaveLength(3);
    expect(scoreEvents.find((eventItem) => eventItem.id === "e2")?.rows.find((row) => row.id === "t01")?.score)
      .toBe("132 reps / 06:18 / TB 05:30");
    expect(overall[0].team.id).toBe("t01");
    expect(overall[0].total).toBe(200);
  });
});
