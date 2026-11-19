# Restaurant Owner Onboarding

## Purpose

The operator's sequence for taking a restaurant from the first call to an
owner who has signed in to the business app, and for taking it back again.
Every step already exists on its own page. This page puts them in order, so
every restaurant is onboarded the same way.

Part of [issue 2128][#2128], under the soft-launch epic [#2123].

The rules behind each step belong to the use cases linked under each step. This page
only says what to do, where, and in which order.

## Before The Call

- You need an admin account (`admin` role) in the admin app.
- Agree with the owner which email address they will sign in with. The
  `business` role and the ownership are both granted to that one account, and
  it is the same account the owner would use in the consumer app.

## Onboarding Steps

| #   | Step                      | Admin-app surface                                               | Callable                                                 |
| --- | ------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Create the restaurant     | `Restaurant candidates` or `Bite places`, then `New restaurant` | `verifyRestaurantCandidate`, or a direct Firestore write |
| 2   | Owner creates an account  | none, the owner signs up in the business app                    | none                                                     |
| 3   | Grant the `business` role | `User management`                                               | `setUserRoles`                                           |
| 4   | Assign ownership          | `Restaurant ownership`                                          | `assignRestaurantOwner`                                  |
| 5   | Tell the owner to sign in | none, by phone or email                                         | none                                                     |

### 1. Create Or Verify The Restaurant

Every restaurant you can assign must already be in the `restaurants`
collection. Start from the place guests already eat at:

- **A pending candidate** on `Restaurant candidates`: click it to open
  `New restaurant` with the name, position and Bites filled in. Saving calls
  `verifyRestaurantCandidate`, which creates the restaurant, links the
  candidate's Bites, and marks the candidate verified
  ([UC - Verify Restaurant Candidate](../use-cases/uc-verify-restaurant-candidate.md)).
- **A place name on `Bite places`** that no restaurant answers to yet: click it
  to open `New restaurant` with the Bites behind that name. Saving writes the
  restaurant document directly, then its menu, then links the Bites.

`New restaurant` has no entry of its own, so a restaurant that no guest has
posted a Bite at yet cannot be created from the admin app.

The photo is optional. If you add one, it is uploaded before the restaurant is
written, and saving shows "Saving the restaurant…" until it is done. An upload
that makes no progress for 30 seconds fails and saves nothing, so you can save
again ([#2172]). The admin app cannot yet add a photo to a restaurant that
already exists ([#1510]). If you leave the photo out, the owner adds it from the
setup checklist in step 5.

Check the restaurant's currency before saving. Its menu prices use it
([#2129]).

### 2. The Owner Creates An Account

The owner signs up with the agreed email address, in the business app or in
the consumer app. Both use the same accounts. An account without the
`business` role is signed out at the business app's login with a generic
failure. The owner should expect that until step 3 is done, so do not send
them to sign in yet.

The account needs no verified email to be granted the role or to sign in.

### 3. Grant The `business` Role

On `User management`, find the account by email and add `business`.
`setUserRoles` replaces the account's roles and keeps every other custom claim.

- An account cannot hold `business` and `staff` together. Remove `staff` first
  if the owner was someone's waiter before.
- The owner does not have to sign out. The business app refreshes the token
  when a role check misses
  ([Architecture - Auth](../architecture/auth.md)).

### 4. Assign Ownership With A Reason

On `Restaurant ownership`, pick the restaurant, then the account, and write a
reason, such as "phone call with the owner, 19 Nov 2026". `assignRestaurantOwner`
adds the account to `ownerUserIds`, sets `claimStatus: claimed`, and writes the
reason to the operator log.

- The account must already hold `business`, which is why step 3 comes first.
- A restaurant can have up to ten owners, and each one is a separate
  assignment with its own reason.
- Assigning the same account again changes nothing and says so.

The rules are in
[UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md).

### 5. Tell The Owner How To Sign In

Nothing is sent automatically. No mail or notification announces the role or
the ownership, so tell the owner yourself:

- which app to open: the BiteTribe business app, not the consumer app;
- to sign in with the agreed email address, using the same method they signed
  up with (password, Google or Apple);
- that support is `support@bitetribe.app`.

## What The Owner Sees On First Sign-In

- **The dashboard**, with their restaurant on the map and in the list. Opening
  it shows the setup checklist, "Finish setting up {name}", which counts what is
  still missing: a photo, the address, opening hours, a description, a website
  or social link, facilities, and a check of the menu BiteTribe built from
  guests' Bites ([#2126]).
- **If step 4 is not done yet**, the dashboard says no restaurant is assigned,
  explains that BiteTribe assigns it, and offers "Email BiteTribe support" and
  "Check again". The restaurant appears without signing out, either through
  "Check again" or when the owner returns to the tab ([#2127]).
- **If step 3 is not done yet**, the login fails and the owner is signed out.

## Taking A Restaurant Back

### Revoke Ownership

On `Restaurant ownership`, each owner has their own revoke action, behind a
confirmation and with a reason. `revokeRestaurantOwner` removes that one
account.

- If other owners remain, they keep every right and the restaurant stays
  `claimed`.
- If it was the last owner, `ownerUserIds` and the claim timestamps are deleted
  and `claimStatus` becomes `revoked`. You can assign the restaurant again
  later.
- The account loses the restaurant from its dashboard on its next load. A link
  or open session to the restaurant is refused and lands on its own list.

### Revoke The `business` Role

On `User management`, remove `business`. Revoke the ownerships first:
`setUserRoles` refuses to remove `business` while the account still owns a
restaurant, and the toast names the restaurants to revoke ([#1539]).

### Account Deletion

If the owner deletes their own account, the account is taken off each
restaurant it owns ([#1568]). Other owners keep the restaurant. If it was the
last owner, the restaurant becomes `revoked`, just as after a manual revoke,
and you can assign it to someone else. Nobody is notified, so check the
restaurant on `Restaurant ownership` when an owner tells you they are leaving.

### What Stays With The Restaurant

Neither revocation deletes anything:

- **The restaurant** stays published and readable in the consumer app, with
  every field the owner filled in.
- **The menu** stays as the owner left it. An operator can still edit the
  restaurant and its menu.
- **The Bites** stay linked to the restaurant. They belong to the guests who
  posted them, not to the owner.
- **Staff** that the owner added keep their association with the restaurant.
  Remove them on the staff card on `Restaurant ownership` if they should go too.

## Related Pages

- [UC - Verify Restaurant Candidate](../use-cases/uc-verify-restaurant-candidate.md)
- [UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md)
- [UC - Operate BiteTribe In The Admin App](../use-cases/uc-operate-bitetribe-in-the-admin-app.md)
- [UC - Maintain Restaurants In The Business App](../use-cases/uc-maintain-restaurants-in-the-business-app.md)
- [Architecture - Auth](../architecture/auth.md)

[#1510]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1510
[#1539]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1539
[#1568]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1568
[#2123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2123
[#2126]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2126
[#2127]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2127
[#2128]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2128
[#2129]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2129
[#2172]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2172
