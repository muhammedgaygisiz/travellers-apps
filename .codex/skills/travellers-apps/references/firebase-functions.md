# Firebase Functions

## Callable And Trigger Shape

- Put BiteTribe backend functions under `apps/bite-tribe-firebase/functions/src/functions` and export new functions from `apps/bite-tribe-firebase/functions/src/index.ts`.
- Use `onCall` for frontend-requested operations and check `request.auth` before reading user-scoped data.
- Use Firestore triggers such as `onDocumentCreated('bites/{biteId}', ...)` for aggregate side effects caused by writes.
- On the frontend, prefer the established Capawesome call shape:

```ts
await FirebaseFunctions.callByName<Request, Response>({
  name: 'functionName',
  data,
});
```

## Firestore Query Gotchas

- Firestore `orderBy('field')` only returns documents where `field` exists. For an aggregate leaderboard or similar list, ensure the aggregate field exists on all candidate docs before ordering.
- Do not use `where('field', '==', null)` when the goal is to find missing fields. Firestore does not match documents where the field is absent. Load the relevant docs and filter with a type check such as `typeof data['field'] !== 'number'`.
- For migration-style callables, if any document is missing the aggregate field, recompute the aggregate for the whole relevant collection rather than only patching the missing documents. This keeps stale existing aggregate values from surviving the migration.
- For count aggregates, prefer Firestore count aggregation queries over loading every matching document:

```ts
const countSnap = await db.collection('bites').where('userId', '==', userId).count().get();
```

## Writes And Batching

- Use `FieldValue.increment(1)` for trigger-maintained counters when a single write event should update one owner document.
- Use batched writes for migration backfills and commit before the 500-write Firestore batch limit.
- When a trigger may run before a target user document exists, use `set(..., { merge: true })` for additive aggregate fields only when that behavior is acceptable; otherwise check document existence and log a skip.

## Operational Logging

- Import `logger` from `firebase-functions` and prefer `logger.info`/`logger.warn` over `console.log` in functions.
- Log auth rejections, request start, migration decisions, batch commits, and sanitized result summaries.
- Keep metadata structured and small. Avoid logging full private user documents, emails, tokens, full request payloads, or other sensitive data.
- For public/private user lists, log only non-sensitive fields such as ids, privacy flags, counts, and result sizes.
