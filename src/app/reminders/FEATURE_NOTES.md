# Feature Notes — Create Reminder Screen

## Files Changed / Created

| File | Change |
|---|---|
| `src/Services/reminders/index.ts` | New — `createReminder` thunk, types for payload and API responses |
| `src/Services/index.ts` | Added barrel re-export for `./reminders` |
| `src/Store/reducers/remindersReducer.ts` | Already existed; no changes needed |
| `src/app/reminders/create.tsx` | New — Create Reminder screen |
| `src/app/_layout.tsx` | Registered `reminders/create` route in the Stack navigator |
| `src/Localization/keys/index.ts` | Already contained all required keys |
| `src/Localization/languages/en.ts` | Already contained all required English strings |
| `src/Localization/languages/vi.ts` | Already contained all required Vietnamese strings |

---

## User Flow to Reproduce

1. Launch the app.
2. Navigate to `/reminders/create` (e.g. via a button on the home screen or by typing the route directly in the URL bar of Expo Go).
3. The "Create Reminder" screen appears with:
   - **Title** — single-line text input (required).
   - **Description** — multiline text input (optional).
   - **Due Date** — single-line text input, placeholder `YYYY-MM-DD HH:MM` (optional). The value is sent as-is in the `due_date` field; no date picker is used at this stage.
   - **Priority picker** — three toggle buttons: Low / Medium / High. Medium is selected by default.
   - **Submit button** — labelled "Create Reminder".

### Happy path
1. Enter a title.
2. Optionally fill in description, due date, priority.
3. Tap "Create Reminder".
4. Button shows an `ActivityIndicator` while the request is in flight.
5. On a 201 response the new reminder is prepended to the Redux `reminders.items` list, a success `Alert` is shown, and the screen navigates back.

### Error paths
- **Empty title**: client-side validation fires before any network call; inline error message is displayed beneath the priority picker.
- **401 Unauthorized**: auth token is cleared from Redux (user is effectively logged out); the `router.back()` is not called — the screen shows the inline error.
- **422 Validation error**: the `detail` array from the FastAPI response is joined and shown as an inline error.
- **Other network failure**: a fallback error message is shown inline.

---

## Redux State Introduced / Used

Slice: `reminders` (`src/Store/reducers/remindersReducer.ts`)

| Action | When dispatched |
|---|---|
| `setLoading(true)` | Immediately before the fetch |
| `setLoading(false)` | After the fetch resolves (success or error) |
| `setError(message \| null)` | On error; cleared to `null` at the start of each attempt |
| `addReminder(reminder)` | On a successful 201 response — prepends the new item |

Selector used: `state.reminders.loading` (to disable/show spinner on the submit button).
Auth token read from: `state.auth.accessToken`.

---

## API Call

`POST /api/v1/reminders`
Bearer token sourced from `state.auth.accessToken`.
Handles: 201 (success), 401 (clears auth), 422 (shows validation messages).
