import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CompetitionSource } from "../src/domain/competition-data";

export const SOURCE_DATA_PATH = resolve("source-data/competition.json");
export const PUBLIC_DATA_PATH = resolve("public/data/competition.json");

export async function readCompetitionSource(): Promise<CompetitionSource> {
  const content = await readFile(SOURCE_DATA_PATH, "utf8");
  return JSON.parse(content) as CompetitionSource;
}
