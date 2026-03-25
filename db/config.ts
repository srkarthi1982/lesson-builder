import { defineDb } from "astro:db";
import { Lessons } from "./tables";

export default defineDb({
  tables: { Lessons },
});
