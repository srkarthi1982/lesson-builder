# App Spec: lesson-builder

## 1) App Overview
- **App Name:** Lesson Builder
- **Category:** Education / Planning
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Help an authenticated user draft, organize, and maintain lesson plans with objectives, materials, steps, and notes.
- **Primary User:** A signed-in user building and managing their own lesson records.

## 2) User Stories
- As a user, I want to create a lesson plan with subject, topic, and level, so that I can structure teaching content.
- As a user, I want to favorite and filter lessons, so that I can keep important material easy to reach.
- As a user, I want to archive and restore lessons, so that I can keep old lesson plans without deleting them.

## 3) Core Workflow
1. User signs in and opens `/app`.
2. User creates a lesson from the workspace drawer or edits an existing lesson.
3. App saves the lesson in the user-scoped database and refreshes the lesson list.
4. User opens the lesson detail route to review the full objective, materials, steps, and notes.
5. User favorites, archives, or restores lessons from the workspace or detail view.

## 4) Functional Behavior
- Lessons are stored per user with title, subject, topic, level, objective, materials text, steps text, notes, favorite state, and archive state.
- The workspace supports create, edit, favorite toggle, archive, restore, search, and filtering by subject and level.
- `/app` and lesson detail routes are protected and scoped to the authenticated user.
- Current implementation behaves as a manual lesson-planning workspace; automated lesson generation is not part of V1.

## 5) Data & Storage
- **Storage type:** Astro DB on the app’s isolated Turso database
- **Main entities:** Lessons
- **Persistence expectations:** Lesson records persist across refresh and future sessions for the authenticated owner.
- **User model:** Multi-user shared infrastructure with per-user isolation

## 6) Special Logic (Optional)
- Workspace summary emphasizes total, active, favorite, archived, subject-count, and recently updated metrics.
- Legacy lesson planning tables were preserved only for safe schema reconciliation; the active V1 runtime model centers on the `Lessons` entity.

## 7) Edge Cases & Error Handling
- Invalid IDs/routes: Non-numeric lesson IDs return `404`.
- Empty input: Lesson title is required before save.
- Unauthorized access: Protected routes redirect to the parent login flow.
- Missing records: Missing or non-owned lessons return safe not-found behavior instead of exposing data.
- Invalid payload/state: Invalid save attempts surface as action errors and should not corrupt stored lessons.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create a lesson with objective, materials, and steps, then confirm it appears in the workspace and detail route.
- [ ] Edit the lesson, toggle favorite, archive it, then restore it and confirm the workspace updates correctly.

### Safety tests
- [ ] Open an invalid or missing lesson detail URL and confirm the app returns a safe not-found response.
- [ ] Attempt to save without a title and confirm the request is rejected.
- [ ] Confirm cross-user access to another lesson is blocked.

### Negative tests
- [ ] Confirm there is no hard-delete flow in V1.
- [ ] Confirm the app does not auto-generate lesson content or objectives.

## 9) Out of Scope (V1)
- AI lesson generation
- Collaborative lesson editing
- Permanent delete / export workflows

## 10) Freeze Notes
- V1 release freeze: this document reflects the current repo implementation before final browser verification.
- This spec was populated conservatively from current routes, stores, actions, and DB shape; runtime edge cases should be confirmed during freeze verification.
- During freeze, only verification fixes and cleanup are allowed; no undocumented feature expansion.
