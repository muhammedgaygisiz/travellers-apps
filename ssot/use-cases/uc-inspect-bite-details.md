# UC - Inspect Bite Details

## Status

**Level:** L1
Supported today. The detail page, its share and deep-link entry, the bucket-list and
directions actions, the header photo's upload state, reporting the Bite, the AI explanation of its dish (`R-1` to `R-7`), and the ten contracts below all ship.
An author editing their own review or reply is the Review Edit Contract (issue [#721]),
deleting it is the Review Delete Contract (issue [#2116]), another member reporting it
is the Review Report Contract (issue [#2117]), and an operator hiding it is the Review
Hide Contract (issue [#2118]).

## Goal

Any account can inspect one Bite deeply enough to decide whether the dish is relevant.
This page owns the Bite detail surface: what it renders, how it answers a read that finds
nothing, and how a review and its thread are attributed.

## Actors

- **Bite Creator** — opens the Bite, shares it, saves it to a bucket list, and writes,
  answers, edits or deletes its own review on it. Marked inside a thread when it is their own Bite, and offered the
  retry when their own header photo failed to upload.

## Flow

- User opens a Bite detail page.
- The page shows the food experience in context.
- A public creator profile identifies who shared the Bite.
- Under the creator, an `Ate with` row names the people the creator tagged, each name opening that profile (issue [#1918], epic [#1915]). Two names show and the rest fold into `+N more`, which unfolds in place; it is a label followed by names rather than a sentence, so no language has to fit names into one word order. A tagged user whose profile is private or whose account is gone is left out, as is anybody the viewer blocked, and a Bite with nobody left to show renders no row, under the `Absent Field Contract` below. Which uids a Bite may carry is [Bite](../domain/bite.md)'s.
- A viewer who is tagged in the Bite is offered `Remove me` at the end of that row, and only they are. It asks for confirmation, then takes their uid off the Bite through `removeSelfFromBiteTags` and reads the Bite again. Whether the viewer is tagged is read off the Bite's ids rather than the shown names, so a tagged viewer with a private profile, who appears in no list of names, still gets the row and the action (issue [#1920]).
- The page shows the Bite's distance from the user's current position and converts its price into the user's preferred currency.
- User can share the Bite through the device share sheet, including WhatsApp when available.
  The message is the price and rating, or a fallback line, followed by the Bite's link, which
  appears once on every platform. iOS also receives the link on its own, for the sheet's link
  preview; Android receives it only inside the text, because its share plugin would append it
  a second time (issue [#1775]).
  On the user's own Bite, the share button opens a share menu instead (issue [#1726]) -
  Instagram Story, Instagram Post, Facebook Story and More… - whose More… entry is this link
  share, unchanged. On anyone else's Bite it stays this link share, until terms of use let other
  people's Bites be shared as images (issue [#1772]). The menu, the
  image composer behind its other entries and the hand-off to each app are
  [UC - Share A Bite To Social Media](uc-share-a-bite-to-social-media.md)'s (`UC-SBS` `R-1` to `R-3`).
- The Bite is the only shareable entity in BiteTribe. The share link, the
  `handleSharedLinkToBite` preview endpoint, and the native `/s/bite/*` deep-link
  registration in the iOS Associated Domains file and the Android App Links
  intent filter exist for Bites alone. Profiles, bucket lists, restaurants, and
  BiteTrails have no share action and no deep link. See [issue-1190](../history/records/issue-1190.md).
- User can open directions to the Bite's place through the platform navigation experience.
- A Bite made from a dish somebody ordered says so, and the line opens that restaurant's menu (issue [#1113]). It leads to the **menu** rather than to the dish: `restaurant/:restaurantId/menu` resolves which menu that is, and a dish that has since been deleted would otherwise be a dead address. What makes a rename or a deletion harmless is that the dish's name was copied onto the Bite when it was created and is the heading at the top of this page (`RD-TS-53`); the one thing read off the menu is the restaurant's dietary declaration for the dish, below, and a deleted dish only loses that. A Bite carrying no menu link renders no line, under the `Absent Field Contract` below.
- The Bite's dietary labels show under the description, each group under its own source line (issue [#2195]): what the creator says the dish was, and, on a Bite linked to a menu item, what the restaurant declares for that dish and its variant, read off the restaurant's current menu. Neither replaces the other, and a label both claim is shown in both. A high-risk label only the creator claims carries the fixed notice to confirm with the restaurant. A Bite with neither renders nothing, under the `Absent Field Contract` below, and a menu that cannot be read costs the restaurant's group only. The vocabulary and how a claim is shown are [UC - Find Dishes That Fit A Dietary Choice](uc-find-dishes-that-fit-a-dietary-choice.md)'s (`UC-FDC` `R-2`, `R-4`).
- User can save the Bite to an existing bucket list or create a new list for it.
- A member can have the Bite's dish explained by AI in their app language - what it is, where it comes from and its typical ingredients - through an `Explain me` button and a modal, under `R-1` to `R-7` (issue [#2106]).
- A signed-in user can report somebody else's Bite to the BiteTribe operators, choosing one of five reasons: spam or advertising, not food, offensive or inappropriate, harassment or hate, or something else ([#1608]). The action sits last on the page and is never offered on the user's own Bite. The report is filed through `reportBite`, which keeps one report per account per Bite - a second tap is answered as already reported rather than filing again - and the Bite looks exactly the same to everyone afterwards, its author included, who is never told who reported it. What an operator then does with the report is `UC - Operate BiteTribe In The Admin App`'s.
- User can understand creator/profile context, restaurant/place context, image, likes, reviews, and related data.
- While the Bite loads, the share, navigation, and bucket-list actions are
  replaced by skeleton placeholders rather than shown as tappable icons, so the
  user cannot trigger an action against a Bite that is not there yet. The
  first-visit coach marks for those actions are gated on the loaded Bite, so
  they are unaffected. This predates GitHub issue [#1166], which cites the details
  page as the model when introducing the same loading state on the profile page;
  see [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md). No issue in this page's
  references owns the behaviour itself.
- The header photo reports its upload state exactly as the feed card does: an
  uploading Bite shows the wait message (addressed to the poster, neutral for
  everyone else) and a failed or long-abandoned upload says so, instead of
  leaving an unexplained empty header. Both surfaces render the same
  `bt-bite-image-status` component so they cannot drift. See GitHub issue [#1168]
  and [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) for the status rules.

## Relative Time Contract

Issue [#1272]
made the page's ages honest. The Bite's age and every review's age render
through the same pipe, so the contract covers both:

- An age is written in the reader's language. It is formatted by
  `Intl.RelativeTimeFormat` against the active Transloco language rather than
  assembled from hardcoded English, which is what put `5 min ago` in the middle
  of an otherwise German page during release-candidate Run 5.
- The abbreviations come from CLDR, so the unit stays readable per language.
  The hand-written pair that shipped before — `min` for minutes and `m` for
  months — was a distinction no translation would have preserved.
- A single unit is shown. The composed forms the old pipe produced, such as
  `2 w 3 d ago`, have no localized equivalent and are gone; the coarser unit is
  enough to judge how fresh a Bite is.
- A timestamp ahead of now is reported as ahead, not as elapsed. Clock skew and
  a bad write both produce one, and rendering it as an age presented a wrong
  reading as a confident one.
- A Bite or review without a timestamp renders nothing. The pipe used to
  default its argument to a hardcoded May 2025 constant, so an absent
  `createdAt` was reported as a real age measured from an arbitrary date —
  missing data shown to the user as data. Anything unparsable renders nothing
  for the same reason.

## Absent Field Contract

The details page renders a Bite whose optional fields are frequently empty, and
the same rule governs all of them: a field with no value contributes nothing —
no placeholder, no separator, no heading of its own. The page is shorter, not
apologetic.

- The place and distance share one line joined by a `·`. The separator belongs
  to the join, so it appears only when both sides do. The distance itself needs
  both ends — the reader's position and the Bite's own — and renders nothing
  when either is missing, rather than falling back to `toMetric`'s `-`. Before
  this, a page that had not loaded a Bite at all still rendered `· -`,
  underneath the skeleton that was correctly saying nothing was there yet.
- The read-only tag list is left out entirely for a Bite with no tags, heading
  included. A "Tags" heading over an empty row announces an absent optional
  field as though something had failed to load, and read-only there is nothing
  the reader could add. The gate sits on the page rather than inside the shared
  `bt-tags-input`, so the component still renders its heading for every caller:
  the condition is a Bite having tags, which is knowledge the page has and the
  component does not.
- This is the same judgement as the profile's dropped "no location"
  placeholder in [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) and the empty string
  an absent timestamp renders above: BiteTribe does not fill a gap with a
  message about the gap.

## Shared Link Entry Contract

Issue [#1246]
made the recipient of a shared Bite link arrive at that Bite:

- A shared link is opened cold — a new tab, a message, a browser that has never
  run the app in this session. The recipient must end on the Bite. Ending on
  Home or the welcome page is a failure, not a fallback.
- A cold load runs the route guards before the persisted Firebase session has
  been read back, so a signed-in visitor first looks signed out. Nothing decides
  who the visitor is until auth has reported an answer, and that wait is on the
  restoration itself rather than on a fixed delay that can expire early.
- Guards on one route run alongside each other, not in sequence, so the
  onboarding entry gate sees the same unrestored state and waits for the same
  answer. A gate that reads "no user" from a session still loading would send a
  returning user into the assistant and drop the Bite on the way.
- A visitor who really is signed out is sent to sign in, and the requested URL
  is remembered rather than discarded. Signing in, registering, or completing
  first-run onboarding returns them to the Bite they were sent.
- The welcome page and the onboarding gate hand a remembered URL back instead of
  resolving to Home, so a target survives every redirect the entry chain makes.
- A remembered URL lives for the current page only. Reloading or closing the tab
  before signing in abandons it; a target resurfacing in a later session would
  be the more surprising outcome.
- This shares its shape with the tapped-notification contract in
  [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md): a target requested
  while the app is still starting, against startup navigation that resolves the
  address a returning user is sent to.

## Unresolvable Bite Contract

Issue [#1232]
gave the page an answer for every way its read can end. It is reachable with a
Bite that cannot be resolved from the local gallery, the home feed, a shared
link, and a tapped notification alike, so the page owns this rather than each
entry point.

- The page never waits forever. Once the read has settled, exactly one of three
  things is true: a Bite is shown, the Bite is reported as gone, or the read is
  reported as failed. A loading skeleton means a read still in flight and
  nothing else.
- A Bite that no longer exists is answered by a blocking alert that cannot be
  dismissed by the backdrop and offers only the way back. Firestore answers a
  read for a deleted document with a successful but empty snapshot, so "the read
  finished and there is no Bite" is the condition, not one particular error.
- A read that failed for its own reasons — a timeout from the retry wrapper, a
  rejected permission, an App Check refusal — says nothing about whether the
  Bite exists, so it is reported separately and offers the read again next to
  the way back.
- A route without a `biteId` is not a failure. Nothing has been asked for, and
  the page stays in its loading state rather than claiming a Bite is missing.
- A failure raised while a report is already in flight is remembered rather than
  dropped. This page is reached cold - a tapped notification, a shared link - so
  its read can give up, recover and give up again inside one report, and the
  single-flight guard that keeps alerts from stacking used to swallow the second
  failure entirely. The page then showed no alert at all and kept its skeletons
  running, which is the silence this issue exists to end. What finally reaches
  the screen is the branch the read settled on, not the one that was dropped.
- The alert waits for the active language before it is written. It translates
  synchronously, so a failure reported before the language file has arrived -
  which a cold start makes likely - would put raw keys on screen, the defect
  issue [#1186] fixed elsewhere. Storybook proved it: the first captures of the
  failure stories rendered `bite-not-found` and `go-back` verbatim.
- Every settled read that produced no Bite files a Crashlytics non-fatal
  carrying the Bite id, the branch taken, and where the navigation came from.
  A user who is shown a message cannot report a timeout usefully, and the
  branches are indistinguishable from the outside.
- The Bite is never read straight off the resource in a template.
  `ResourceRef.value()` throws once the read has failed, which aborted the whole
  binding update and left the page unable to report the very failure it had
  detected. Reads go through a guarded accessor instead.

## Review Thread Contract

Issue [#1283]
turns the review compartment from a flat list into a thread list. Implemented by
`ReviewThreadComponent` and the `reviewThreads` selector.

- A root review opens a conversation. Replying to it is an action on that review,
  not a second review of the Bite, which is what writing back means today.
- Threads are one level deep. Answering a reply attaches to the same root thread
  with an `@name` prefill, so a conversation cannot fan out into a tree that a
  phone screen has to indent.
- Any authenticated user who can see the Bite may reply, not only the Bite
  creator. Reviews are open to everyone, so the conversation about them is too;
  restricting replies to the creator would leave a reviewer unable to answer the
  creator's own follow-up question.
- The composer at the foot of the compartment keeps meaning "start a new
  thread". The rule that a new root review is a new conversation is visible in
  the layout, not only in who gets notified.
- The Bite creator is marked inside a thread, so an answer from the person who
  posted the dish is distinguishable from another diner's.
- A thread with more than two replies renders collapsed behind a count that
  expands in place, because a Bite with a busy compartment is otherwise unusable
  on a phone.
- Review order becomes deterministic: root threads newest first, replies oldest
  first inside their thread. The current read has no `orderBy` at all, which is
  survivable for a flat list and not for threads.
- Arriving from a tapped reply notification opens the Bite with that thread
  already expanded and highlighted. See
  [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) for the fan-out.
- Editing a review or reply is the Review Edit Contract below, deleting one the
  Review Delete Contract, reporting one the Review Report Contract, and how a hidden one
  reads the Review Hide Contract.

## Review Attribution Contract

Issue [#1308]
stopped reviews publishing the author's real name. It is the same two-names
confusion as the Profile Identity Contract in
[UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md), on a surface that publishes rather
than displays.

- A review and every reply in its thread are attributed to the author's
  BiteTribe display name. The name the identity provider knows the person by is
  never rendered to another user.
- The display name is read from the user document, never from the Firebase Auth
  user. `AuthService.getUser()` returns the provider's account, whose
  `displayName` is populated by the Google or Apple sign-in and holds a legal
  name. The two coincide on an email and password account, which is why five
  release-candidate runs missed this and why a test has to use an account where
  they differ.
- The name is resolved through `authorId` when the compartment is read, not
  taken from the `author` string stored on the review. Every review written
  before this carries a name copied from the provider, and correcting the write
  path does not correct a denormalised field, so re-reading is what repairs the
  reviews that already exist. It also makes a display-name change show up on
  everything the person wrote before it.
- One profile is read per distinct author, not per review, so a thread in which
  one person wrote ten messages costs one document read.
- `author` is still written, so a reader has an attribution before the join
  resolves, but it is now written from the profile, by `saveReview`. An account with no readable
  profile writes an empty name rather than falling back to the provider's — the
  provider's name never reaches a review document. A later display-name change
  rewrites it on every review the person wrote, per `Display Name Copies` in
  [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md).
- A review whose author cannot be resolved keeps its stored name. Those are the
  ones written before `authorId` was carried and the ones whose account is gone;
  blanking them would remove the only attribution they have. The existing data
  is small enough that no backfill was written for it.

## Review Edit Contract

Issue [#721] lets the author of a review or reply change its text, from the thread
it sits in. Implemented by `ReviewThreadComponent`, `ReviewApiService.updateReview`
and the `editReview` callable.

- The signed-in author sees an Edit action on each root review and reply they wrote,
  and on nothing anybody else wrote - the Bite's creator included. A review that
  carries no `authorId` offers it to nobody, because the app cannot tell who wrote it.
- Edit swaps the text for an editor holding it, with Cancel and Save. One editor is
  open at a time in a thread, and opening it closes an open reply composer, and the
  other way round. Empty or whitespace-only text cannot be saved, and saving unchanged
  text writes nothing.
- A saved edit replaces `review` and sets `updatedAt` and `updatedAtTimestamp`, and
  nothing else. `editReview` writes only those, refuses blank text and an edit by
  anybody but the author, and the rules refuse every client update but an operator's,
  so an edit cannot move a review to another Bite or thread, re-address what it
  answers, or hand it to another account. `author` is still rewritten by
  `syncDisplayNameCopies` through the Admin SDK.
- An edited item shows an "edited" mark next to its age. The age, the position in the
  thread and the replies hanging off it stay the original's, because ordering reads
  `createdAtTimestamp`. There is no edit window and no edit history: the mark exists
  because an edit made after somebody answered is the risk, not a late one, and it says
  that the text changed, not what changed.
- An edit notifies nobody. Both review notifications are creation triggers.
- A failed save says so in a toast and leaves the original text on screen.

## Review Delete Contract

Issue [#2116] lets the author of a review or reply withdraw it, from the thread it sits
in, without taking anybody else's reply down with it. Implemented by
`ReviewThreadComponent`, `DetailsPage.confirmDeleteReview`, `ReviewApiService.deleteReview`
and the `deleteReview` callable.

- Delete is offered on exactly the items Edit is: the signed-in author's own, never one
  without `authorId`, and not to the Bite's creator on somebody else's. It asks first, in
  a destructive alert that names a review or a reply.
- **An item nobody answered is deleted.** Its document is gone and the thread closes up
  around it.
- **An item somebody answered becomes a tombstone**, because the replies are not the
  author's to remove. The document stays, with `review`, `author`, `authorId` and the
  `updatedAt` fields removed and `deletedAt` and `deletedAtTimestamp` set; `biteId`,
  `parentReviewId`, `threadId` and the created timestamps stay, so it keeps its place and
  the replies under it keep their parent. It renders as one muted line - "This review was
  deleted" or "This reply was deleted" - with no name, no age and no action.
- **A tombstone holds replies up and takes no more.** `saveReview` refuses a reply to it
  and `editReview` refuses to edit it. When the last reply under a tombstone is deleted,
  the tombstone is deleted too, and so on up the parent chain.
- **Only the callable deletes.** The rules refuse an author's client delete, because only
  the backend can see whether anybody answered. An operator's delete is unaffected.
- A delete notifies nobody. A tombstone carries no `authorId`, so its former author is not
  among the participants a later reply notifies.
- **A hidden item is deleted the same way** (Review Hide Contract): its author is offered
  Delete on it, and `deleteReview` removes its kept copy in `/hiddenReviews` with it,
  whether the item is deleted or becomes a tombstone.
- A failed delete says so in a toast and leaves the item on screen.
- Deleting the account follows the same rule, per the `Deletion Contract` in
  [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md).

## Review Report Contract

Issue [#2117] lets a member report a review or reply they should not have had to read, so
abusive text in a thread reaches an operator. Implemented by `ReviewThreadComponent`,
`DetailsPage.confirmReportReview`, `ReviewApiService.reportReview` and the `reportReview`
callable.

- **Report is offered on every item the signed-in member did not write**, reviews and
  replies alike, and on nothing else: never on their own item, never on a tombstone, and
  never to a signed-out reader or a table guest. It sits last among the item's actions.
- **The reporter chooses a reason** from a fixed list: harassment or bullying, hate speech,
  spam or advertising, offensive or inappropriate, or something else. The alert names a
  review or a reply and says that nobody in the thread is told who reported it.
- **One report per account per item.** `reportReview` writes
  `/reviewReports/{reviewId}_{reporterUid}` with a `create`, so a second report from the
  same account, open or already dismissed, is answered as already reported and writes
  nothing. The answer is a toast either way, and a failure says the report was not sent.
- **`reportReview` refuses** an item that does not exist, one the caller wrote, a
  tombstone, a hidden item, a signed-out caller and a table guest.
- **The report records** the item, its Bite, its thread, its author, the reporter, the
  reason, an `open` status and the time. Only an operator can read it, and no client can
  write it.
- **A report is silent.** Nothing on the item changes, nobody is notified - the reported
  author included - and the log line names the item and the reason but not the reporter.
  In a thread of three people, a notified author would know who reported them.
- **A report lives as long as the item and the two accounts.** Deleting the item deletes
  its reports, through `deleteReviewReportsOnReviewDelete`. Deleting an account deletes the
  reports it filed and the ones filed against its items, per
  [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md).
- What an operator does with a report is the reported-reviews queue in
  [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md).

## Review Hide Contract

Issue [#2118] lets an operator take a reported review or reply out of its thread without
taking the replies around it down. The operator's side is the reported-reviews queue in
[UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md); this
contract is how a hidden item reads on the Bite. Implemented by the `hideReviewAsOperator`
callable, `loadReviewsByBiteId` and `ReviewThreadComponent`.

- **The text leaves the public document.** `/reviews` is readable by every member, so a
  flag the app filters on would still let anybody read it. `hideReviewAsOperator` moves
  `review` and `author` to `/hiddenReviews/{reviewId}`, with the operator, the reason and
  the time, removes them and the `updatedAt` fields from the review, and sets `hiddenAt`
  and `hiddenAtTimestamp`. `authorId`, `biteId`, `parentReviewId`, `threadId` and the
  created timestamps stay, so the item keeps its place and its replies keep their parent.
- **To every reader but its author it is one muted line** - "This review was hidden by
  BiteTribe" or "This reply was hidden by BiteTribe" - with no text, no name, no age and
  no action, in the place the item had. Its replies stay attached and in order.
- **Its author sees it marked.** For a hidden item the signed-in reader wrote, the loader
  also reads `/hiddenReviews/{reviewId}`, and the thread shows the original text under a
  "Hidden - only you can see this" marker, with Delete as the only action. An author whose
  item just disappeared could not tell moderation from a bug, and would post it again.
  Nobody else's hidden text is read, and the rules refuse it to anybody but an operator and
  the author.
- **A hidden item takes nothing new.** `saveReview` refuses a reply to it, `editReview` an
  edit, and `reportReview` a report. Its author may delete it under the Review Delete
  Contract.
- **It is kept, not deleted**, so an operator's decision can be reviewed later. The copy
  goes when the item goes: with the review document, through
  `deleteHiddenReviewOnReviewDelete` (a delete by its author, its Bite's deletion, an empty
  tombstone pruned, the console); with a tombstone, through `deleteReview`; and with the
  author's account, per the `Deletion Contract` in
  [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md). Un-hiding is not
  built.
- **Hiding notifies nobody**, the author included; the marker is the only signal. An
  account whose only items in a thread are hidden or deleted is not among the participants
  a later reply notifies, and a new review hidden before its notification is sent sends
  none. See [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md).
- A reply notification tapped after its item was hidden opens the Bite and its thread as
  any other, with the hidden line where the item was.
- A display-name change does not put a name back on a hidden item: `syncDisplayNameCopies`
  skips it.

## Review Content Check

Issue [#1610]: a review or reply is checked before any other account can read it, by
the content check in [Architecture - AI](../architecture/ai.md).

- **Every write goes through a callable.** A new review and a reply through
  `saveReview`, an edit through `editReview`; the rules refuse a client creating a
  review. The callable checks the text, writes it with the author's display name and
  the timestamps, and answers `saved` or `refused`.
- **A refusal writes nothing.** The page shows a toast that the text goes against the
  community guidelines; a refused edit leaves the original text on screen, as any failed
  edit does. A review or reply that fails for another reason says it was not posted.
- **The composer is cleared on send**, so the text of a refused new review or reply is
  not kept for rewording.
- A refused review notifies nobody: both review notifications are creation triggers,
  and nothing is created.

## Rules And Invariants

The dish explanation of issue [#2106]. The call, the model and the daily allowance follow
[Architecture - AI](../architecture/ai.md).

| Id      | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1** | `Explain me` is offered to a signed-in member on every Bite, their own included, once the Bite has loaded and its photo is uploaded. It is not offered to an anonymous table guest or while the photo is pending or failed, and `explainBite` refuses all three, and any call without App Check.                                                                                                                                                          |
| **R-2** | The explanation is in the viewer's active Transloco language, English for any language the app does not ship. It has three parts - what the dish is, where it comes from, and its typical ingredients as usually made rather than on this plate - under the title "Explained by AI" and a fixed, translated disclaimer that it may be inaccurate and that allergens are a question for the restaurant. It never states an allergen or a dietary property. |
| **R-3** | The model is given the Bite's name, its place, city and country, and its uploaded photo. The creator's description and tags are never sent: the answer is shown to every later reader, so one user's free text must not steer it.                                                                                                                                                                                                                         |
| **R-4** | One explanation is kept per Bite and language, in the server-only `biteExplanations/{biteId}_{language}`, which no client can read or write. It is reused while the Bite's name is the one it was written for; a renamed Bite gets a new one on its next open. Deleting the Bite deletes its explanations.                                                                                                                                                |
| **R-5** | A dish the model cannot identify is answered as unknown, said so in the modal, and kept like an explanation, so it is not asked again.                                                                                                                                                                                                                                                                                                                    |
| **R-6** | A kept explanation costs nothing and is never limited. Only a new one is counted, at 20 per member per UTC day, and a call that produced nothing gives its count back. At the limit the modal says today's explanations are used up; kept ones still open. A failed call, a network error or no connection shows an error with a retry.                                                                                                                   |
| **R-7** | Every settled open sends `bite_explanation_requested` with `result` (`cached`, `generated`, `unknown`, `limit_reached`, `error`) and `language`.                                                                                                                                                                                                                                                                                                          |

## MVP Classification

**[MVP]** — the whole page: everything it renders, every way its read can end, and the
review threads. Attribution is release-critical rather than polish — [#1308] was accepted
as a release blocker because reviews published the name the identity provider holds.

The Review Edit Contract is **[Secondary]**: it came after launch, and a review that
cannot be corrected is an annoyance rather than a broken page. The Review Delete Contract
is **[Secondary]** for the same reason.

The Review Report Contract and the Review Hide Contract are **[MVP]**: they are the
review-thread part of the user-generated-content safeguards `RD-UR-7` classes `[MVP]`.

## App Store Review Area

Relevant on three counts. The `/s/bite/*` deep link is registered in the iOS Associated
Domains entitlement and an Android App Links intent filter, so it is part of the shipped
build's configuration — see [issue-1190](../history/records/issue-1190.md). And review attribution is a privacy matter
rather than a cosmetic one: [#1308] published the name the identity provider holds. The
dish explanation (`R-1` to `R-7`) is AI-generated content: the modal labels it as AI and carries a
disclaimer, and the privacy policy names Gemini; no store declaration changes, because only public
Bite content is sent (issue [#2106]). Editing a review (issue [#721]) is a second way to
publish user-generated text under Guideline 1.2; it adds no permission or declaration, and
an edited review can be reported and blocked like any other. Deleting one (issue [#2116])
adds no permission or declaration either. Reporting a review or reply (issue [#2117]) is
the reporting mechanism Guideline 1.2 requires, for review threads; it adds no permission,
no declaration and no store listing change. Hiding one (issue [#2118]) is the timely action
on reported content the same guideline asks for; `/hiddenReviews` holds text the app
already held, so no data type or declaration changes. The Review Content Check is
the filtering Guideline 1.2 names, for this page's text (issue [#1610]). The
data types this page renders are declared in [Implementation - Store Declarations](../implementation/store-declarations.md).

## Supported Evidence

- `bite/:biteId`
- Bite details page and data-access.
- Like API.
- Review API, including `saveReply`, `updateReview`, `deleteReview` and the display-name
  resolution in `loadReviewsByBiteId` and `loadDisplayNamesById`.
- The `saveReview` and `editReview` callables in
  `apps/bite-tribe-firebase/functions/src/functions/reviews/save-review.ts`, the
  `deleteReview` callable and `removeReviewsByAuthor` in `delete-review.ts` next to it,
  and the `/reviews` rules, with the cases refusing a client write and an author's
  client delete in `firestore-rules.emulator-spec.ts`.
- `ReviewThreadComponent` in `libs/bite-tribe/details/page`, with Storybook
  states for a bare root, an open thread, a folded one, the notification
  highlight, the creator badge, the read-only view, the author's own review, the open
  editor, an edited root review and reply, a deleted root and reply still holding up
  replies, and a hidden root, a hidden reply and a hidden item seen by its own author.
- `hideReviewAsOperator` in `review-reports-as-operator.ts`, `hidden-review.ts` and
  `deleteHiddenReviewOnReviewDelete` next to it, with `hide-review.spec.ts`, and the
  `/hiddenReviews` allow and deny cases in `firestore-rules.emulator-spec.ts`.
- `toReviewThreads` in `libs/bite-tribe/store`, which owns the grouping and the
  ordering.
- The AI dish explanation (`R-1` to `R-7`): `explainBite` and
  `deleteBiteExplanationsOnBiteDelete` in
  `apps/bite-tribe-firebase/functions/src/functions/bites/`, with their unit spec
  `explain-bite.spec.ts` and the server-only refusals in
  `firestore-rules.emulator-spec.ts`; `BiteExplanationComponent` with a Storybook
  state per answer, `DetailsService.explainBite` and
  `BiteExplanationDataAccessService`. See [Architecture - AI](../architecture/ai.md).
- Playwright E2E coverage of the review thread:
  `apps/bite-tribe-e2e/src/tests/review-threads.spec.ts` answers a review as an
  account that owns neither the Bite nor the review, answers that answer and
  checks it stayed in the same thread with an `@name` prefill and no second
  indent, marks the creator, asserts thread and reply order against seeded
  timestamps, folds and unfolds a thread of three replies, and opens
  `/bite/:biteId?threadId=` expanded and highlighted.
- Playwright E2E coverage of the failed header photo: the reported state, the
  photo that is withheld rather than shown, and the poster's retry falling back
  to the local photo picker when this device holds no copy.
- Playwright E2E coverage of the cold shared-link entry:
  `apps/bite-tribe-e2e/src/tests/shared-bite-deep-link.spec.ts` opens
  `/bite/:biteId` as a fresh page load, signed in and signed out.

## Related GitHub Scope

- Issue [#1272] is the Relative Time Contract above - localized, single-unit, honest ages for the Bite and its reviews.
- Issue [#1246] is the Shared Link Entry Contract above - a cold shared-link visitor always lands on the Bite, signed in or not.
- Issue [#1232] is the Unresolvable Bite Contract above - one settled answer (shown, gone, or failed) for every way this page's read can end.
- Issue [#1186] fixed the raw-translation-keys defect the Unresolvable Bite Contract's alert now avoids by waiting for the active language.
- Issue [#1283] is the Review Thread Contract above - the flat review list became `ReviewThreadComponent`'s one-level-deep threads.
- Issue [#721] is the Review Edit Contract above - an author edits the text of their own review or reply, part of epic-1284.
- Issue [#2116] is the Review Delete Contract above - an author withdraws their own review or reply, and one somebody answered stays as a tombstone, part of epic-1284.
- Issue [#2117] is the Review Report Contract above - a member reports somebody else's review or reply to the operators, part of epic-1284.
- Issue [#2118] is the Review Hide Contract above - an operator hides a reported review or reply from its thread, keeping its text for operators and its author, part of epic-1284.
- Issue [#1610] is the Review Content Check above.
- Issue [#1308] is the Review Attribution Contract above - reviews now publish the BiteTribe display name rather than the identity provider's real name; accepted as a release blocker.
- Issue [#1168] is the header photo's upload-status reporting, sharing `bt-bite-image-status` with the feed card.
- Issue [#1608] is reporting a Bite to the operators, one of the user-generated-content safeguards `RD-UR-7` requires.
- Issue [#1918] is the `Ate with` row, part of epic [#1915].
- Issue [#2106] is the AI dish explanation, `R-1` to `R-7`.
- Issue [#1920] is `Remove me` on that row - the user-generated-content control that lets a user leave somebody else's Bite.
- Issue [#2195] shows the creator's dietary labels and the restaurant's for a linked dish, part of epic [#2193].

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)
- [Restaurant](../domain/restaurant.md)

## Related Pages

- [Personas](../product/personas.md) — the audiences this page serves: Food lover, Traveler, Bite creator
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) — the upload-status rules the header reuses
- [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) — the same two-names confusion, on a surface
  that displays rather than publishes
- [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) — the tapped-notification
  entry that lands on a highlighted thread
- [UC - Share A Bite To Social Media](uc-share-a-bite-to-social-media.md) — the share menu and the image
  share the share button leads to
- [epic-1284](../history/records/epic-1284.md)
- [issue-1190](../history/records/issue-1190.md)
- [Implementation - Store Declarations](../implementation/store-declarations.md)

[#1166]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1166
[#1168]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1168
[#1186]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1186
[#1232]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1232
[#1246]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1246
[#1272]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1272
[#1283]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1283
[#1308]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1308
[#721]: https://github.com/muhammedgaygisiz/travellers-apps/issues/721
[#1113]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1113
[#1608]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1608
[#1726]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1726
[#1772]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1772
[#1775]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1775
[#1915]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1915
[#1918]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1918
[#1920]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1920
[#2106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2106
[#1610]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1610
[#2116]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2116
[#2117]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2117
[#2118]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2118
[#2193]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2193
[#2195]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2195
