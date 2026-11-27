# CinNova Firestore Security Specification (Phase 0 TDD — 4-Role RBAC)

## 1. Data Invariants
1. **PII Isolation**: User profile fields (`email`, `phone`, `name`, `age`, `gender`, `favoriteCategories`, `preferredCity`, `preferredLanguage`, `preferredFormat`) live strictly in `/users/{userId}/private/profile` and are readable/writable ONLY when `request.auth.uid == userId` and `request.auth.token.email_verified == true`. Staff and System roles never gain read access to user PII.
2. **Verified Bootstrap Admins & Delegated RBAC**: Only verified emails `26tc1vi148@mitsgwl.ac.in` and `26tc1ta137@mitsgwl.ac.in` (or verified accounts explicitly assigned `'admin'` in `/roleAssignments/{emailKey}`) hold Admin permissions. Role documents in `/roleAssignments/{emailKey}` cannot be self-created or modified by non-admins.
3. **Admin-Only Catalog & Pricing**: `/platformConfig/catalog` (`pricing`, `hiddenMovieIds`, `moviePriceMultipliers`) is readable for catalog display (`get`) and writable exclusively by verified Admins.
4. **Real-Time Seat Engine Integrity**: `/showtimeSeats/{showKey}` allows verified users to manage checkout locks and append confirmed `soldSeats` (`incoming().soldSeats.hasAll(existing().soldSeats)`), while Staff can manage theatre `blockedSeats`/`soldSeats`, and System/Admin control `lockDurationSeconds`, `systemPaused`, and full seat overrides.
5. **Ticket Pass Verification**: `/ticketPasses/{bookingId}` exposes zero PII (`phone`/`age`/`gender` omitted). Users can create passes for themselves (`status == 'valid'`) and read/list only their own passes (`resource.data.uid == request.auth.uid`). Only Staff or Admin can transition `status` from `'valid'` to `'checked-in'` or `'cancelled'`.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated profile read**: `GET /users/u1/private/profile` with `auth: null` -> DENIED.
2. **Staff/System snooping on user PII**: `GET /users/u1/private/profile` as Staff or System UID -> DENIED.
3. **Self-promotion to Admin/Staff/System**: `CREATE /roleAssignments/attacker_gmail_com` by non-admin -> DENIED.
4. **Unverified Admin email spoof**: `UPDATE /platformConfig/catalog` with `email: '26tc1vi148@mitsgwl.ac.in'` and `email_verified: false` -> DENIED.
5. **Non-admin price tampering**: `UPDATE /platformConfig/catalog` setting `pricing.classic: 1` as regular User or Staff -> DENIED.
6. **User marking own ticket checked-in**: `UPDATE /ticketPasses/CNV-123` setting `status: 'checked-in'` as ticket owner -> DENIED.
7. **User deleting already-sold seats**: `UPDATE /showtimeSeats/show1` removing items from `soldSeats` as regular User -> DENIED (`hasAll(existing().soldSeats)`).
8. **User pausing a theatre showtime**: `UPDATE /showtimeSeats/show1` setting `systemPaused: true` as regular User -> DENIED (`affectedKeys` check).
9. **Double check-in replay by Staff**: `UPDATE /ticketPasses/CNV-123` when `existing().status == 'checked-in'` -> DENIED for Staff.
10. **Shadow/ghost privilege field on profile**: `CREATE /users/u1/private/profile` with `role: 'admin'` -> DENIED (`hasOnly` check).
11. **Path variable ID poisoning**: `CREATE /showtimeSeats/bad..id$chars` -> DENIED (`isValidId` check).
12. **Blanket list query across another user's passes**: `LIST /ticketPasses` as regular User without `uid == request.auth.uid` filter -> DENIED.
