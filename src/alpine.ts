import type { Alpine } from "alpinejs";
import { createLessonBuilderStore } from "./stores/lessonBuilderStore";

export default function initAlpine(Alpine: Alpine) {
  Alpine.store("lessonBuilder", createLessonBuilderStore());
}
