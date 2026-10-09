# UC - Manage Profile And Social Graph

## Status

**Level:** L1
Supported today. Profile view and edit, public profiles, follow and unfollow with their
lists, the visibility choice, and the two identity contracts below all ship. Onboarding
has collected an optional home city since [#1271], so a profile without one stays the
normal case. Follow suggestions for an account that follows nobody ship with [#1708].

## Goal

Any account can maintain its identity and read profile and social context to judge whether
to trust a food experience. This page owns what a profile renders, what identifies the
signed-in account, and the follow relation.

## Actors

- **Bite Creator** — views and edits its own profile, sets its visibility, opens other
  public profiles, and follows or unfollows them.

## Flow

- User views or edits their own profile.
- User opens public profiles.
- User follows or unfollows other users.
- User inspects followers and following.
- A user who follows nobody is offered people to follow, and follows them in one
  tap. See `Follow Suggestions` below.
- Profile identity is used in search and Bite trust context.
- Profile Bites are always listed newest first. The profile is a timeline of what
  a user cooked or ate, so it ignores the distance sorting and the my-bites
  filters. See [issue-1118](../records/issue-1118.md).
- While a profile loads, the page shows a skeleton in the shape of the loaded
  profile instead of the field fallbacks. Placeholder values such as the FREE
  badge must never be shown for a profile that has not arrived yet, because the
  user reads them as facts about that person. The "profile not available"
  message stays reserved for a profile that finished loading without data. See
  GitHub issue [#1166]. The "no location" placeholder this rule also named is
  gone; see the identity contract below.
- The signed-in user's own personal profile states whether it is public or
  private and leads from there to the visibility switch in profile edit. Saved
  visibility is a privacy fact the user must be able to read off the profile
  itself rather than confirm by opening the edit form. A profile with no saved
  choice reads as private. See GitHub issue [#1188].

## Profile Identity Contract

Issue [#1270]
stopped the profile repeating itself. The header carries the display name and
the line under it carries what the display name does not say — a real name, a
city — so that line only earns its space when it has something of its own.

- A display name is what the user chose to be called. A real name is a separate
  fact the user supplies in profile edit, and nothing else may invent one.
  Onboarding never asks for it, so nothing written during onboarding, during
  the first user document write, or while reading a profile back seeds
  `fullName` from the auth or claimed display name. An absent real name stays
  absent.
- A stored `fullName` equal to the display name is read as the absence of a
  real name, not as a second one. Every account created before this carries the
  copied value permanently, and the profile has to be right for them without a
  migration, so the source fix alone is not enough — the suppression is the
  half that repairs existing accounts. The comparison ignores case and
  surrounding spaces.
- A real name that genuinely differs still shows, which is the case the line
  exists for: `Mo` in the heading over `Muhammed Gaygisiz, Bern`.
- A profile with no city shows no city. The former "no location" placeholder
  announced missing data for something the app did not ask for at the time, which
  reads as a fact about that person rather than as an unfilled optional field.
  With neither a distinct real name nor a city the line is not rendered at all.
- Onboarding was the product half of this and shipped as issue [#1271], which added
  an optional home city step. Optional is the operative word: a profile with no
  city is still the ordinary case, so this contract still governs what is
  rendered when there is none.

## Account Identity In The Menu

Issue
[#1260] moved
the answer to "who am I signed in as" out of the profile page and into the app
menu. Release-candidate Run 5 could not name the account it was testing with
without leaving the menu, and pull request [#1240] had already established that the
app should name the account before consequential actions, by identifying it in the
deletion flow; knowing who you are is the same question asked earlier.

- The signed-in account is named on the profile entry rather than in a header
  block of its own. The account photo replaces that entry's icon at the icon's
  own size, and the display name is the entry's subtitle. The menu identifies
  the account without taking any height it did not already have.
- The identity shown is the same `PublicUser` record the profile page renders,
  so the menu cannot disagree with the profile, and it follows the session: it
  arrives when the profile loads and is gone when the session ends.
- Only non-secret identity appears. The reduced form is avatar and display name;
  the email is not shown in the menu, because the entry has one line of
  supporting text and the display name is what identifies the account to its
  owner across email/password, Google, and Apple sign-in alike.
- A missing or unloadable photo falls back to the anonymous icon, and a missing
  display name renders no subtitle. Neither degradation costs the entry its
  label or its navigation.

## Follow Suggestions

Issue [#1708] gives a new account somebody to follow. D1 retention was 5% when it
was specified, and nothing in the app pointed a newcomer at anyone. What a follow
gives the follower is a push when that person posts (`notifyFollowersOnNewBite`) and
a populated Following list. The home feed sorts by distance or date across everyone
and has no following filter, so a suggestion is only worth making for somebody who
actually posts.

- **Who can be suggested.** A profile with `public == true`, a display name, a
  `biteCount` of at least 1 and a `lastSeenTimestamp` within the last 30 days, whose
  Firebase Auth account exists and is not blocked. A private profile is never
  suggested: suggesting it would show the account to strangers, which is what private
  rules out. The public-and-named half is the same rule the follow-up mail applies
  (`UC - Guide New Users After Registration`), held in one place for both.
- **Who never is.** The viewer, and everybody the viewer already follows.
- **Order.** Up to five people, ranked in three tiers and never listed twice:
  1. `nearby` - creators of listable Bites within 10km of a position the app already
     holds, the one with most Bites there first. The radius is the nearby feed's.
     The position is the one the feed already read or, on a device where location is
     already granted, a fresh read; this feature never asks for location, and the web
     build, which has no grant to check, only uses what the feed read.
  2. `curated` - the hand-picked `config/newUserFollowUp.userIds`, so a newcomer meets
     the same people in the app and in the follow-up mail.
  3. `active` - the accounts with the most Bites.
- **Where.** Three places, all one component:
  - the onboarding finish step, where following stays optional and never blocks
    Finish;
  - the user's own empty Following list - never somebody else's;
  - a card above the home feed while the user follows nobody. It can be closed, which
    hides it for seven days on every device (`settings.followSuggestionsDismissedAt`),
    and it goes once the user follows anybody.
- **One tap.** Follow writes both follow edges at once. A failed write leaves the
  person in the list, puts the button back and says so; a followed person leaves every
  surface's list at once. Tapping a card on home or the Following list opens the
  profile; in onboarding it does not, because the assistant is not left mid-way.
- **Failure.** Suggestions are an extra. When the call fails the surfaces show nothing
  rather than an error, because there is nothing the user could do about it.
- **Measured.** `follow_suggestions_shown`, `follow_suggestion_followed` and
  `user_followed`, defined in [Implementation - Analytics Events](../implementation/analytics-events.md).

## Out Of Scope

- A profile is not a shareable destination. There is no profile share action, no
  public profile share URL, and no native profile deep link, and none of them is
  planned. A profile is reached inside the app from a Bite, a follower or
  following list, or search.
- Public visibility means other BiteTribe users may open the profile in the app.
  It does not mean the profile is published as a link that can be handed to
  someone outside the app.
- Sharing is a Bite capability. Making profiles shareable would be a new product
  decision with its own privacy handling, not a completion of existing work. See
  [issue-1190](../records/issue-1190.md) and [UC - Inspect Bite Details](uc-inspect-bite-details.md).

## MVP Classification

**[MVP]** — profile view and edit, public profiles, the public/private visibility choice
readable off the profile itself, the loading skeleton that withholds placeholder facts, and
both identity contracts. Visibility is a privacy control the product offers, so getting
identity wrong here is the [#1308] class of defect rather than polish.

**[Secondary]** — the social graph: follow and unfollow, the follower and following
lists, and follow suggestions. Shipped, but the contribution loop does not depend on it
for the initial release.

## App Store Review Area

Relevant. The public/private profile is a privacy control, and the profile photo uses the
photo library — the permission itself is collected in onboarding rather than here, see
[UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md). The identity data this page renders is covered
by the name, photo and user-ID entries declared in [Implementation - Store Declarations](../implementation/store-declarations.md).
Follow suggestions add no permission and no purpose string: they use a position only
where location is already granted, so the priming rule onboarding owns is untouched, and
their three events are product interaction like the rest.

## Supported Evidence

- `my-profile`
- `edit-profile`
- `profile/:userId`
- `followers/:userId/:type`
- Profile API.
- Public-user conversion.
- Playwright coverage for profile editing, public-profile navigation,
  follower/following lists, and follow/unfollow persistence.
- Follow suggestions: the `suggestPeopleToFollow` callable and the shared
  `suggestable-person.ts` rule in `apps/bite-tribe-firebase/functions/src/functions/users`;
  `FollowSuggestionsService` in `libs/bite-tribe/follow-suggestions/data-access`; the
  `bt-follow-suggestions` component and its stories in
  `libs/bite-tribe/follow-suggestions/ui`.

## Related GitHub Scope

- Issue [#1166] is the profile-loading skeleton fix - no placeholder facts (e.g. the FREE badge) render before a profile arrives. Closed.
- Issue [#1188] made the public/private visibility choice readable directly off the profile. Closed.
- Issue [#1260] moved account identity ("who am I signed in as") from the profile page into the app menu. Closed.
- Issue [#1270], together with onboarding's [#1271], is the Profile Identity Contract above. Closed.
- Issue [#1708] is `Follow Suggestions` above, motivated by the analytics check on [#914] and sharing its pick list with the follow-up mail of [#1707].

## Related Domains

- [User](../domain/user.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Personas](../product/personas.md) — the audiences this page serves: Food lover, Bite creator, and the
  privacy-conscious participant the visibility choice exists for
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) — the same two-names confusion on a surface that publishes
- [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md) — where the photo and location permissions
  are collected
- [issue-1118](../records/issue-1118.md)
- [issue-1190](../records/issue-1190.md)
- [Implementation - Store Declarations](../implementation/store-declarations.md)

[#1166]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1166
[#1188]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1188
[#1240]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1240
[#1260]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1260
[#1270]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1270
[#1271]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1271
[#1308]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1308
[#914]: https://github.com/muhammedgaygisiz/travellers-apps/issues/914
[#1707]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1707
[#1708]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1708
