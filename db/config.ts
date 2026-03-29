import { defineDb } from "astro:db";
import { lessonBuilderTables } from "./tables";

export default defineDb({
  tables: lessonBuilderTables,
});
