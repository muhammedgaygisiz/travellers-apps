# UC - Manage Profile And Social Graph

## Status

Supported today.

## Goal

Users can maintain their identity and use profile/social context to build trust around food experiences.

## Actors

- User
- Bite creator
- Food lover

## Current Flow

- User views or edits their own profile.
- User opens public profiles.
- User follows or unfollows other users.
- User inspects followers and following.
- Profile identity is used in search and Bite trust context.
- Profile Bites are always listed newest first. The profile is a timeline of what
  a user cooked or ate, so it ignores the distance sorting and the my-bites
  filters. See [[issue-1118]].
- While a profile loads, the page shows a skeleton in the shape of the loaded
  profile instead of the field fallbacks. Placeholder values such as the FREE
  badge must never be shown for a profile that has not arrived yet, because the
  user reads them as facts about that person. The "profile not available"
  message stays reserved for a profile that finished loading without data. See
  GitHub issue #1166. The "no location" placeholder this rule also named is
  gone; see the identity contract below.
- The signed-in user's own personal profile states whether it is public or
  private and leads from there to the visibility switch in profile edit. Saved
  visibility is a privacy fact the user must be able to read off the profile
  itself rather than confirm by opening the edit form. A profile with no saved
  choice reads as private. Organisation profiles carry no status because they
  have no visibility switch. See GitHub issue #1188.

## Profile Identity Contract

Issue [#1270](https://github.com/muhammedgaygisiz/travellers-apps/issues/1270)
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
  announced missing data for something the app never asked the user for, which
  reads as a fact about that person rather than as an unfilled optional field.
  With neither a distinct real name nor a city the line is not rendered at all.
- Onboarding collecting no home location is the product half of this and is
  tracked separately in issue #1271. This contract covers only what the profile
  renders for a location it does not have.

## Account Identity In The Menu

Issue
[#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) moved
the answer to "who am I signed in as" out of the profile page and into the app
menu. Release-candidate Run 5 could not name the account it was testing with
without leaving the menu, and #1240 already established that the app should name
the account before consequential actions; knowing who you are is the same
question asked earlier.

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
  [[issue-1190]] and [[UC - Inspect Bite Details]].

## Supported Evidence

- `my-profile`
- `edit-profile`
- `profile/:userId`
- `followers/:userId/:type`
- Profile API.
- Public-user conversion.
- Playwright coverage for profile editing, public-profile navigation,
  follower/following lists, and follow/unfollow persistence.

## Related Domains

- [[User]]
- [[Bite]]
