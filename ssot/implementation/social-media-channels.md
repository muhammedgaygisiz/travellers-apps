# Implementation - Social Media Channels

## Purpose

This page owns the BiteTribe social handle, the account inventory across every
platform, and the profile copy each one carries.

[[Implementation - Store Listing Assets]] owns the approved product copy and the
name spelling. [[Implementation - Web Search And Social Metadata]] owns what the
web app tells crawlers and unfurlers. This page owns the accounts themselves, and
it is the reason `twitter:site` in `apps/bite-tribe/src/index.html` has a value
to point at.

Added 1 September 2026 for
[issue #1455](https://github.com/muhammedgaygisiz/travellers-apps/issues/1455),
which is a prerequisite for
[#913](https://github.com/muhammedgaygisiz/travellers-apps/issues/913), the
public launch campaign. That campaign lists Instagram, Reddit, LinkedIn and
travel communities in its scope, and none of the channels existed.

## The Handle

**`bitetribeapp` is the handle, everywhere. Decided 1 September 2026.**

Not `bitetribe`. That is the point of the decision, and the reason it was taken
as a decision rather than assumed.

`bitetribeapp` was chosen over `getbitetribe`, `bitetribehq` and `bitetribe_app`,
all of which were equally available on the day:

- It is the wordmark plus the one word that disambiguates it, so it stays
  readable as _BiteTribe app_ when said aloud.
- No separator. Instagram and TikTok both normalise `_` and `.` inconsistently in
  in-app search, and an underscore is a mistyped character on a phone keyboard.
- `get-` is a SaaS download convention. It reads as a call to install, which is
  the wrong verb for an account someone is meant to follow.
- `-hq` positions the account as the company talking about itself. That suits a
  B2B tool, not a dish-first consumer feed.

Twelve characters, so it also fits X's fifteen-character limit with room to
spare.

## The @bitetribe Conflict

**`@bitetribe` on Instagram is not us, and never will be.** Write this down once
so the campaign does not rediscover it as a surprise.

It belongs to a Manchester food business - bagels and Thai food - with 3,645
followers as of 1 September 2026, bio _"Dive into the heart of culinary joy, one
bite at a time!"_. On that date it was the **second Google result** for the query
`bitetribe`, above our own site.

Three consequences that are true today and get worse the more the name is
promoted:

- Anyone searching Instagram for us finds them first.
- Any campaign that says "find us on Instagram" without the handle sends traffic
  to them.
- They write themselves **Bite Tribe**, with a space. Our own rule in
  [[Implementation - Store Listing Assets]] is that the product is **BiteTribe**,
  one word, in prose. Following our own rule is therefore also the thing that
  distinguishes the two accounts at a glance. Do not let the spaced form creep
  into a profile display name.

`bitetribe` is separately taken on **TikTok** (a dormant account, 26 followers,
no bio, no posts) and on **YouTube**. It is free on X, Pinterest and Bluesky, and
we are deliberately not taking it there: one handle everywhere is worth more than
a prettier handle on the three platforms that happen to still have it. A brand
that is `@bitetribeapp` on Instagram and `@bitetribe` on X is a brand nobody can
guess.

## Availability, Verified 1 September 2026

`bitetribeapp` was clear on every platform that can be checked without an
account:

| Platform  | Handle          | Checked how                                             |
| --------- | --------------- | ------------------------------------------------------- |
| Instagram | `@bitetribeapp` | Profile page returns _Profile isn't available_          |
| TikTok    | `@bitetribeapp` | Profile page returns _Couldn't find this account_       |
| X         | `@bitetribeapp` | `api.x.com/i/users/username_available.json` → available |
| YouTube   | `@bitetribeapp` | `youtube.com/@bitetribeapp` → `404`                     |
| Pinterest | `/bitetribeapp` | Profile HTML carries no embedded user JSON              |
| Threads   | `@bitetribeapp` | Inherited from Instagram, see below                     |
| Bluesky   | `bitetribe.app` | `resolveHandle` → unresolved                            |
| Facebook  | `/bitetribeapp` | **Not verifiable logged out** - confirm at signup       |

Two of those rows carry real caveats:

- **Facebook** shows the identical _This content isn't available at the moment_
  wall for a real page and a nonexistent one when signed out. It is the one
  platform where availability is only known at the moment of registration.
- **Threads** has no separate handle namespace. A Threads account is created from
  an Instagram account and takes that account's username. Registering Instagram
  therefore settles Threads, and the correct order is Instagram first.

Availability decays. Re-check before registering if this has sat for more than a
few days.

### Bluesky Takes The Domain

Bluesky handles are domain names, and we own `bitetribe.app`. The handle there is
**`@bitetribe.app`**, set by publishing a `_atproto` DNS TXT record or serving
`/.well-known/atproto-did`, not `bitetribeapp.bsky.social`. It is free, it is
self-verifying, and it is the one platform where we get the clean name.

Registering `bitetribeapp.bsky.social` first and moving to the domain afterwards
is the low-risk order, because the domain handle can be changed later and the
fallback cannot be lost. Done that way on 2 September 2026.

**The HTTPS verification method does not work for us.** Bluesky can verify a
domain by fetching `/.well-known/atproto-did` as plain text, but
`https://bitetribe.app/.well-known/atproto-did` returns `200` with
`text/html` - it is the SPA's `index.html`, served by the catch-all rewrite. A
crawler asking for a DID gets the whole app. Making it work would need a hosting
rewrite exception; **use DNS instead.**

The account's DID is `did:plc:2s4ah3tthzk6f35bsbrzzgqg`, so the record is:

| Field | Value                                  |
| ----- | -------------------------------------- |
| Type  | `TXT`                                  |
| Name  | `_atproto.bitetribe.app`               |
| Value | `did=did:plc:2s4ah3tthzk6f35bsbrzzgqg` |

DNS is Cloudflare, where the name is entered as bare `_atproto` and the zone is
appended automatically. Added 2 September 2026 as record 15 of the zone; purely
additive, so the `A`, `CNAME` and `MX` records were untouched. It resolved on
Cloudflare and Google DNS immediately, and Bluesky verified it on the first
attempt.

**The handle is now `@bitetribe.app`.** `@bitetribeapp.bsky.social` stays
reserved to the same account and can be switched back to at any time, so nothing
was given up by moving.

Bluesky has **no website field**; the link lives in the description and is
auto-linked. That is why its bio carries `bitetribe.app` as a third line, which no
other platform's does. 256 characters, so the full copy fits untrimmed.

## Account Inventory

All accounts register under **`social@bitetribe.app`**, a role mailbox created
2 September 2026 for exactly this. Not a personal address: eight brand accounts
on someone's personal identity is eight accounts to unpick at handover, and the
recovery mail belongs to the project.

This table is the checklist, and it is updated as each handle is taken.

| Platform  | Handle           | Intent  | Status                                        |
| --------- | ---------------- | ------- | --------------------------------------------- |
| Instagram | `@bitetribeapp`  | Primary | **Registered 2 Sep 2026**                     |
| TikTok    | `@bitetribeapp`  | Primary | **Registered 2 Sep 2026**                     |
| Pinterest | `/bitetribeapp`  | Active  | **Registered 2 Sep 2026**                     |
| Threads   | `@bitetribeapp`  | Reserve | **Registered 2 Sep 2026**                     |
| X         | `@bitetribeapp`  | Reserve | **Registered 2 Sep 2026**                     |
| Facebook  | `/bitetribeapp`  | Reserve | **Registered 2 Sep 2026**                     |
| YouTube   | `@bitetribeapp`  | Reserve | **Registered 2 Sep 2026**                     |
| Bluesky   | `@bitetribe.app` | Reserve | **Registered 2 Sep 2026**, domain handle live |

**Reserve** means the handle is held so nobody else can take it. Registration is
cheap; a name conflict discovered mid-campaign is not, as `@bitetribe` on
Instagram already demonstrates.

**Reddit is deliberately absent.** You do not set up a Reddit channel, you
participate in existing communities, and a brand account posting into `r/food` or
a city subreddit reads as spam and gets removed. That is outreach and belongs to
[#913](https://github.com/muhammedgaygisiz/travellers-apps/issues/913).

## Profile Content

The same on every platform, so the accounts read as one brand. All of it is
existing approved copy from [[Implementation - Store Listing Assets]]; none of it
is new marketing writing.

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| Display name | `BiteTribe`                           |
| Website      | `https://bitetribe.app`               |
| Category     | Food & Drink, where the platform asks |
| Avatar       | `ssot/assets/social/avatar.png`       |

**Leave the link title blank** where a platform offers one, as Instagram and
Threads both do. YouTube requires one, so it gets `bitetribe.app` as the title -
which displays the domain, achieving the same thing the blank convention does
elsewhere. Empty means the profile renders `bitetribe.app`, which already
reads as the product name plus the word app. A title replaces that, and every
candidate is worse: `BiteTribe` is the third repetition of the word in a
four-line profile, and a call to action hides the domain we want remembered.

**Display name is `BiteTribe`, one word.** This is the name spelling rule in
[[Implementation - Store Listing Assets]] applied to a new surface, and here it
does double duty as the thing that tells us apart from `Bite Tribe` on Instagram.
The spaced form is correct in exactly two places, and neither of them is a social
profile.

Bio, in three lines, because the platforms disagree about how much room to give
you:

```text
Find it. Try it. Share it.
Every pin on the map is one real dish, photographed by the person who ate it, with the price they paid and what they honestly thought.
```

That sentence is 133 characters, which fits Instagram's 150 and Pinterest's 160.
Where the limit is tighter, keep the tagline and trim the sentence rather than
rewriting it. The sentence is the approved App Store promotional text and the web
app's meta description, so it is already the claim the product makes everywhere
else. Changing it means changing it in
[[Implementation - Store Listing Assets]] first.

### Per-Platform Bio Trims

Instagram caps the bio at 150 characters and the full copy is 161, so the
sentence drops `on the map` and lands at exactly 150 with the tagline intact.
That is the one lossless cut - Instagram has no map to refer to:

```text
Find it. Try it. Share it.
Every pin is one real dish, photographed by the person who ate it, with the price they paid and what they honestly thought.
```

Trim the sentence, never the tagline, and never rewrite the claim.

### Instagram's Website Field Is Mobile-Only

The `Website` field on `instagram.com/accounts/edit/` is inert. The page says so -
_"Editing your links is only available on mobile"_ - and a write to it is
silently discarded with no error. **The profile link must be set in the Instagram
mobile app**, under Edit profile - Links. Everything else on the profile,
including the avatar and the bio, sets correctly from the web.

Forcing a 420px viewport does not help. Instagram serves the same web app at
every width, so there is no mobile web layout to fall back to - it is the native
app or nothing.

Set from the app on 2 September 2026. Instagram rewrites every outbound profile
link through `l.instagram.com/?u=...`; that wrapper is theirs and unavoidable,
and the target is the canonical `https://bitetribe.app/`.

### Threads Saves Bio And Links Separately, And They Fight

Threads' edit-profile dialog has sub-dialogs for `Bio` and `Links`, each with
their own `Done`, plus a main `Done` at the bottom. They do not compose:

- The bio sub-dialog does **not** persist on its own. Escaping the outer dialog
  discards it. It needs the main `Done`.
- A link **does** persist immediately from its own sub-dialog.
- The main `Done` then submits a stale profile object and **wipes the link that
  was already saved**.

Observed both directions on 2 September 2026. The order that works:

1. Set the bio, `Done` on the sub-dialog, then the main `Done`. Bio is now live.
2. Re-open the dialog, add the link, `Done` on its sub-dialog only.
3. Leave with `Escape`. Do **not** press the main `Done` again.

Reload the profile before believing any of it - the profile behind the dialog
renders optimistically and showed the link for a while after it had been wiped.

### TikTok Blocks Signup From An Automated Browser

TikTok bounced the web signup to `/login/download-app` - _"For security purposes,
continue on the TikTok app"_ - with a QR code that only downloads the app. Driving
the browser through an extension is the likely trigger; it was the only platform
of the eight to do this.

**Do not retry it from the browser.** TikTok flags accounts created from sessions
it finds suspicious, and the downside is losing the handle on the platform where
`bitetribe` is already squatted. Sign up in the app, then log in on the web -
login and profile editing are not gated, only account creation is.

### TikTok's Own Limits

Four of them, all discovered on 2 September 2026 and all easy to trip:

| Limit               | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Bio                 | **80 characters**, against Instagram's 150            |
| Username change     | Once every **30 days**                                |
| Display name change | Once every **7 days**                                 |
| Profile link        | Needs **1,000 followers**. No field exists below that |

**TikTok never asks for a username at signup.** It derives one from the display
name - ours became `bitetribe5` - and you change it afterwards in Edit profile.
With a 30-day lock, that is one shot before the launch window.

The 80-character bio does not fit the full copy at 161, or even the Instagram trim
at 150. TikTok gets its own, keeping the tagline and the claim that actually
differentiates the product, at 75:

```text
Find it. Try it. Share it.
Real dishes, photographed by those who ate them.
```

**TikTok carries no link to `bitetribe.app`,** and cannot until 1,000 followers.
This is the one acceptance criterion of
[#1455](https://github.com/muhammedgaygisiz/travellers-apps/issues/1455) that a
platform refuses rather than we skipped. Revisit at 1k.

### Pinterest Is A Business Account

Registered through `pinterest.com/business/create/` rather than the consumer
signup. Free, and unlike Instagram's business account it costs nothing - there is
no music-library equivalent to lose. It is also the only one of the eight that
takes our category as a first-class field: **Food and drink**, matching
[[Implementation - Store Listing Assets]] exactly.

Onboarding answers, none of them load-bearing but all recorded so they are not
re-guessed:

| Question          | Answer                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| Business type     | `Other` - we are a consumer app, and every other option mis-describes us |
| Brand focus       | `Food and drink`                                                         |
| Goals             | Drive traffic to your site, Grow brand awareness                         |
| Interested in ads | Yes, consistent with keeping ads open for #913                           |

`Other` was chosen deliberately: `Online merchant or marketplace` would steer
Pinterest into product-catalogue tooling we cannot fill, and `Publisher or media`
means magazines and news outlets. Pinterest says the choice is updatable, and it
does not gate website claiming.

### Two Pinterest Traps

**The `Imprint` field sits directly above `Username`.** Imprint is the EU legal
disclosure (Impressum). It is easy to write the handle into it by mistake, and it
is publicly visible. Ours is deliberately empty.

**Pinterest rewrites `https://` to `http://` on save.** The stored profile link
is `http://bitetribe.app/` no matter what is typed. Harmless - the host 301s to
`https://bitetribe.app/`, verified on the day - so it costs one redirect hop and
lands on the canonical. Do not keep re-fixing it; Pinterest wins.

Pinterest also flattens the bio's line break into a single paragraph. The text is
intact and it reads fine, so the tagline is not given its own line there.

### X Allows Email Signup Only In The App

X's web signup offers phone, Google or Apple. Choosing `Email or username` and
continuing produces a QR code and the flat statement **"Email signups are only
allowed on the apps"**. Unlike TikTok this is documented product behaviour rather
than an anti-automation block, and it does not go away by retrying.

That matters because the web path would attach a **personal phone number** as the
account's identity, breaking the pattern where all eight sit on
`social@bitetribe.app`. Sign up in the X app with email instead.

**Turn off "Let people find your account by your phone number or email"** if the
phone path is ever used. It is on by default, and on a brand account registered
with a personal number it makes that number a public lookup key for the brand.

X keeps `https://` on the profile link, wrapped through `t.co`. Verified on the
day: the profile's `t.co` resolves to `https://bitetribe.app`. Better behaviour
than Pinterest, which downgrades to `http`.

### YouTube Is The One Account Not On The Role Address

`social@bitetribe.app` is a **Workspace alias, not a Google account**. Mail to it
is delivered - which is all the other seven platforms need - but it cannot sign
in to Google, and the public "Create account" flow will not provision it either,
because `bitetribe.app` is a Workspace-managed domain. Attempting it drops you
into creating an unrelated `@gmail.com` address, which is worse than the
alternative.

So the channel sits on **`muhammed.gaygisiz@bitetribe.app`**, an org-owned
Workspace account. Not a personal Gmail, but not the role address either.

**It is a personal channel, not a Brand Account, and that could not be fixed on
the day.** Both routes are closed:

- Creating the channel through `youtube.com/channel_switcher` produces a personal
  channel despite that being the path usually recommended for a Brand Account.
- `youtube.com/account_transfer_channel` moves a channel only into a Brand
  Account that **already exists**, and reports _"No other accounts available"_
  when none does. `myaccount.google.com/brandaccounts` lists Brand Accounts but
  offers no way to create one - Google has withdrawn self-serve creation.

The consequence: the channel is welded to one Google user rather than being an
entity that user merely manages. Handing it over means moving the channel, not
just adding an owner.

**The fix, when someone wants it:** provision `social@bitetribe.app` as a real
Workspace user (removing the alias first, since the two conflict), then move the
channel to it. Cheapest while the channel is empty - no videos, no subscribers,
nothing to migrate - and it gets harder with every upload.

### Facebook Hides The Page Username Setting

The Page exists and is fully configured, but it lives at
`facebook.com/profile.php?id=61594035570286`. **There is no username, and
Facebook offers no way to set one on a new Page.** Checked on 2 September 2026:

- `Settings - Page setup` lists Name, Page access, Page type, management history,
  status, recommendation, messaging. No username.
- `Settings - How people can find and contact you` is search-engine linking,
  recommendations and messaging only.
- Searching the settings for `username` returns `Name` and nothing else.
- `About - Names` offers name pronunciation and other names.

The field is not absent, only well hidden - it was found later the same day and
`bitetribeapp` was set successfully, so `facebook.com/bitetribeapp` now resolves
to the Page. **The lesson is where it is not:** not in Page setup, not in "How
people can find and contact you", not in About - Names, and not surfaced by
searching the settings for `username`.

That also finally answered the one question that could not be checked up front.
`facebook.com/bitetribeapp` returns the generic _"This content isn't available at
the moment"_ wall for a nonexistent handle **even when signed in**, and `curl`
gets an HTTP `400`, so availability was unknowable until the moment of claiming
it. **It was free.** The handle is now ours on all eight platforms with no
variants.

Two Page settings worth keeping as they are: **Data sharing is off**, and
**"Allow search engines outside Facebook to link to your Page" is on** - the
latter matters, because the Page is one more surface competing with the Manchester
`@bitetribe` accounts for our own name.

A Facebook Page is also the one account created from a **personal profile** rather
than `social@bitetribe.app`; there is no email-only path. Admins can be added, so
handover is by permission rather than transfer.

### Meta's Consent-Or-Pay Gate, And Why We Kept Personalised Ads

Some time after signup, Instagram blocks the profile editor with an EU
consent-or-pay interstitial: subscribe from CHF 5.00/month for no ads, or use it
free and consent to data processing for ads. It cannot be dismissed - it blocks
`accounts/edit/` until answered.

**We chose free-with-ads, and deliberately kept _personalised_ ads.** Decided
2 September 2026.

The screen offers a middle option, less-personalised ads, which is the
privacy-preserving choice and was the obvious pick until its confirmation screen
said the quiet part:

> Your ability to **advertise and monetise with ads** will be limited.

That is a direct cost to
[#913](https://github.com/muhammedgaygisiz/travellers-apps/issues/913), which is
a paid launch campaign. Crippling the ad account before the campaign starts buys
less data processing on an account that publishes dish photos and browses
nothing. Wrong trade. Both settings are reversible in Ad preferences, so if #913
turns out to be organic-only, switch then.

**Check the Accounts Centre scope before agreeing.** The consent applies to every
account in the Accounts Centre, not just the one in front of you, and joining
Threads adds accounts to it. Verified on the day at
`accountscenter.instagram.com/manage/`: it held only `bitetribeapp` on Instagram
and Threads, no personal account. If a personal account is ever in there, this
consent reaches it.

### The Avatar

`ssot/assets/social/avatar.png`, `1024x1024`, about 52 KB.

The mascot from `apps/bite-tribe/src/assets/icons/logo.svg` at 80% of the canvas
height, centred on `#1A1C22` - the same dark ground as the feature graphic and
the Open Graph image, so the avatar and a shared link card look like one system.

It is built for a **circle crop**, which every platform in the table applies. The
mascot's bounding box is taller than it is wide because of the headdress, and at
full bleed the feathers are the first thing a circle mask cuts. 80% clears the
crop on every edge.

Regenerate it from the SVG rather than editing the PNG:

```bash
node -e "const sharp=require('sharp'),fs=require('fs');const W=1024,H=Math.round(W*0.8),Wm=Math.round(H*685/885);sharp(fs.readFileSync('apps/bite-tribe/src/assets/icons/logo.svg'),{density:600}).resize(Wm,H).png().toBuffer().then(m=>sharp({create:{width:W,height:W,channels:4,background:{r:0x1a,g:0x1c,b:0x22,alpha:1}}}).composite([{input:m,left:Math.round((W-Wm)/2),top:Math.round((W-H)/2)}]).png({compressionLevel:9}).toFile('ssot/assets/social/avatar.png'))"
```

Use `logo.svg`, not `apps/bite-tribe-ios/assets/icon-only.png`. Despite its alpha
channel the iOS icon is fully opaque white behind the mascot, so compositing it
on the dark ground produces a white rectangle.

## Wiring Back Into The Product

### twitter:site, Done

`apps/bite-tribe/src/index.html` carries
`<meta name="twitter:site" content="@bitetribeapp" />`, added here rather than
under [#1454](https://github.com/muhammedgaygisiz/travellers-apps/issues/1454)
because #1454 had no handle to name.

The ordering risk it carried is closed: **`@bitetribeapp` on X was registered on
2 September 2026**, so the tag resolves. Until it did, the tag named a handle
nobody owned, which was an invitation for someone else to claim it and collect
the attribution on our own link cards.

### Still Open

- **Store listing social fields.** Both consoles have marketing and social URL
  fields that are blank; see the console-state tables in
  [[Implementation - Store Listing Assets]]. They can be filled without shipping
  a build.
- **Claim `bitetribe.app` on Pinterest.** `pinterest.com/settings/claim/` takes a
  meta tag, an HTML file or a DNS TXT record. Claiming gives us attribution on
  every pin that originates from the site, and unlocks the analytics that make
  Pinterest worth doing at all. It needs a change to the web app, so it is real
  work rather than a console click - the meta tag would sit alongside the ones in
  [[Implementation - Web Search And Social Metadata]].
- **Links from the web app.** Worth considering alongside the store QR codes in
  [#1453](https://github.com/muhammedgaygisiz/travellers-apps/issues/1453),
  rather than as a separate pass over the same footer.

### Open: Instagram Account Type

`bitetribeapp` is a **Personal** account. Deferred 2 September 2026, because it
is a question about
[#913](https://github.com/muhammedgaygisiz/travellers-apps/issues/913)'s strategy
rather than about setup, and it is reversible either way.

| Type     | Gains                                                                             | Costs                                        |
| -------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| Business | Food & Drink category on the profile, Insights, contact button, clean Ads Manager | Reels limited to commercially-licensed music |
| Creator  | Full music library, content analytics                                             | Weaker contact, shop and ads features        |

The music restriction is the part that is easy to miss and hard to undo mid
campaign: a dish-first product lives on short video with trending audio, and a
Business account cannot use it. Pick Creator if #913 is organic Reels and
BiteTrails as short video, Business if #913 is mainly paid ads.

Until this is decided the profile carries no category, which is the one place
where [[Implementation - Store Listing Assets]]'s `Food & Drink` identity is not
yet reflected.

### Deliberately Not Done

- **Header and banner images.** X, YouTube and Facebook each want one, at three
  different aspect ratios with three different safe areas. The feature graphic is
  `1024x500` and none of them is, so producing them is a design pass rather than
  asset reuse, and #1455 scoped itself to existing assets. The two primary
  platforms, Instagram and TikTok, have no header at all, so nothing is blocked.
- **Localised bios.** The app speaks eleven languages; the accounts speak
  English, like both store listings do today.

## Related Pages

- [[Implementation - Store Listing Assets]]
- [[Implementation - Web Search And Social Metadata]]
- [[Current State - Release State]]
- [[Mission]]
