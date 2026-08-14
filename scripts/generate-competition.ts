import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { hydrateCompetition } from "../src/domain/competition-data";
import { PUBLIC_DATA_PATH, readCompetitionSource } from "./competition-files";

const source = await readCompetitionSource();
const competition = hydrateCompetition(source);

await mkdir(dirname(PUBLIC_DATA_PATH), { recursive: true });
await writeFile(PUBLIC_DATA_PATH, `${JSON.stringify(competition, null, 2)}\n`, "utf8");

console.log(`Generated ${PUBLIC_DATA_PATH}`);
