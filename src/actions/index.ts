import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { and, db, desc, eq, Lessons } from "astro:db";
import { pushDashboardSummary, sendNotificationEvent } from "../lib/integrations";

const LESSON_STATUS = ["active", "archived"] as const;

const lessonInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(180),
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(160).optional(),
  level: z.string().trim().max(120).optional(),
  objective: z.string().trim().max(4000).optional(),
  materialsText: z.string().trim().max(8000).optional(),
  stepsText: z.string().trim().max(12000).optional(),
  notes: z.string().trim().max(12000).optional(),
});

export type LessonRecord = typeof Lessons.$inferSelect;

function requireUser(context: ActionAPIContext) {
  const user = (context.locals as App.Locals | undefined)?.user;
  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue.",
    });
  }

  return user;
}

function sanitizeNullable(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function requireOwnedLesson(lessonId: number, userId: string) {
  const [lesson] = await db
    .select()
    .from(Lessons)
    .where(and(eq(Lessons.id, lessonId), eq(Lessons.userId, userId)))
    .limit(1);

  if (!lesson) {
    throw new ActionError({ code: "NOT_FOUND", message: "Lesson not found." });
  }

  return lesson;
}

export async function listLessonsForUser(userId: string) {
  return db
    .select()
    .from(Lessons)
    .where(eq(Lessons.userId, userId))
    .orderBy(desc(Lessons.updatedAt));
}

export async function getLessonDetailForUser(userId: string, lessonId: number) {
  const [lesson] = await db
    .select()
    .from(Lessons)
    .where(and(eq(Lessons.userId, userId), eq(Lessons.id, lessonId)))
    .limit(1);

  return lesson ?? null;
}

async function notifyAndSyncDashboard(userId: string) {
  const lessons = await listLessonsForUser(userId);
  await pushDashboardSummary(userId, lessons);
  return lessons;
}

export const server = {
  createLesson: defineAction({
    input: lessonInputSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [lesson] = await db
        .insert(Lessons)
        .values({
          userId: user.id,
          title: input.title.trim(),
          subject: sanitizeNullable(input.subject),
          topic: sanitizeNullable(input.topic),
          level: sanitizeNullable(input.level),
          objective: sanitizeNullable(input.objective),
          materialsText: sanitizeNullable(input.materialsText),
          stepsText: sanitizeNullable(input.stepsText),
          notes: sanitizeNullable(input.notes),
          status: "active",
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        })
        .returning();

      const lessons = await notifyAndSyncDashboard(user.id);
      if (lessons.length === 1) {
        await sendNotificationEvent({
          userId: user.id,
          type: "lesson_builder_first_lesson_created",
          title: "First lesson created",
          body: `Great start — \"${lesson.title}\" is now in your workspace.`,
          metadata: { lessonId: lesson.id },
        });
      }

      if ([5, 10, 25].includes(lessons.length)) {
        await sendNotificationEvent({
          userId: user.id,
          type: "lesson_builder_lesson_milestone",
          title: "Lesson milestone reached",
          body: `You now have ${lessons.length} lesson plans in Lesson Builder.`,
          metadata: { lessonCount: lessons.length },
        });
      }

      return { lesson };
    },
  }),

  updateLesson: defineAction({
    input: lessonInputSchema.extend({ id: z.number().int().positive() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireOwnedLesson(input.id, user.id);

      const [lesson] = await db
        .update(Lessons)
        .set({
          title: input.title.trim(),
          subject: sanitizeNullable(input.subject),
          topic: sanitizeNullable(input.topic),
          level: sanitizeNullable(input.level),
          objective: sanitizeNullable(input.objective),
          materialsText: sanitizeNullable(input.materialsText),
          stepsText: sanitizeNullable(input.stepsText),
          notes: sanitizeNullable(input.notes),
          updatedAt: new Date(),
        })
        .where(and(eq(Lessons.id, input.id), eq(Lessons.userId, user.id)))
        .returning();

      await notifyAndSyncDashboard(user.id);
      return { lesson };
    },
  }),

  archiveLesson: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireOwnedLesson(input.id, user.id);

      const now = new Date();
      const [lesson] = await db
        .update(Lessons)
        .set({ status: "archived", archivedAt: now, updatedAt: now })
        .where(and(eq(Lessons.id, input.id), eq(Lessons.userId, user.id)))
        .returning();

      await notifyAndSyncDashboard(user.id);
      return { lesson };
    },
  }),

  restoreLesson: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireOwnedLesson(input.id, user.id);

      const [lesson] = await db
        .update(Lessons)
        .set({ status: "active", archivedAt: null, updatedAt: new Date() })
        .where(and(eq(Lessons.id, input.id), eq(Lessons.userId, user.id)))
        .returning();

      await notifyAndSyncDashboard(user.id);
      return { lesson };
    },
  }),

  toggleLessonFavorite: defineAction({
    input: z.object({ id: z.number().int().positive(), isFavorite: z.boolean().optional() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const existing = await requireOwnedLesson(input.id, user.id);

      const nextFavorite = input.isFavorite ?? !existing.isFavorite;

      const [lesson] = await db
        .update(Lessons)
        .set({ isFavorite: nextFavorite, updatedAt: new Date() })
        .where(and(eq(Lessons.id, input.id), eq(Lessons.userId, user.id)))
        .returning();

      const lessons = await notifyAndSyncDashboard(user.id);

      if (nextFavorite && lessons.filter((item) => item.isFavorite).length === 1) {
        await sendNotificationEvent({
          userId: user.id,
          type: "lesson_builder_first_favorite_marked",
          title: "First favorite lesson",
          body: `\"${lesson.title}\" was added to your favorites.`,
          metadata: { lessonId: lesson.id },
        });
      }

      return { lesson };
    },
  }),

  listLessons: defineAction({
    input: z
      .object({
        status: z.enum(LESSON_STATUS).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const lessons = await listLessonsForUser(user.id);

      if (input?.status) {
        return { lessons: lessons.filter((lesson) => lesson.status === input.status) };
      }

      return { lessons };
    },
  }),

  getLessonDetail: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const lesson = await getLessonDetailForUser(user.id, input.id);
      if (!lesson) {
        throw new ActionError({ code: "NOT_FOUND", message: "Lesson not found." });
      }
      return { lesson };
    },
  }),
};
