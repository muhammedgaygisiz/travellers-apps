# UC - Manage Profile And Social Graph

## Status

**Level:** L1
Supported today. Profile view and edit, public profiles, follow and unfollow with their
lists, the visibility choice, user-to-user blocking, reporting a profile, and the two
identity contracts below all ship. Onboarding
has collected an optional home city since [#1271], so a profile without one stays the
normal case. Follow suggestions ship with [#1708]. The visited-countries globe
ships with [#1787]. A changed display name reaches every stored copy of it since
[#1827]. A profile can state its pronouns since [#1826]. A profile can be reported to the
Operator since [#1829]. A private profile is unreadable to other accounts since [#1863].

## Goal

Any account can maintain its identity and read profile and social context to judge whether
to trust a food experience. This page owns what a profile renders, what identifies the
signed-in account, the follow relation, the block one account places on another, and the
report one account files against another.

## Actors

- **Bite Creator** — views and edits its own profile, sets its visibility, opens other
  public profiles, follows or unfollows them, blocks or unblocks them, and reports them.
- **BiteTribe Operator** — not an actor here. A profile report reaches them, and what they
  do with it belongs to [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md).

## Flow

- User views or edits their own profile.
- User opens public profiles.
- User follows or unfollows other users.
- The first person a user follows is celebrated: a short confetti burst and
  `You're now following {{user}}. Welcome to their food journey!`, naming the
  followed account by display name only, never a real name ([#1308]). Every follow
  path counts - the profile's follow button through the store's `followUser$`, and
  the follow suggestions on the onboarding finish step, the Following list and home.
  Whether it is the first is asked before the write, as one document of the user's
  own `following` subcollection (`followsAnyone`): the store cannot answer, because
  its `followingCount` is the login-time snapshot and `profileMetadata.following` is
  the count of whichever profile is open, which on a follow is the person being
  followed. A later follow raises no toast, as before; a failed follow, or one where
  the answer cannot be told, celebrates nothing. Nothing is stored, so unfollowing
  everybody and following again celebrates again, which epic [#1741] accepts. The copy
  does not promise the followed account's Bites in the feed: the feed is by place and
  date, not by follow. See GitHub issue [#1799] and the Celebration Rule in
  [Implementation - Ionic Patterns](../implementation/ionic-patterns.md).
- User inspects followers and following.
- A user is offered people to follow, and follows them in one tap. See
  `Follow Suggestions` below.
- User blocks or unblocks another account from that account's profile, per the block
  contract below.
- User reports another account from that account's profile, per the report contract
  below.
- User opens a profile's countries on a globe, per `Visited Countries Globe` below.
- User changes their display name, and the old one is gone from every surface another
  account can open, per `Display Name Copies` below.
- User sets, changes or clears their pronouns in profile edit, per `Pronouns` below.
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

## Profile Visibility Contract

Issue [#1863]. Choosing private has to keep the profile private in the data, not only on
screen: the edit form promises "you will be shown as anonymous", and for somebody
travelling where LGBTQ+ people are persecuted a real name, home city and pronouns that any
account can read are the harm.

- **A private profile is unreadable to every other account.** `/users/{uid}` is readable
  by its owner, and by any other member only while it holds `public: true`. A document
  with no saved choice is private. A Firestore read returns a whole document or none of
  it, so the rules refuse the read rather than trim it: nothing of a private profile -
  real name, email, city, about, photo URL, pronouns, flags, counts - leaves the backend
  to another account's device. Operators and Functions read it through the Admin SDK and
  are not affected. The photo file itself can be read by path only by its owner and by
  operators since [#1350]; its download URL lives on the user document these rules guard.
- **The switch takes effect with the save.** The rule reads the stored `public` flag, so
  the write that makes a profile private is the write that closes it, and the one that
  makes it public opens it. There is no copy of the profile elsewhere to fall behind and
  no migration: every existing document already carries the flag or reads as private
  without it.
- **What another account gets instead.** A refused read is the expected answer, not an
  error. The client turns it into a stand-in holding the uid and `public: false`, which
  every surface already renders as anonymous: the follower and following lists hide the
  row, a Bite's detail page names no creator, and a review keeps the author name stored
  on it, per [UC - Inspect Bite Details](uc-inspect-bite-details.md).
- **The profile page withholds what it still receives.** Opened by its route, another
  account's private profile shows `Anonymous`, the private-profile notice and its
  follow counts, and none of its real name, city, about, pronouns, flags, subscription
  badge, Bite count or Bites. The Bites are a separate collection, readable because a
  Bite card renders a private author anonymously, so the page has to withhold them
  itself. The owner sees everything on their own profile either way.
- **A query has to prove it reads no private profile.** Rules are not filters, so a
  client query over `/users` is refused unless its constraints rule private documents
  out. The owner's own listener filters on `userId == uid`, which the rule admits.
  The About page's member count therefore comes from the `countUsers` callable, and
  still counts every account.
- **Not in this contract.** A public profile still exposes its email to every member;
  whether it should is a separate product decision.

## Pronouns

Issue [#1826], part of epic [#1823]. A profile could say what to call a person but not
how to refer to them. Pronouns can reveal gender identity, which the GDPR may treat as
sensitive, so the field is held to one line: the user writes it, the user publishes it,
and nothing else reads it.

- **Optional, and never asked.** Set in profile edit, directly under the display name.
  Onboarding neither shows nor requires it, and BiteTribe asks for no gender.
- **Free text.** No picker, because no fixed list covers every language and every person.
  Trimmed, at most 40 characters. A longer value is refused with a message that says the
  limit, not cut off; the Firestore rules refuse it from any other client too.
- **Empty means absent.** Clearing the field removes `pronouns` from the user document
  rather than storing an empty string, so a profile that never had pronouns and one whose
  owner cleared them read the same.
- **Where it shows.** The profile header, after the display name, smaller and in the
  secondary colour. Not on Bite cards, reviews, search results, the leaderboard or the menu.
- **Visibility.** Another account sees pronouns on a public profile only. On a private
  profile, or one with no saved choice, nobody but the owner can read them, per the
  `Profile Visibility Contract` below.
- **Never used.** Not searchable (`searchUsers` does not match or return it), not indexed,
  carried by no analytics event, and used for no suggestion or ranking.
- **Content filtering.** It is user-authored text published to others, so the
  pre-publication filter of [#1610] covers it alongside the display name once that ships.

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
- **Who never is.** The viewer, everybody the viewer already follows, and everybody the
  viewer blocked, per the User Block Contract below.
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
  - the user's own Following list, empty or not - never somebody else's. Following a
    few people is no reason to stop being offered more, and nobody already followed is
    ever suggested. Under an empty list the row is centred with the empty message;
    under a filled one it starts in line with the rows;
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

## Visited Countries Globe

Issue [#1787], suggested by a user who had built a travel globe of his own. The flag
row under a profile says which countries a user has Bites in; the globe shows where
they are.

- **Data.** The profile's `countryCodes`, the list the flags already show and
  `user-country-codes.ts` keeps in step with the user's Bites, decides which countries
  appear. The page writes nothing; its one extra read is the user's Bites, counted per
  country for the list below.
- **Entry.** A "Show on globe" button under the flags, on every profile that shows
  flags - the viewer's own and anybody else's they can open. A profile without
  country codes shows neither.
- **Page.** `world/:userId`. "Your Bite World" on the viewer's own profile, "{name}'s Bite World"
  on another, with the number of countries and of the continents they lie on. The
  continent of each country is fixed in the globe's country table: Russia counts as
  Europe, Türkiye as Asia, Cyprus as Europe.
- **Globe.** Drawn on the device from bundled country outlines: no map tiles, no
  network, the same in light and dark. It opens facing the highlighted countries and
  turns slowly until the first touch, never under reduced motion. Drag turns it;
  pinch, the wheel and `+` / `-` zoom between 1x and 12x; the globe button goes back
  to the whole globe. A tapped country is turned to the middle, zoomed to fit and
  named in the app language - also one without Bites.
- **Country list.** Under the globe, one row per country: flag, name in the app
  language, and the number of the user's Bites there, most first and then by name.
  Tapping a row selects the country and turns the globe to it, as a tap on the globe
  does. Rows show no number while the Bites are counted or if they cannot be read; a
  flagged country with no counted Bite - its address still resolving - shows 0.
- **Small countries.** Countries the coarse outlines leave out, such as Singapore and
  Malta, load the finer outlines and are drawn as a dot until zoom makes them a shape.
- **Measured.** `world_globe_open`, `world_globe_country_tap` and `world_globe_zoom`,
  defined in [Implementation - Analytics Events](../implementation/analytics-events.md).
- **Not part of it.** No journey playback, no link from a country to the Bites there,
  no street-level detail.

## Platform Countries Globe

Issue [#1893]. The About page shows the same `bt-globe`, lit up with every country in
which at least one Bite exists, from anybody. It is the platform's counterpart of the
visited-countries globe above: the same drawing and gestures, no title, no counts, no
list.

- **Data.** One document, `meta/biteCountries`, holding `countryCodes`: the distinct
  alpha-2 codes, normalised as `user-country-codes.ts` normalises. Firestore cannot group
  Bites by country, so the backend keeps the list and the About page reads it once.
  `meta` is readable by members and written only by Functions.
- **Kept by.** `enrichBiteAddressOnWrite`, when it resolves a Bite's country, adds it.
  A Bite that moves to another country, fails to resolve after a move, or is deleted
  (`decrementBiteCountOnBiteDelete`) takes its old country off the list only once no
  other Bite is filed under it - the rule the profile's country badges follow. A failing
  update is logged and never marks the Bite's address `failed`.
- **Rebuilt by.** The `bite-countries` migration in the admin app, the first fill of the
  document and the repair for drift; see
  [UC - Run Operational Migrations](uc-run-operational-migrations.md).
- **Shown.** Above the Bite and member counts, only once the list has arrived and holds
  a country. While it loads, if the read fails, or before the first fill, the page is as
  it was without it.
- **Desktop.** The About page opts into the desktop layout (`desktopLayout`). From
  1024px, with a globe, the text, counts, privacy policy and store links take the left
  column and the globe the right, held in view while the left column scrolls - the
  start page's two-column pattern. Without a globe, and below 1024px, it is the single
  phone column, in the order intro, globe, facts.

## User Block Contract

Issue [#1609]. A block is a personal boundary one account sets against another. It needs
no judgement about whether the other account did anything wrong, and it is not the
Operator's block in [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md), which disables an
account for everybody.

- Blocking is offered on another account's profile, from the header menu and behind a
  confirmation that says what it does. It is deliberately secondary: follow and unfollow
  stay the one prominent action on a profile. Once the account is blocked, Unblock takes
  the place Follow had, since following is no longer offered, and needs no confirmation.
- The blocked account's Bites, reviews and profile do not appear to the blocker: not in
  the feed, the map, the weekly Bites, search, a Bite's review threads, or anybody's
  follower and following lists. A reply somebody else wrote to a blocked account's review
  stays, and reads as a review of its own.
- The blocked account's profile, opened directly, shows who it is and the way to unblock,
  and none of its content.
- Blocking removes the follow relation in both directions. Unblocking does not restore it.
- Blocking removes the tagged users between the two accounts in both directions: the
  blocked account comes off the blocker's Bites and the blocker off the blocked account's
  (issue [#1916]). Unblocking does not restore those either.
- The blocked account is not told and sees no change. Nothing it can read records the
  block, so a refusal it could observe would itself be the notification.
- A block takes effect on what the blocker already has loaded, not only on the next read.
- A block is the blocker's to lift and nobody else's. Deleting either account removes it,
  per [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md).

The storage, the callables and the rules are in [User](../domain/user.md).

## Profile Report Contract

Issue [#1829]. A report asks the Operator to look at an account. It exists for abuse that
sits in the profile itself - a display name, a photo, a pattern across accounts - rather
than in any one Bite, which a Bite report ([UC - Inspect Bite Details](uc-inspect-bite-details.md)) cannot reach. A block protects
the person who blocks; a report is how somebody else gets protected too.

- Reporting is offered on any account's profile that is not the user's own, from the
  same header menu as Block, and stays there once the account is blocked: blocking and
  reporting are often used together.
- The reporter picks one reason: harassment or hate, pretending to be someone else, spam
  or advertising, offensive or inappropriate, or something else. A list rather than a text
  field, so nothing a reporter submits is itself text the Operator has to read. Not food,
  a Bite reason, does not apply to a person.
- The dialog says that the account is not told who reported it. Nothing the reported
  account can read records the report.
- One report per account per profile. A second one from the same account is refused and
  the reporter is told they already reported it; a report the Operator has closed stays
  closed for that account too.
- The reporter is told the report was received, already sent, or not sent. A failure is
  never shown as a success.
- What happens next is the Operator's, in the reported-profiles queue: the account block
  ([#1474]) and closing the reports, per [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md).

The storage, the callable and the rules are in [User](../domain/user.md).

## Display Name Copies

Issue [#1827]. A name a person has left behind must not keep following them. For a trans
or non-binary user an old name shown to others is deadnaming, which is the [#1308] class
of harm rather than a stale label.

- **Read live.** Most surfaces read `/users/{uid}.displayName` when they render, so a
  change shows on the next read with nothing to rewrite: the profile, Bite cards, search
  (`searchUsers`), the follower and following lists (the follow edges store uids only),
  follow suggestions (`suggestPeopleToFollow` and the follow-up mail's picks resolve the
  name from the profile on every call), and a review thread, which resolves each author
  through `authorId` per [UC - Inspect Bite Details](uc-inspect-bite-details.md). Push
  notifications read the sender's name from the profile when they are sent, so one sent
  after the change carries the new name.
- **Copied, and rewritten on change.** Four places store a copy, and all of them are
  readable by every member. `syncDisplayNameCopiesOnUserUpdate` fires on an update to
  `/users/{uid}` whose `displayName` changed - whichever path wrote it - and rewrites them:
  - `meta/leaderboard`, the leaderboard, which is otherwise rebuilt only when a Bite is
    created or deleted. The new name shows without waiting for anybody to post.
  - `meta/leaderboardDaily`, the daily notification baseline.
  - `reviews.author`, the name written onto each review the person wrote.
  - `biteTrails.ownerName`, the `@name` on each of the person's Bite Trail cards.

  A leaderboard entry that is not public carries no name, and stays without one.

- **Kept as it is.** `BiteReport.authorDisplayName` records who a reported Bite was
  attributed to when it was reported. It is evidence for the Operator, no member can
  read it, and rewriting it would change the record. A profile report stores no name:
  the queue reads the reported account's current one ([#1829]).
- **Not recallable.** A push notification already delivered to a device, and a follow-up
  mail already sent, show the name they were sent with.
- **The old name is released.** Renaming deletes the old `/displayNames` claim in the same
  transaction that takes the new one, so the old name can be claimed straight away by
  anybody, the previous holder included. Holding it would not expose it, and releasing
  it is how account deletion already treats a name.

## Profile Photo Upload Contract

A new photo chosen on `Edit Profile` uploads in the background, the way a Bite photo does ([#1953]):

- `Save Changes` writes the other fields at once, marks the user document `photoStatus: pending` with `photoUploadStartedAtTimestamp`, and goes back. A write that fails keeps the user on the form with a `profile-could-not-be-saved` toast.
- The previous photo stays in `photoUrl` until the new one lands, so nobody else ever sees a missing photo. The status is shown to the owner alone, on the own avatar: the new photo blurred, with a spinner while it uploads, the retry button once it failed, or an offline mark while a retry could not work. The whole avatar retries, and the wording is read out to a screen reader rather than shown. Where the device no longer holds the new photo, the previous one is blurred instead.
- The retry button is `bt-retry-upload-button`, shared with the Bite photo status so both read as the same action: outline, with a refresh icon and the card background. The avatar uses its short label (`retry-upload-short`, "Retry"), the Bite card the full one.
- The storage finalize trigger `setUserPhotoUrlOnUpload` points `photoUrl` at the new object, writes `photoStatus: uploaded`, and deletes the older objects in `images/users/{uid}/`. The device writes the same URL itself for an immediate update; the trigger is what makes the save independent of that device staying open.
- The device writes `failed` when the transfer errors, or reports nothing for 30 seconds. A `pending` status older than 10 minutes reads as failed, as on a Bite.
- A retry sends the photo kept from this session, else the device's local copy (`users_{uid}.*`). With neither, it opens `Edit Profile` to choose the photo again. While the device reports no connection, the retry is replaced by the offline hint.
- `Edit Profile` fills its form from the profile only while the form is untouched. A new copy of the profile (the email verification sync writes one while the page is open) used to overwrite a photo the user had just picked.
- Leaving `Edit Profile` goes back inside the app. When it was the first page (a reload or a link), it opens the own profile instead, because going back would unload the app with the upload still running.

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

**[MVP]** — the user block contract and the profile report contract. `RD-UR-7` classes
user-to-user blocking and reporting a user profile as part of the user-generated-content
safeguard set.

**[Secondary]** — the social graph: follow and unfollow, the follower and following
lists, follow suggestions, and the visited-countries globe. Shipped, but the contribution loop does not depend on it
for the initial release.

## App Store Review Area

Relevant. The public/private profile is a privacy control, and the profile photo uses the
photo library — the permission itself is collected in onboarding rather than here, see
[UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md). The identity data this page renders is covered
by the name, photo and user-ID entries declared in [Implementation - Store Declarations](../implementation/store-declarations.md).
Follow suggestions add no permission and no purpose string: they use a position only
where location is already granted, so the priming rule onboarding owns is untouched, and
their three events are product interaction like the rest. The visited-countries globe
adds no permission either: it shows the country codes the profile already shows, from
outlines bundled with the app. Pronouns are user content used for app functionality
only; how they map onto each store's data declaration is in
[Implementation - Store Declarations](../implementation/store-declarations.md).

The user block contract is the blocking half of Apple's user-generated-content guideline
(1.2) and the equivalent Google Play policy, and the profile report contract is its
reporting of abusive users; see [User Roles](../product/user-roles.md) footnote 5 for the rest of the set.
Reporting adds no permission and no data declaration: a report is user content already
declared as `Other User Content` in [Implementation - Store Declarations](../implementation/store-declarations.md).

The profile visibility contract is what makes the public/private switch do what it says,
which Apple guideline 5.1.1 and Google Play's User Data policy expect of a privacy control.
It changes no declaration: the data collected and its purpose are the same.

## Supported Evidence

- `my-profile`
- `edit-profile`
- `profile/:userId`
- `followers/:userId/:type`
- `blockUser` and `unblockUser` callables.
- Profile reports: the `reportUser` callable; the Report entry and reason dialog of
  `profile-page`, and its `Blocked Account Actions Menu Open` story.
- Profile API.
- Public-user conversion.
- Visited-countries globe: `world/:userId`; `bt-globe` and its country table in
  `libs/bite-tribe-common/map/src/lib/globe` (entry point `bite-tribe-common/map/globe`);
  `WorldContainer` and `world-page` in `libs/bite-tribe/profile/page`; the
  `Components/Globe` and `Pages/World` stories.
- Platform countries globe: `bite-countries.ts` in
  `apps/bite-tribe-firebase/functions/src/functions/shared/utils`, called from
  `enrich-bite-address-on-write.ts` and `increment-bite-count-on-bite-create.ts`;
  `rebuildBiteCountriesCallable`; `biteCountries` in `AboutDataAccessService`; the
  `bt-globe` in `about-page` and its `Pages/About` `With Bite Countries` story.
- Playwright coverage for profile editing, public-profile navigation,
  follower/following lists, and follow/unfollow persistence.
- Follow suggestions: the `suggestPeopleToFollow` callable and the shared
  `suggestable-person.ts` rule in `apps/bite-tribe-firebase/functions/src/functions/users`;
  `FollowSuggestionsService` in `libs/bite-tribe/follow-suggestions/data-access`; the
  `bt-follow-suggestions` component and its stories in
  `libs/bite-tribe/follow-suggestions/ui`.
- Pronouns: `pronouns.ts` in `libs/bite-tribe-common/model`, `withPronounsWrite` in
  `libs/bite-tribe/api`, the `pronouns` control of `edit-profile-page` and the header in
  `profile-page`, the `validPronouns` rule in `firestore.rules`, and the
  `Pages/Profile` `With Pronouns` stories.
- Display name copies: the `syncDisplayNameCopiesOnUserUpdate` trigger in
  `apps/bite-tribe-firebase/functions/src/functions/users/sync-display-name-copies.ts`
  and its spec.

## Related GitHub Scope

- Issue [#1166] is the profile-loading skeleton fix - no placeholder facts (e.g. the FREE badge) render before a profile arrives.
- Issue [#1188] made the public/private visibility choice readable directly off the profile.
- Issue [#1260] moved account identity ("who am I signed in as") from the profile page into the app menu.
- Issue [#1270], together with onboarding's [#1271], is the Profile Identity Contract above.
- Issue [#1708] is `Follow Suggestions` above, motivated by the analytics check on [#914] and sharing its pick list with the follow-up mail of [#1707].
- Issue [#1609] is the User Block Contract above.
- Issue [#1829] is the Profile Report Contract above, part of epic [#1823].
- Issue [#1787] is `Visited Countries Globe` above.
- Issue [#1893] is `Platform Countries Globe` above.
- Issue [#1799] celebrates the first person a user follows, part of epic [#1741].
- Issue [#1827] is `Display Name Copies` above, part of epic [#1823].
- Issue [#1826] is `Pronouns` above, part of epic [#1823].
- Issue [#1610] is the content filter that is to cover pronouns with the display name.
- Issue [#1863] is the `Profile Visibility Contract` above, part of epic [#1823].
- Issue [#1953] is the `Profile Photo Upload Contract` above.

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
- [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md) — the Operator's block, which this is not
- [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md) — where a block goes when either account is deleted
- [User Roles](../product/user-roles.md)

[#1166]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1166
[#1188]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1188
[#1240]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1240
[#1260]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1260
[#1270]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1270
[#1271]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1271
[#1308]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1308
[#914]: https://github.com/muhammedgaygisiz/travellers-apps/issues/914
[#1609]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1609
[#1829]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1829
[#1707]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1707
[#1708]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1708
[#1787]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1787
[#1893]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1893
[#1741]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1741
[#1799]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1799
[#1823]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1823
[#1827]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1827
[#1826]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1826
[#1610]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1610
[#1863]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1863
[#1474]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1474
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1916]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1916
[#1953]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1953
