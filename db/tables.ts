import { column, defineTable, NOW } from "astro:db";

export const Lessons = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text(),
    title: column.text(),
    subject: column.text({ optional: true }),
    topic: column.text({ optional: true }),
    level: column.text({ optional: true }),
    objective: column.text({ optional: true }),
    materialsText: column.text({ optional: true }),
    stepsText: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    isFavorite: column.boolean({ default: false }),
    status: column.text({ enum: ["active", "archived"], default: "active" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
    archivedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ["userId"] },
    { on: ["userId", "status"] },
    { on: ["userId", "isFavorite"] },
    { on: ["userId", "subject"] },
    { on: ["userId", "topic"] },
    { on: ["userId", "level"] },
    { on: ["userId", "updatedAt"] },
  ],
});

const LessonPlans = defineTable({
  deprecated: true,
  columns: {
    id: column.number({ primaryKey: true }),
    ownerId: column.text(),
    title: column.text(),
    subject: column.text({ optional: true }),
    gradeLevel: column.text({ optional: true }),
    overview: column.text({ optional: true }),
    durationMinutes: column.number({ optional: true }),
    tags: column.text({ optional: true }),
    status: column.text({ default: "draft" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

const LessonMaterials = defineTable({
  deprecated: true,
  columns: {
    id: column.number({ primaryKey: true }),
    planId: column.number({ references: () => LessonPlans.columns.id }),
    name: column.text(),
    type: column.text({ optional: true }),
    url: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

const LessonObjectives = defineTable({
  deprecated: true,
  columns: {
    id: column.number({ primaryKey: true }),
    planId: column.number({ references: () => LessonPlans.columns.id }),
    text: column.text(),
    order: column.number({ default: 1 }),
    createdAt: column.date({ default: NOW }),
  },
});

const LessonSteps = defineTable({
  deprecated: true,
  columns: {
    id: column.number({ primaryKey: true }),
    planId: column.number({ references: () => LessonPlans.columns.id }),
    title: column.text({ optional: true }),
    description: column.text(),
    durationMinutes: column.number({ optional: true }),
    order: column.number({ default: 1 }),
    createdAt: column.date({ default: NOW }),
  },
});

const LessonJobs = defineTable({
  deprecated: true,
  columns: {
    id: column.number({ primaryKey: true }),
    planId: column.number({ references: () => LessonPlans.columns.id, optional: true }),
    userId: column.text({ optional: true }),
    jobType: column.text({ default: "full" }),
    input: column.text({ optional: true }),
    output: column.text({ optional: true }),
    status: column.text({ default: "completed" }),
    createdAt: column.date({ default: NOW }),
  },
});

export const lessonBuilderTables = {
  Lessons,
  LessonPlans,
  LessonMaterials,
  LessonObjectives,
  LessonSteps,
  LessonJobs,
} as const;
