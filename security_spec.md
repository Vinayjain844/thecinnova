# CinNova Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **PII Isolation**: User profile fields (`email`, `phone`, `name`, `age`, `gender`, `favoriteCategories`, `preferredCity`, `preferredLanguage`, `preferredFormat`) live strictly in `/users/{userId}/private/profile` and are readable/writable ONLY when `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Ownership Integrity**: Every `Booking` and `CalendarAlert` document MUST include `uid == request.auth.uid == userId`, immutable `createdAt == request.time`, and valid IDs matching `^[a-zA-Z0-9_\-]+$`.
3. **Bounded Payloads**: All strings enforce exact `.size()` bounds from `firebase-blueprint.json`, `seats` is bounded to `1..8` strings, `favoriteCategories` is bounded to `0..8` strings, `age` is bounded to `10..120`, and `genres` is bounded to `1..5` strings.
4. **No Ghost Fields & No Terminal Mutation**: Every `create` checks `hasAll` + `hasOnly`; `UserPrivateProfile` updates lock `uid`, `createdAt`, and `provider` via `affectedKeys().hasOnly(['name', 'phone', 'age', 'gender', 'favoriteCategories', 'preferredCity', 'preferredLanguage', 'preferredFormat', 'updatedAt'])`; confirmed `Booking` records cannot be mutated (`allow update: if false`).
5. **Verified Identity & Strict List Enforcement**: Standard writes require `request.auth.token.email_verified == true`. Every `allow list` validates `resource.data.uid == request.auth.uid`.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated profile read**: `GET /users/u1/private/profile` with `auth: null` -> DENIED.
2. **Cross-user PII snooping**: `GET /users/u1/private/profile` with `auth.uid: "u2"` -> DENIED.
3. **Unverified email write**: `CREATE /users/u1/private/profile` with `email_verified: false` -> DENIED.
4. **UID spoofing on profile create**: `CREATE /users/u1/private/profile` with `data.uid: "victim"` -> DENIED.
5. **Shadow/ghost privilege field injection**: `CREATE /users/u1/private/profile` with `isAdmin: true` -> DENIED (`hasOnly` check).
6. **Client-forged server timestamp**: `CREATE /users/u1/private/profile` with `createdAt: <past_timestamp>` -> DENIED (`request.time` check).
7. **Immutable field tampering on update**: `UPDATE /users/u1/private/profile` changing `uid` or `createdAt` or `provider` -> DENIED.
8. **Path variable ID poisoning**: `CREATE /users/u1/bookings/bad..id$with$chars` -> DENIED (`isValidId` check).
9. **Oversized string DoS**: `CREATE /users/u1/private/profile` with `name` > 80 chars -> DENIED.
10. **Unbounded seat array DoS**: `CREATE /users/u1/bookings/b1` with `seats` array of 20 items -> DENIED.
11. **Tampering with confirmed booking amount**: `UPDATE /users/u1/bookings/b1` setting `totalAmount: 1` -> DENIED (`allow update: if false`).
12. **Blanket list query across another user's bookings**: `LIST /users/u1/bookings` with `auth.uid: "u2"` -> DENIED.
