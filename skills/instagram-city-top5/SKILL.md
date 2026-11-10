---
name: instagram-city-top5
description: Create the @bitetribeapp "<City> Top 5 dishes" Instagram carousel for one city. It asks for the city when none is given, picks five Bites through the web app's country search, renders seven slides with Leela on the cover and the closing slide, tags and follows each restaurant's confirmed Instagram account, and publishes on Instagram web after approval. Use when the user asks for a city post or a Top 5 post, or runs it with a city name, e.g. "/instagram-city-top5 Ljubljana".
argument-hint: <city>
---

# Instagram City Top 5

The city carousels on @bitetribeapp (Solothurn, Istanbul, Budapest, Vienna, Trieste, Bern, Split, Bratislava, Malta, Mostar, Granada, London, Chiang Mai, Kayseri) all follow this recipe. The format and its history are owned by
[Implementation - Social Media Channels](../../ssot/implementation/social-media-channels.md#the-city-top-5-posts); this skill is how an agent produces one.

All paths are relative to the repository root. Run commands from there.

## Input: One City

**The skill makes a post for one city, and the city is its only input.**

- If the city came with the request (`/instagram-city-top5 Ljubljana`, or "a Top 5 post for Ljubljana"), use it.
- If not, ask for it and nothing else: "Which city should the post be about?" Do not suggest dishes, photos or wording before you have the city.

Then derive everything else from it, without asking:

| Derived            | From                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Country and flag   | The city. Ask only if the name is ambiguous (for example, Frankfurt am Main or Frankfurt an der Oder). |
| Country filter     | The country, in the web app's search (step 1).                                                         |
| Cover photo        | An Unsplash search for the city (step 3).                                                              |
| Leela's cover line | Written for the place each time (step 2). Only the closing line stays the same.                        |
| Caption            | The template in step 5, with the city, the country, its flag and local hashtags.                       |
| Location           | "<City>, <Country>" on Instagram (step 6).                                                             |
| Restaurant tags    | Each restaurant's own Instagram account, where one can be confirmed (step 3).                          |

Before step 1, check two things:

- **Has the city been posted already?** The list is in [The City Top 5 Posts](../../ssot/implementation/social-media-channels.md#the-city-top-5-posts), but it has fallen behind before: Solothurn, Istanbul and Budapest were missing from it. So also scroll the profile grid at `instagram.com/bitetribeapp/` and search the tiles' image alt text for the city. If the city has been posted, say so and ask whether to do it again. If the list is missing a post, add it.
- **Are there enough Bites?** If the country search finds fewer than five Bites in or near the city, stop and report what it found, rather than filling the post with Bites from elsewhere in the country.

## The Post

Seven slides, 1080x1440 (3:4):

| Slide | Content                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Cover: a free city photo under a dark overlay, logo + "BiteTribe", the city in italic serif, "Top 5 dishes", and Leela with a greeting bubble. |
| 1-5   | One Bite card each on `#1a1c22`, drawn with the web card's own styles, logo + wordmark below.                                                  |
| 6     | Leela asking people to follow @bitetribeapp and try the app, with the handle and "Available on iOS and Android".                               |

Leela is in a round frame because only reference crops of her exist (`ssot/assets/characters/leela/`), each with the comic's café painted behind her. Do not stretch them past their 480x560 size.

## Workflow

Steps 2 and 5 are **gates**. Stop and wait for the user's answer.

### 1. Find the dishes

The user's Chrome (Claude in Chrome), signed in to `https://bitetribe.app` - not the built-in browser. If it is not signed in, ask the user to sign in; never type a password.

1. Open `https://bitetribe.app/search`, pick the **Country** filter and select the city's country. The country search returns every Bite in the country, so keep only the ones in or near the city. A city search would miss nearby places. The cards do not show a city, though. For a country with many Bites (Thailand had 165, Türkiye 809), read the country search's response instead: it carries each Bite's `position` and `rating`. Wrap `window.fetch` before picking the country, then filter the `searchBitesByCountry` response to a box around the city:
   ```js
   window.__cap = [];
   const f = window.fetch;
   window.fetch = async (...a) => {
     const r = await f(...a);
     if (/searchBitesByCountry/.test(String(a[0]?.url ?? a[0])))
       r.clone()
         .text()
         .then((t) => window.__cap.push(t));
     return r;
   };
   // pick the country (pick another one first if it is already selected), then:
   const bites = JSON.parse(window.__cap.at(-1)).result;
   bites.filter((b) => b.position?.latitude > 38.55 && b.position.latitude < 38.83 && b.position.longitude > 35.25 && b.position.longitude < 35.7);
   ```
   Do not rely on the **City** filter alone. It returns at most 20 Bites from a 15 km circle, taken in geohash order rather than by distance, so further searches near the city return the same 20. Kayseri showed 52 Bites over ten district searches, while the map showed 129. Open `/bite/<id>` for the author, the district and the reactions.
2. Read the cards with JavaScript rather than screenshots: `document.querySelectorAll('bt-bite')`, the title from the card's first line, the stars from `star-rating ion-icon.filled`.
3. Shortlist five-star Bites, **preferring local dishes** (Pašticada in Split, bryndzové halušky in Bratislava) over pizza, burgers, ramen and coffee. A Bite from a nearby place (Hvar for Split) is fine - the cover names the city.

### 2. Gate: the user approves the five

List the five with restaurant and author, plus two or three local alternatives, and state what Leela will say on the cover and the closing slide. Include a draft description for each dish (step 4).

**Write Leela's cover line for the place; do not reuse the generic greeting** (user's call, 5 November 2026). Start it with "Hi, I'm Leela!" and end it with 👉. In between, name something local: the dishes in this post, or the island or region it covers. For Malta it was "From ftira to fenek, here are my favourite bites across Malta & Gozo". Vary its shape from post to post: after several "From X to Y" lines, the user asked for something different, and Kayseri got "Kayseri is mantı country, but wait till you see the rest". Keep it to four lines in the bubble, about 90 characters, and check the cover after rendering. The closing line stays the default.

**Any shared Bite can be used, whoever posted it.** The product owner confirmed this on 5 November 2026, so [#1772](https://github.com/muhammedgaygisiz/travellers-apps/issues/1772) does not block these posts. Still list each Bite's author, which shows on the Bite's detail page.

### 3. Collect photos, reactions and a cover photo

- **Photos.** The search card's `img.src` is a Firebase Storage URL with a token, which the extension will not return. Fetch it inside the page and save it through a blob link:
  ```js
  const blob = await (await fetch(img.src)).blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'city-1.jpg';
  document.body.appendChild(a);
  a.click();
  ```
  Download all five in one script, about a second apart. Chrome blocks the second and later downloads until the user allows "multiple downloads" for bitetribe.app - ask them, then retry. The files land in `~/Downloads`.
- **Reactions.** Search cards are `readonly` and hide them. Click each card's `ion-card`, and read the emoji and count from the detail page text, under the price and place. Use `history.back()` to return to the results.
- **Cover photo.** Use a free Unsplash photo (`https://unsplash.com/s/photos/<city>?license=free`), portrait if possible, with calm sky or street at the top for the title. Download it with `curl -sL -o <id>.jpg "https://unsplash.com/photos/<id>/download?force=true&w=2000"`. Skip Unsplash+ results.
- **Restaurant accounts.** Instagram allows one location per post, and that stays the city. The restaurants are named instead: tagged on their own slide, and listed in the caption. A tag notifies the account, so **tag only an account you have confirmed as the restaurant's own**, in one of these ways:
  - the restaurant's website or Google Maps listing links to it;
  - its bio or posts give the same name and the same street or city as the Bite's place.

  A similar name alone is not enough: small places often have no account, and a chain or a namesake in another city often shares the name. If no account can be confirmed, the restaurant gets no tag and appears in the caption by name only. Note each handle together with how it was confirmed.

  A confirmed account can still be missing from the tag search when it blocks tags: London's `@chickenshop` never appeared, only look-alikes such as `@chickenshopdate`. Then keep the handle in the caption, leave the slide untagged, and never pick a look-alike. Clear the search box with its ✕ and move on with the slide arrow. Never press Escape.

  Two things the Bern dry run showed:
  - **Find the place's address first.** Start with the city printed on the Bite card: it already names the branch when a chain has one per city (Pittaria in Solothurn and Bern). Where a chain has several branches in the same city, or the name is too generic for Maps to find (Budapest's "the goulash", a stall in the Great Market Hall), read the pin. Neither the restaurant page (`/bite/<id>/restaurant/place/<name>`) nor the Bite's own page (`/bite/<id>`) shows an address, but both have a map. Read the pin's position from the Leaflet tiles with the snippet below, and match it to the Google Maps listing. For Bern's Yikou Sushi, this showed that the Bite came from the Garden branch, not the Old Town shop that has the Yikou accounts.

    **Wait for the map to settle.** The map starts without a position, zoomed out to Europe (zoom 2), and moves to the place a few seconds later. A pin read before that lands in the wrong country, so the snippet refuses below zoom 14. If it throws, wait a few seconds and run it again. Do not zoom with the scroll wheel, which loses the pin.

    ```js
    const c = document.querySelector('.leaflet-container');
    const t = c.querySelector('img.leaflet-tile-loaded');
    const tr = t.getBoundingClientRect();
    const [z, tx, ty] = t.src
      .match(/(\d+)\/(\d+)\/(\d+)\.png/)
      .slice(1)
      .map(Number);
    const e = c.querySelector('.leaflet-marker-icon').getBoundingClientRect();
    const x = tx + (e.x + e.width / 2 - tr.x) / 256;
    const y = ty + (e.y + e.height / 2 - tr.y) / 256;
    const n = 2 ** z;
    if (z < 14) throw new Error(`map is at zoom ${z}; it has not settled yet - wait and run again`);
    [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180]; // lat, lng
    ```

  - **Open every handle before using it.** A link on the restaurant's website can be dead. Da Vito's group site links `@davito_liebefeld`, which no longer exists, and the live account is `@ristorante_davito`. A linked account can also be an empty placeholder: the Bratislava Flagship website links `@flagshipbratislava`, which has one post and no bio, while the active `@bratislava_flagship_restaurant` gives the name and address. Read the profile header, and use the handle only if it exists, has posts, and gives the same name and address. Instagram's search box (`/explore/search/`) finds candidates; its JSON endpoints do not answer from the page.

Copy everything into a working folder in the scratchpad, never into the repository: the photos are other people's work.

### 4. Render

Write a config next to the photos, shaped like [scripts/example-bratislava.json](scripts/example-bratislava.json):

- `city`, `where` and `coverPhoto` are required.
- `leela.cover` is the place-specific line from step 2; always set it. `leela.outro` is optional and defaults to the closing line. The cover default exists only as a fallback.
- `cityFontSize` is optional and defaults to 190. Lower it for a city name longer than about ten letters.
- Each Bite takes `name`, `place`, `stars`, `emojis`, `count` and `photo`, plus an optional `where` that overrides the config's.
- Each Bite takes a `description`: one or two sentences, about 120 characters, on what the dish is, drawn under the card. Draft them at the gate in step 2, and have the user check any you are not sure of. The Kayseri draft got pöç wrong.
- `stars: 0` (an unrated Bite) draws no star row instead of five empty stars.
- Each Bite can also take an `instagram` handle (without `@`). It is not drawn on the slides. It is kept in the config as the record for the caption and the tags.
- Paths resolve against the config's folder.

Then render:

```bash
node skills/instagram-city-top5/scripts/render.mjs <work>/config.json <work>/out
```

It writes `slide-0.png` to `slide-6.png`, matching JPEGs, and `contact.png`. It needs the installed Chrome (`channel: 'chrome'`) and the Google Fonts it loads.

Look at `contact.png` and at least the cover and the closing slide at full size. Check for:

- the title colliding with "Top 5 dishes" or with Leela's bubble;
- a comic speech-bubble remnant showing inside Leela's frame;
- a dish title running to more than three lines.

### 5. Gate: the user reviews the slides

Send the following, then publish only after an explicit "publish":

- the contact sheet, and the cover and closing slides, as files;
- the draft caption below;
- the restaurant tags: for each slide, the handle and how it was confirmed, or "no tag" and why.

The caption lists the five in slide order. Each line gets the restaurant's handle where it has a confirmed one, and only its name where it does not:

```text
Need some inspiration for your next bites in <City>, <Country>? <flag>
Leela picked her favourites for your next trip to this <adjective> city!

1️⃣ <Dish> - <Restaurant> (@<handle>)
2️⃣ <Dish> - <Restaurant>
3️⃣ ...

📲 Available on iOS and Android, link in bio.
#foodie #foodapp #travelfood #realfood #<country> #<city> #<local dish or region>
```

### 6. Publish on Instagram web

In the same Chrome, signed in as @bitetribeapp:

1. **Create → Post**. Upload the seven JPEGs in one go with the file-upload tool on the dialog's `input[type=file]` - the last one `find` returns. Do not click the input.
2. **Crop defaults to square.** Open the crop control at the bottom left of the preview, choose **Original**, and confirm that the slide counter shows seven slides.
3. Next, Next. Type the caption into the `Add a caption...` textbox line by line, pressing `Enter` between lines. **Never press Escape** to close the hashtag suggestions: it opens "Discard post?" - press Cancel if it appears. Read the caption back from `div[contenteditable=true][role=textbox]`.
4. **Location.** Clicking "Add Location" leaves the focus in the caption, so whatever you type lands in the caption. Focus `input[placeholder="Add Location"]` with JavaScript, type "<City>, <Country>", and pick the first option. If the suggestion list stays open, pick that option again by its `find` ref.
5. **Restaurant tags.** For each dish slide with a confirmed handle:
   1. Move the preview to that slide with its right arrow.
   2. Click the photo where it shows "Click photo to tag people". A `Tag:` search box opens where you clicked.
   3. Type the handle and wait for the results.
   4. Pick the result whose handle matches exactly. Look-alikes come next in the list (`kesar.restaurant` under `restaurant.kesar`).

   A tag label then sits on the photo. Tag nothing on the cover or the closing slide. Each slide has a delete icon at its top left, which removes the slide from the post - never click it.

6. Leave "Share to Facebook" off; no Threads option appears for this account. Share, wait for "Your post has been shared", and close the tab you opened.
7. **Follow every tagged account** from @bitetribeapp. Open each profile and click **Follow**, or **Follow Back**, if the header shows it. If it shows **Following** already, leave it. Check that the button reads **Following** afterwards. If it still reads **Follow**, reload the profile before clicking again: on Šug the button had not updated yet, and the follow had already gone through.

   ```js
   // On instagram.com/<handle>/ - follows the account if not yet followed; returns [handle, before, after]
   await new Promise((r) => setTimeout(r, 2500));
   const re = /^(Follow|Follow Back|Following|Requested)$/;
   const state = () => [...document.querySelectorAll('header button, header div[role=button]')].map((b) => b.innerText.trim()).find((t) => re.test(t));
   const before = state();
   if (before === 'Follow' || before === 'Follow Back') {
     [...document.querySelectorAll('header button, header div[role=button]')].find((b) => b.innerText.trim() === before).click();
     await new Promise((r) => setTimeout(r, 2500));
   }
   [location.pathname, before, state()];
   ```

**Tagging a post that is already up** works the same way in **⋯ → Edit**. Open the post from the profile grid: Edit opened from the post's own `/p/<id>/` page can keep loading forever. Use the same per-slide steps, then **Done**, then follow the accounts as in step 7.

**Always read the tags back.** A tag can be dropped on save without any error: Istanbul's `@viyanakahvesi` was, and the second try stuck. Do not read them in the dialog that stays open after **Done**: it can still show the old tags (Trieste showed one of three, and all three were there after a reload). Reopen the post from the profile grid, then read the tags back. The carousel keeps only the current slide and its neighbours in the page, so this collects the tags slide by slide (the slides of older posts have no useful alt text):

```js
// In the open post dialog; returns one line per slide: "?img_index=<n> /<handle>/ ..." (neighbouring slides' tags show too)
const root = document.querySelector('[role=dialog]') ?? document;
const out = [];
for (let k = 0; k < 8; k++) {
  const tags = [...new Set([...root.querySelectorAll('ul li')].flatMap((li) => [...li.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href'))).filter((h) => !/bitetribeapp|explore/.test(h)))];
  out.push(`${location.search} ${tags.join(' ')}`);
  const next = root.querySelector('button[aria-label="Next"]');
  if (!next) break;
  next.click();
  await new Promise((r) => setTimeout(r, 1200));
}
out;
```

Every handle has to show up somewhere in the output. If one is missing, open **Edit** again and look at that slide. When one handle covers several slides (three Al Zaytouna dishes in Vienna), the output cannot tell those slides apart. Key each `li` by its image file name instead, and check that every one of those slides carries the handle.

## After Publishing

- Report the result: the slide count, the caption, the location, the tags that were set, the accounts newly followed, and anything skipped (for example alt text, or a tag that could not be set).
- If the post changed the format, update `## The City Top 5 Posts` in `ssot/implementation/social-media-channels.md`, and this skill too.
