# SomaSmart Interaction Matrix (Critical Surfaces)

Date: 2026-02-07

## Public Browse -> Login -> Lesson Open
1. User lands on `/`.
2. User explores featured/discovery cards and filters lessons.
3. User selects lesson card while logged out.
4. App routes to `/login` with safe `next` param.
5. User logs in.
6. App redirects to `next` lesson route for students.

## Student Discover -> Open Lesson
1. Student opens `/student/lessons`.
2. Student filters by level/class/subject/language/search.
3. Student sees updated result count and lesson cards.
4. Student opens lesson card using `Start`, `Continue`, or `Replay` cue.
5. App routes to `/student/lessons/:lessonId`.

## Teacher Create -> Submit
1. Teacher opens `/teacher/lessons/new`.
2. Teacher completes metadata step.
3. Teacher creates blocks and optional quiz gates.
4. Teacher reviews preview and submit checklist.
5. Teacher submits for approval.
6. App routes back to lessons list after successful submit.

## Admin Review -> Decision
1. Admin opens `/admin/lessons`.
2. Admin selects pending lesson from queue.
3. Admin reviews preview + metadata + teacher feedback.
4. Admin chooses Approve or Reject, or lifecycle action for approved content.
5. UI refreshes queue and summary state.

## Cross-Breakpoint Interaction Rules
- Large:
  - Context and actions shown simultaneously for high-throughput workflows.
- Medium:
  - Preserve contextual side panel and primary task pane where possible.
- Small:
  - Use progressive disclosure for filters/secondary information.
  - Keep primary actions within reachable sticky/footer patterns when step-based.

## Regression Capture Matrix
- Public:
  - `public-learn`, `public-learn-filters` (small), `public-login`
- Student:
  - `student-lessons`
- Teacher:
  - `teacher-builder-metadata`, `teacher-builder-blocks`
- Admin:
  - `admin-lessons`, `admin-lessons-selected`
