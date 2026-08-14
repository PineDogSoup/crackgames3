import { validateCompetitionSource } from "../src/domain/competition-data";
import { readCompetitionSource } from "./competition-files";

const source = await readCompetitionSource();
validateCompetitionSource(source);

console.log(`Competition data valid: ${source.teams.length} teams, ${source.events.length} events`);
