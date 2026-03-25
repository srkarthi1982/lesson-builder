import { actions } from "astro:actions";

type TabKey = "overview" | "lessons" | "favorites" | "archived";

type Lesson = {
  id: number;
  userId: string;
  title: string;
  subject: string | null;
  topic: string | null;
  level: string | null;
  objective: string | null;
  materialsText: string | null;
  stepsText: string | null;
  notes: string | null;
  isFavorite: boolean;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type LessonInput = {
  title: string;
  subject?: string;
  topic?: string;
  level?: string;
  objective?: string;
  materialsText?: string;
  stepsText?: string;
  notes?: string;
};

const emptyForm: LessonInput = {
  title: "",
  subject: "",
  topic: "",
  level: "",
  objective: "",
  materialsText: "",
  stepsText: "",
  notes: "",
};

const parseAction = <T>(result: unknown): { data: T | null; error: string | null } => {
  const r = result as { data?: T; error?: { message?: string } };
  return {
    data: r?.data ?? null,
    error: r?.error?.message ?? null,
  };
};

export function createLessonBuilderStore() {
  return {
    lessons: [] as Lesson[],
    search: "",
    subjectFilter: "all",
    levelFilter: "all",
    activeTab: "overview" as TabKey,
    activeLessonId: null as number | null,
    drawerOpen: false,
    editingLessonId: null as number | null,
    form: { ...emptyForm },
    loading: false,
    flash: { type: "" as "" | "success" | "error", message: "" },

    init(payload: { lessons: Lesson[]; activeLessonId?: number | null }) {
      this.lessons = payload.lessons;
      this.activeLessonId = payload.activeLessonId ?? null;
    },

    get activeLessons() {
      return this.lessons.filter((lesson) => lesson.status === "active");
    },

    get archivedLessons() {
      return this.lessons.filter((lesson) => lesson.status === "archived");
    },

    get favoriteLessons() {
      return this.lessons.filter((lesson) => lesson.isFavorite);
    },

    get subjectCount() {
      return new Set(this.lessons.map((lesson) => lesson.subject).filter(Boolean)).size;
    },

    get recentlyUpdatedCount() {
      const limit = Date.now() - 1000 * 60 * 60 * 24 * 7;
      return this.lessons.filter((lesson) => new Date(lesson.updatedAt).getTime() > limit).length;
    },

    get filteredLessons() {
      const base =
        this.activeTab === "favorites"
          ? this.favoriteLessons
          : this.activeTab === "archived"
            ? this.archivedLessons
            : this.activeLessons;

      const search = this.search.trim().toLowerCase();

      return base.filter((lesson) => {
        const matchesSearch =
          !search ||
          lesson.title.toLowerCase().includes(search) ||
          (lesson.subject ?? "").toLowerCase().includes(search) ||
          (lesson.topic ?? "").toLowerCase().includes(search);

        const matchesSubject = this.subjectFilter === "all" || lesson.subject === this.subjectFilter;
        const matchesLevel = this.levelFilter === "all" || lesson.level === this.levelFilter;

        return matchesSearch && matchesSubject && matchesLevel;
      });
    },

    get lessonForDetail() {
      return this.lessons.find((lesson) => lesson.id === this.activeLessonId) ?? null;
    },

    setTab(tab: TabKey) {
      this.activeTab = tab;
    },

    openCreateDrawer() {
      this.editingLessonId = null;
      this.form = { ...emptyForm };
      this.drawerOpen = true;
    },

    openEditDrawer(lesson: Lesson) {
      this.editingLessonId = lesson.id;
      this.form = {
        title: lesson.title,
        subject: lesson.subject ?? "",
        topic: lesson.topic ?? "",
        level: lesson.level ?? "",
        objective: lesson.objective ?? "",
        materialsText: lesson.materialsText ?? "",
        stepsText: lesson.stepsText ?? "",
        notes: lesson.notes ?? "",
      };
      this.drawerOpen = true;
    },

    closeDrawer() {
      this.drawerOpen = false;
    },

    upsertLesson(lesson: Lesson) {
      const index = this.lessons.findIndex((item) => item.id === lesson.id);
      if (index >= 0) {
        this.lessons.splice(index, 1, lesson);
      } else {
        this.lessons.unshift(lesson);
      }
      this.lessons.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    setFlash(type: "success" | "error", message: string) {
      this.flash = { type, message };
      window.setTimeout(() => {
        this.flash = { type: "", message: "" };
      }, 3500);
    },

    async saveLesson() {
      this.loading = true;
      try {
        const payload = { ...this.form };

        if (this.editingLessonId) {
          const result = parseAction<{ lesson: Lesson }>(
            await actions.updateLesson({ id: this.editingLessonId, ...payload }),
          );
          if (result.error || !result.data) throw new Error(result.error ?? "Unable to update lesson.");
          this.upsertLesson(result.data.lesson);
          this.setFlash("success", "Lesson updated.");
        } else {
          const result = parseAction<{ lesson: Lesson }>(await actions.createLesson(payload));
          if (result.error || !result.data) throw new Error(result.error ?? "Unable to create lesson.");
          this.upsertLesson(result.data.lesson);
          this.setFlash("success", "Lesson created.");
        }

        this.closeDrawer();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save lesson.";
        this.setFlash("error", message);
      } finally {
        this.loading = false;
      }
    },

    async toggleFavorite(lesson: Lesson) {
      const previous = lesson.isFavorite;
      lesson.isFavorite = !lesson.isFavorite;

      const result = parseAction<{ lesson: Lesson }>(
        await actions.toggleLessonFavorite({ id: lesson.id, isFavorite: lesson.isFavorite }),
      );

      if (result.error || !result.data) {
        lesson.isFavorite = previous;
        this.setFlash("error", result.error ?? "Unable to change favorite state.");
        return;
      }

      this.upsertLesson(result.data.lesson);
    },

    async archiveLesson(lesson: Lesson) {
      const result = parseAction<{ lesson: Lesson }>(await actions.archiveLesson({ id: lesson.id }));
      if (result.error || !result.data) {
        this.setFlash("error", result.error ?? "Unable to archive lesson.");
        return;
      }
      this.upsertLesson(result.data.lesson);
      this.setFlash("success", "Lesson archived.");
    },

    async restoreLesson(lesson: Lesson) {
      const result = parseAction<{ lesson: Lesson }>(await actions.restoreLesson({ id: lesson.id }));
      if (result.error || !result.data) {
        this.setFlash("error", result.error ?? "Unable to restore lesson.");
        return;
      }
      this.upsertLesson(result.data.lesson);
      this.setFlash("success", "Lesson restored.");
    },

    subjects() {
      return ["all", ...new Set(this.lessons.map((item) => item.subject).filter(Boolean))];
    },

    levels() {
      return ["all", ...new Set(this.lessons.map((item) => item.level).filter(Boolean))];
    },
  };
}
