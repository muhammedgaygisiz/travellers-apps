---
name: instagram-city-top5
description: Create the @bitetribeapp "<City> Top 5 dishes" Instagram carousel for one city. It asks for the city when none is given, picks five Bites through the web app's country search, renders seven slides with Leela on the cover and the closing slide, tags each restaurant's confirmed Instagram account, and publishes on Instagram web after approval. Use when the user asks for a city post or a Top 5 post, or runs it with a city name, e.g. "/instagram-city-top5 Ljubljana".
argument-hint: <city>
---

# Instagram City Top 5

The city carousels on @bitetribeapp (Bern, Trieste, Vienna, Split, Bratislava) all follow this recipe. The format and its history are owned by
[Implementation - Social Media Channels](../../ssot/implementation/social-media-channels.md#the-city-top-5-posts); this skill is how an agent produces one.

All paths are relative to the repository root. Run commands from there.

## Input: One City

**The skill makes a post for one city, and the city is its only input.**

- If the city came with the request (`/instagram-city-top5 Ljubljana`, or "a Top 5 post for Ljubljana"), use it.
- If not, ask for it and nothing else: "Which city should the post be about?" Do not suggest dishes, photos or wording before you have the city.

Then derive everything else from it, without asking:

| Derived          | From                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Country and flag | The city. Ask only if the name is ambiguous (for example, Frankfurt am Main or Frankfurt an der Oder). |
| Country filter   | The country, in the web app's search (step 1).                                                         |
| Cover photo      | An Unsplash search for the city (step 3).                                                              |
| Leela's lines    | The renderer's defaults, which use the city name.                                                      |
| Caption          | The template in step 5, with the city, the country, its flag and local hashtags.                       |
| Location         | "<City>, <Country>" on Instagram (step 6).                                                             |
| Restaurant tags  | Each restaurant's own Instagram account, where one can be confirmed (step 3).                          |

Before step 1, check two things:

- **Has the city been posted already?** The list is in [The City Top 5 Posts](../../ssot/implementation/social-media-channels.md#the-city-top-5-posts). If it has, say so and ask whether to do it again.
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

1. Open `https://bitetribe.app/search`, pick the **Country** filter and select the city's country. The country search returns every Bite in the country, so keep only the ones in or near the city. A city search would miss nearby places.
2. Read the cards with JavaScript rather than screenshots: `document.querySelectorAll('bt-bite')`, the title from the card's first line, the stars from `star-rating ion-icon.filled`.
3. Shortlist five-star Bites, **preferring local dishes** (Pašticada in Split, bryndzové halušky in Bratislava) over pizza, burgers, ramen and coffee. A Bite from a nearby place (Hvar for Split) is fine - the cover names the city.

### 2. Gate: the user approves the five

List the five with restaurant and author, plus two or three local alternatives, and state what Leela will say on the cover and the closing slide.

**Name every Bite that is not the @bitetribeapp operator's own.** Until [#1772](https://github.com/muhammedgaygisiz/travellers-apps/issues/1772) lands, another creator's photo has no licence for use outside the app. The author shows on the Bite's detail page. Prefer the operator's own Bites, and use another creator's only when the user decides to.

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

  Two things the Bern dry run showed:
  - **Find the place's address first.** The app's restaurant page (`/restaurant/place/<name>`) shows no address, only a map. Read the pin's position from the Leaflet tiles with the snippet below, and match it to the Google Maps listing. For Bern's Yikou Sushi, this showed that the Bite came from the Garden branch, not the Old Town shop that has the Yikou accounts.
    ```js
    const c = document.querySelector('.leaflet-container');
    const t = c.querySelector('img.leaflet-tile');
    const tr = t.getBoundingClientRect();
    const [z, tx, ty] = t.src
      .match(/(\d+)\/(\d+)\/(\d+)\.png/)
      .slice(1)
      .map(Number);
    const e = c.querySelector('.leaflet-marker-icon').getBoundingClientRect();
    const x = tx + (e.x + e.width / 2 - tr.x) / 256;
    const y = ty + (e.y + e.height / 2 - tr.y) / 256;
    const n = 2 ** z;
    [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180]; // lat, lng
    ```
  - **Open every handle before using it.** A link on the restaurant's website can be dead. Da Vito's group site links `@davito_liebefeld`, which no longer exists, and the live account is `@ristorante_davito`. Read the profile header, and use the handle only if it exists, has posts, and gives the same name and address. Instagram's search box (`/explore/search/`) finds candidates; its JSON endpoints do not answer from the page.

Copy everything into a working folder in the scratchpad, never into the repository: the photos are other people's work.

### 4. Render

Write a config next to the photos, shaped like [scripts/example-bratislava.json](scripts/example-bratislava.json):

- `city`, `where` and `coverPhoto` are required.
- `leela.cover` and `leela.outro` are optional, and default to the Bratislava lines.
- `cityFontSize` is optional and defaults to 190. Lower it for a city name longer than about ten letters.
- Each Bite takes `name`, `place`, `stars`, `emojis`, `count` and `photo`, plus an optional `where` that overrides the config's.
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
5. **Restaurant tags.** For each dish slide with a confirmed handle, move the preview to that slide, open the people-tagging control, search the handle, and pick the result whose handle matches it exactly. Tag nothing on the cover or the closing slide. If Instagram web offers no tagging on this step, publish with the caption mentions only, and report which tags are still to be added.
6. Leave "Share to Facebook" off; no Threads option appears for this account. Share, wait for "Your post has been shared", and close the tab you opened.

## After Publishing

- Report the result: the slide count, the caption, the location, the tags that were set, and anything skipped (for example alt text, or a tag that could not be set).
- If the post changed the format, update `## The City Top 5 Posts` in `ssot/implementation/social-media-channels.md`, and this skill too.
