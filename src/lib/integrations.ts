import type { LessonRecord } from "../actions/index";

function getIntegrationHeaders() {
  const token = import.meta.env.ANSIVERSA_INTEGRATION_TOKEN;
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function pushDashboardSummary(userId: string, lessons: LessonRecord[]) {
  const webhookUrl = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const subjectCount = new Set(
    lessons.map((lesson) => lesson.subject?.trim()).filter(Boolean),
  ).size;

  const sorted = [...lessons].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const latest = sorted[0];

  const payload = {
    appId: "lesson-builder",
    userId,
    summary: {
      totalLessons: lessons.length,
      favoriteLessons: lessons.filter((lesson) => lesson.isFavorite).length,
      subjectCount,
      lastUpdatedLessonTitle: latest?.title ?? null,
      lastUpdatedAt: latest?.updatedAt ?? null,
    },
    generatedAt: new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: getIntegrationHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking integration.
  }
}

export async function sendNotificationEvent(input: {
  userId: string;
  type:
    | "lesson_builder_first_lesson_created"
    | "lesson_builder_first_favorite_marked"
    | "lesson_builder_lesson_milestone";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const webhookUrl = import.meta.env.ANSIVERSA_NOTIFICATIONS_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: getIntegrationHeaders(),
      body: JSON.stringify({
        appId: "lesson-builder",
        ...input,
        createdAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-blocking integration.
  }
}
