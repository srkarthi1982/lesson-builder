import { column, defineTable, NOW } from "astro:db";

/**
 * A complete lesson plan created by the user.
 */
export const LessonPlans = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    ownerId: column.text(), // parent Users.id

    title: column.text(),
    subject: column.text({ optional: true }),
    gradeLevel: column.text({ optional: true }), // "Grade 6", "College", etc.

    overview: column.text({ optional: true }),
    durationMinutes: column.number({ optional: true }),

    tags: column.text({ optional: true }),

    status: column.text({
      enum: ["draft", "published", "archived"],
      default: "draft",
    }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Learning objectives for the lesson.
 */
export const LessonObjectives = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    planId: column.number({ references: () => LessonPlans.columns.id }),

    text: column.text(), // e.g., "Students will understand photosynthesis"
    order: column.number({ default: 1 }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * Step-by-step instructional sequence.
 */
export const LessonSteps = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    planId: column.number({ references: () => LessonPlans.columns.id }),

    title: column.text({ optional: true }), // "Introduction"
    description: column.text(),             // main step content

    durationMinutes: column.number({ optional: true }),
    order: column.number({ default: 1 }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * Materials/resources used in the lesson.
 */
export const LessonMaterials = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    planId: column.number({ references: () => LessonPlans.columns.id }),

    name: column.text(), // e.g. "Whiteboard", "Worksheet"
    type: column.text({ optional: true }), // "pdf", "url", "image", "other"
    url: column.text({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * AI generation jobs (lesson outline, objectives, steps).
 */
export const LessonJobs = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    planId: column.number({
      references: () => LessonPlans.columns.id,
      optional: true,
    }),

    userId: column.text({ optional: true }),

    jobType: column.text({
      enum: ["outline", "objectives", "steps", "materials", "full"],
      default: "full",
    }),

    input: column.json({ optional: true }),
    output: column.json({ optional: true }),

    status: column.text({
      enum: ["pending", "completed", "failed"],
      default: "completed",
    }),

    createdAt: column.date({ default: NOW }),
  },
});

export const lessonBuilderTables = {
  LessonPlans,
  LessonObjectives,
  LessonSteps,
  LessonMaterials,
  LessonJobs,
} as const;
