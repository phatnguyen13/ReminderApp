# QA Report — Reminder Creation Feature

**Date**: 2026-03-26
**QA Engineer**: qa-engineer (claude-sonnet-4-6)
**Feature**: Create Reminder — `POST /api/v1/reminders` + `src/app/reminders/create.tsx`

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Backend API (pytest) | PASS — 7/7 tests green | All validation, auth, and happy-path cases pass |
| Frontend TypeScript | FAIL | 1 feature-introduced error + pre-existing env errors |
| Frontend Prettier | FAIL | 8 files have formatting issues (pre-existing) |
| Contract alignment | FAIL | 3 critical mismatches between frontend and backend |
| Screen registration | FAIL | `create.tsx` not added to Expo Router `_layout.tsx` |

---

## Automated Check Results

### Backend — pytest

```
collected 7 items

tests/test_reminders.py::test_create_reminder_success          PASSED
tests/test_reminders.py::test_create_reminder_minimal_fields   PASSED
tests/test_reminders.py::test_create_reminder_missing_title    PASSED
tests/test_reminders.py::test_create_reminder_title_too_long   PASSED
tests/test_reminders.py::test_create_reminder_invalid_priority PASSED
tests/test_reminders.py::test_create_reminder_no_token         PASSED
tests/test_reminders.py::test_create_reminder_invalid_token    PASSED

7 passed, 2 warnings in 0.09s
```

All backend tests pass. The 2 warnings are unrelated deprecation notices from `passlib`.

### Frontend — TypeScript (`npx tsc --noEmit`)

The project's `node_modules/` is not installed (no `node_modules` directory found), so all
`Cannot find module` errors are environment setup failures, not code bugs. After filtering
those out, one feature-introduced error remains:

```
src/app/reminders/create.tsx(62,38): error TS7006: Parameter 'e' implicitly has an 'any' type.
```

Line 62 of `create.tsx` iterates over `result.validationErrors` and maps `(e) => e.msg`
without typing `e`. This will cause a compile failure once `node_modules` is present.

### Frontend — Prettier (`npx prettier --check "src/**/*.{ts,tsx}"`)

```
[warn] src/app/_layout.tsx
[warn] src/app/[missing].tsx
[warn] src/app/index.tsx
[warn] src/app/login.tsx
[warn] src/app/onboard/_layout.tsx
[warn] src/app/onboard/one.tsx
[warn] src/app/register/index.tsx
[warn] src/Localization/keys/index.ts
8 files with formatting issues.
```

None of the 8 flagged files are the new reminder files. The new files
(`src/app/reminders/create.tsx`, `src/Services/reminders/index.ts`) were not flagged,
meaning their formatting is compliant. The 8 failures are pre-existing.

---

## Bugs Found

---

**Bug #1**
**Teammate**: frontend-dev
**Severity**: critical

**Steps to Reproduce**:
1. Launch the app.
2. Navigate to the Create Reminder screen (any route that leads there).

**Expected**: Screen renders and the route is handled by Expo Router.

**Actual**: The screen cannot be reached. `src/app/reminders/create.tsx` exists on disk but
`src/app/_layout.tsx` contains no `<Stack.Screen name="reminders/create" .../>` entry.
Expo Router requires every screen to be declared in the navigator. Without the declaration
the screen is unreachable from the rest of the app.

**Suggested Fix**: Add the following entry to `src/app/_layout.tsx` inside `<Stack>`:

```tsx
<Stack.Screen name="reminders/create" options={{ title: 'Create Reminder' }} />
```

---

**Bug #2**
**Teammate**: frontend-dev
**Severity**: critical

**Steps to Reproduce**:
1. Open `src/Config/index.ts`.
2. Open `src/Services/reminders/index.ts` and observe the URL construction on line 41.

**Expected**: `Config.API_URL` points to the ReminderApp FastAPI backend so requests reach
`POST /api/v1/reminders`.

**Actual**: `Config.API_URL` is set to `'https://jsonplaceholder.typicode.com/'`. The
constructed URL becomes `https://jsonplaceholder.typicode.com/api/v1/reminders`, which is an
external third-party service that does not implement this endpoint. Every reminder creation
request will fail at runtime.

**Suggested Fix**: Update `src/Config/index.ts` to point to the ReminderApp backend (e.g.,
`http://localhost:8000/` for development, with environment-specific overrides for staging and
production).

---

**Bug #3**
**Teammate**: frontend-dev
**Severity**: high

**Steps to Reproduce**:
1. Look at `src/Store/reducers/remindersReducer.ts`, line 6: `id: number`.
2. Look at `backend/schemas/reminder.py`, `ReminderData.id: str` and
   `backend/services/reminder_service.py` where `id=str(uuid.uuid4())` is assigned.
3. Create a reminder successfully via the API and inspect the response.

**Expected**: The `id` field in the `Reminder` TypeScript interface matches the backend's
UUID string, e.g., `"3fa85f64-5717-4562-b3fc-2c963f66afa6"`.

**Actual**: The `Reminder` interface declares `id: number`. The backend always returns `id`
as a UUID `string`. TypeScript will accept the wrong type at the call site and runtime
comparisons / lookups keyed on `id` will silently fail because `"some-uuid" !== 1`.

**Suggested Fix**: Change line 6 of `src/Store/reducers/remindersReducer.ts` from
`id: number` to `id: string`.

---

**Bug #4**
**Teammate**: frontend-dev
**Severity**: high

**Steps to Reproduce**:
1. The backend returns `401` when the access token is absent or invalid.
2. `src/Services/reminders/index.ts` lines 50-53: on a 401 it calls `dispatch(clearAuth())`
   and returns `{ success: false, validationErrors: null }`.
3. Back in `create.tsx` lines 59-67: the `else` branch on `!result.success` displays an
   inline error message (the required-title fallback string).

**Expected**: A 401 response should redirect the user to the login screen, since their
session has expired.

**Actual**: The token is cleared from the Redux store, but `router.push('login')` (or
equivalent) is never called. The user stays on the Create Reminder screen and sees the
generic error "Title is required" — an incorrect and confusing message for an auth failure.
Additionally, `src/Services/base.ts` has a `401` interceptor comment stub that also does not
navigate:

```ts
if (result.error && result.error.status === 401) {
    // here you can deal with 401 error
}
```

**Suggested Fix**: After `dispatch(clearAuth())` in `src/Services/reminders/index.ts`,
dispatch a navigation action or emit an event that the screen (or a root-level auth guard)
handles to redirect to the login screen. A dedicated `CREATE_REMINDER_ERROR_UNAUTHORIZED`
localization key should also be added so the error shown before redirect is accurate.

---

**Bug #5**
**Teammate**: frontend-dev
**Severity**: medium

**Steps to Reproduce**:
1. Open `src/app/reminders/create.tsx`, line 62.
2. Run `npx tsc --noEmit` with `node_modules` installed.

**Expected**: No TypeScript compilation errors in new feature files.

**Actual**: The lambda `result.validationErrors.map((e) => e.msg)` has an implicit `any`
type on parameter `e` (TS7006). The project's `tsconfig` does not set `noImplicitAny: false`,
so this is a compile error.

**Suggested Fix**: Explicitly type the parameter as `ValidationError` (already imported from
`@/Services/reminders`):

```ts
result.validationErrors.map((e: ValidationError) => e.msg)
```

---

**Bug #6**
**Teammate**: frontend-dev
**Severity**: low

**Steps to Reproduce**:
1. On the Create Reminder screen, enter an invalid (non-ISO-8601) string in the Due Date
   field (e.g., `"tomorrow"`).
2. Tap "Create Reminder".

**Expected**: The field is validated before submission or the backend 422 error is surfaced
clearly with the field name.

**Actual**: The due date input is a plain `TextInput` with no format validation and no
date-picker. The placeholder says `"YYYY-MM-DD HH:MM"`, but that format is not ISO 8601
(missing seconds and timezone). Submitting an unparseable date causes a backend 422. The 422
handler does surface the error via `validationErrors`, but the message from FastAPI will say
something like `"value is not a valid datetime"` with no actionable guidance in the UI.

**Suggested Fix**: Either use a date-picker component to eliminate invalid input, or add
client-side regex/Date.parse validation before calling the API. Also correct the placeholder
to reflect a fully valid ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`).

---

## Full Test Plan

### Feature: Create Reminder

---

#### Backend API — `POST /api/v1/reminders`

**Scope**: backend

| # | Test Case | Input | Expected Result | Automated | Pass/Fail |
|---|-----------|-------|-----------------|-----------|-----------|
| 1 | Happy path — all fields | `{title, description, due_date, priority: "high"}` with valid token | 201 + envelope `{status:"ok", message:"Reminder created", data:{id, title, description, due_date, priority:"high", completed:false, created_at}}` | Yes (`test_create_reminder_success`) | PASS |
| 2 | Happy path — title only | `{title}` with valid token | 201 + `data.description=null`, `data.due_date=null`, `data.priority="medium"`, `data.completed=false` | Yes (`test_create_reminder_minimal_fields`) | PASS |
| 3 | Missing title | `{description:"x"}` with valid token | 422 Unprocessable Entity | Yes (`test_create_reminder_missing_title`) | PASS |
| 4 | Title too long (201 chars) | `{title: "x"*201}` with valid token | 422 | Yes (`test_create_reminder_title_too_long`) | PASS |
| 5 | Title exactly 200 chars | `{title: "x"*200}` with valid token | 201 (boundary) | No | NOT RUN |
| 6 | Title empty string | `{title: ""}` with valid token | 422 (min_length=1) | No | NOT RUN |
| 7 | Title whitespace-only | `{title: "   "}` with valid token | 422 or 201 with trimmed empty (backend does not trim — API accepts it) | No | NOT RUN |
| 8 | Invalid priority | `{title:"x", priority:"urgent"}` with valid token | 422 | Yes (`test_create_reminder_invalid_priority`) | PASS |
| 9 | No auth token | `{title:"x"}` no Authorization header | 401 | Yes (`test_create_reminder_no_token`) | PASS |
| 10 | Malformed token | `Authorization: Bearer garbage` | 401 | Yes (`test_create_reminder_invalid_token`) | PASS |
| 11 | Expired token | Token with `exp` in the past | 401 | No | NOT RUN |
| 12 | Refresh token used as access token | Token with `type:"refresh"` | 401 (security.py checks `type`) | No | NOT RUN |
| 13 | Invalid ISO 8601 due_date | `{title:"x", due_date:"tomorrow"}` | 422 | No | NOT RUN |
| 14 | Valid due_date — UTC Z suffix | `{title:"x", due_date:"2026-04-01T09:00:00Z"}` | 201 | No | NOT RUN |
| 15 | Response envelope shape | All fields present | `status`, `message`, `data` keys all present | Yes (asserted in `test_create_reminder_success`) | PASS |
| 16 | `id` field is UUID string | Inspect `data.id` | Non-empty UUID string (not an integer) | No | NOT RUN |
| 17 | `completed` defaults to false | Minimal payload | `data.completed === false` | Yes | PASS |

---

#### Frontend Screen — `src/app/reminders/create.tsx`

**Scope**: frontend

| # | Test Case | Action | Expected Result | Automated | Pass/Fail |
|---|-----------|--------|-----------------|-----------|-----------|
| 1 | Screen reachable via router | Navigate to `reminders/create` | Screen renders without crash | No | FAIL — screen not registered in `_layout.tsx` (Bug #1) |
| 2 | Submit with empty title | Tap "Create Reminder" with blank title field | Inline error "Title is required" shown; no API call made | No (manual) | NOT RUN |
| 3 | Happy path | Fill title, tap Submit | Loading spinner appears; on 201 success Alert shown; `router.back()` called; `addReminder` dispatched | No (manual) | NOT RUN |
| 4 | Redux state after success | Successful create | `state.reminders.items[0]` contains the new reminder; `state.reminders.loading === false`; `state.reminders.error === null` | No | NOT RUN |
| 5 | Loading state — button disabled | Tap Submit while request in flight | Button opacity 0.6, `disabled={true}`, spinner visible | No (manual) | NOT RUN |
| 6 | API returns 422 | Force bad payload via network intercept | Inline error shows FastAPI validation message text | No | NOT RUN |
| 7 | API returns 401 | Token cleared or expired | `clearAuth()` dispatched; user redirected to login | No (manual) | FAIL — no redirect (Bug #4) |
| 8 | Priority selector — default | Screen opens | "Medium" button highlighted | No (manual) | NOT RUN |
| 9 | Priority selector — change | Tap "High" | "High" highlighted; others unhighlighted | No (manual) | NOT RUN |
| 10 | Due date — free text | Enter `"tomorrow"` | No client-side validation; will produce 422 after submit | No (manual) | FAIL — no validation (Bug #6) |
| 11 | Localization — English | Default locale | All labels show English strings from `en.ts` | No (manual) | NOT RUN |
| 12 | Localization — Vietnamese | Set locale to `vi` | All labels show Vietnamese strings from `vi.ts` | No (manual) | NOT RUN |
| 13 | Localization key parity | Compare `en.ts` vs `vi.ts` | Both files contain identical key sets for all `CREATE_REMINDER_*` keys | Static review | PASS — keys match |

---

#### Integration

**Scope**: integration

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 1 | Auth token attached to request | `Authorization: Bearer <token>` header present in `POST /api/v1/reminders` | Code review PASS — `src/Services/reminders/index.ts` line 44 conditionally adds header |
| 2 | No token → no header sent | When `state.auth.accessToken === null`, header is omitted (backend returns 401) | Code review PASS — conditional spread on line 44 |
| 3 | API URL correct | Request hits the FastAPI backend, not an external URL | FAIL — `Config.API_URL` points to `jsonplaceholder.typicode.com` (Bug #2) |
| 4 | 401 → redirect to login | User sent to login screen on 401 | FAIL — `clearAuth()` dispatched but no navigation (Bug #4) |
| 5 | 422 error surfaced | FastAPI validation detail rendered in UI | Code review PASS — `validationErrors` parsed and joined |
| 6 | Offline / network error | `fetch` throws `TypeError: Network request failed`; `catch` block sets fallback error string; no crash | Code review PASS — `catch` block in `handleSubmit` handles all thrown errors |
| 7 | `id` type contract | Backend UUID string consumed as TypeScript `number` | FAIL — type mismatch (Bug #3) |
| 8 | Response `data` shape | Frontend `Reminder` interface matches backend `ReminderData` schema | FAIL for `id` (string vs number); all other fields match |

---

## Test Coverage Gaps

The following scenarios are not covered by the existing `test_reminders.py` suite and should
be added:

1. **Title boundary (200 chars)** — confirm 200 chars is accepted (not just 201 rejected).
2. **Empty-string title** — confirm `""` is rejected with 422 (min_length=1 should cover
   this but it is worth an explicit test).
3. **Whitespace-only title** — `"   "` passes Pydantic's min_length check since it counts
   raw characters. The backend would store it. Consider adding a custom validator or a
   test that documents the current behavior.
4. **Expired token** — verify that a JWT past its `exp` is rejected with 401.
5. **Refresh token used as access token** — verify `security.decode_access_token` rejects
   tokens with `type != "access"`.
6. **Invalid `due_date` string** — verify 422 for `"tomorrow"` or `"not-a-date"`.
7. **`due_date` in the past** — document whether the API accepts or rejects past-dated
   reminders (currently accepted; may be intentional).

---

## Summary of Bugs

| Bug | Severity | Teammate | Status |
|-----|----------|----------|--------|
| #1 — `create.tsx` not registered in `_layout.tsx` | critical | frontend-dev | Open |
| #2 — `Config.API_URL` points to wrong server | critical | frontend-dev | Open |
| #3 — `Reminder.id` typed as `number`, backend returns `string` UUID | high | frontend-dev | Open |
| #4 — 401 clears auth but does not navigate to login | high | frontend-dev | Open |
| #5 — Implicit `any` on `e` in `validationErrors.map` (TS7006) | medium | frontend-dev | Open |
| #6 — Due date field has no client-side format validation | low | frontend-dev | Open |
