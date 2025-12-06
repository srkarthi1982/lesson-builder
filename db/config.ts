import { defineDb } from "astro:db";
import {
  LessonPlans,
  LessonObjectives,
  LessonSteps,
 LessonMaterials,
  LessonJobs,
} from "./tables";

export default defineDb({
  tables: {
    LessonPlans,
    LessonObjectives,
    LessonSteps,
    LessonMaterials,
    LessonJobs,
  },
});
