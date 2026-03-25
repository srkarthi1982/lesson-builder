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

export const lessonBuilderTables = { Lessons } as const;
