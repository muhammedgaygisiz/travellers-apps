import { LandingPage } from '../model/landing-page';
import { BITE_TRIBE_ORIGIN } from './bite-tribe-origin';
import { getCountryFlagEmoji } from './country-label';
import { escapeHtml, renderSocialMeta } from './render-html';
import {
  CITY_INDEX_URL,
  PAGE_FOOTER,
  PAGE_HEADER,
  STYLE,
  landingPageUrl,
  renderCallToAction,
  renderJsonLd,
  renderPostLinks,
} from './render-landing-page';

/**
 * `/eat`: every published city page on one page (issue #2091).
 *
 * The city pages were linked from nowhere, so a crawler knew them only from
 * `eat/sitemap.xml` and a reader had no way from one city to the next. This
 * page is that link: the start page and every city page point here, and it
 * points at every city.
 *
 * Built from the same stored pages the city pages render, with the same
 * header, footer and call to action, and like them plain HTML with no script.
 */

/** What the call to action's `city_page` parameter carries from this page. */
export const CITY_INDEX_SOURCE = 'index';

const INDEX_STYLE = `
  .countries { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-flow:row dense; gap:24px 16px; margin:0 0 32px; }
  .country-group { min-width:0; --cols:1; }
  .country-group h2 { font-size:18px; font-weight:700; margin:0 0 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .country-group h2 .flag { font-size:1.35em; vertical-align:-0.12em; margin-right:6px; }
  .country-group ol { grid-template-columns:repeat(var(--cols),minmax(0,1fr)); gap:16px; margin:0; }
  .n2, .n3, .n4 { grid-column:span 2; --cols:2; }
  .city-card img { border-radius:10px; }
  h3 { font-size:16px; margin:8px 0 0; }
  .dishes { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:13px; }
  .city-card .posts { font-size:13px; }
  .hello { display:flex; align-items:center; gap:14px; margin:20px 0 28px; }
  .hello img { width:88px; height:88px; border-radius:50%; object-fit:cover; object-position:45% 55%; flex:none; background:var(--card); }
  .bubble { position:relative; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:10px 14px; margin:0; font-size:15px; }
  .bubble::before { content:""; position:absolute; left:-7px; top:50%; width:12px; height:12px; background:var(--card); border-left:1px solid var(--line); border-bottom:1px solid var(--line); transform:translateY(-50%) rotate(45deg); }
  .how { display:grid; gap:16px; margin:8px 0 28px; padding-top:28px; border-top:1px solid var(--line); }
  .how h2 { font-size:22px; margin:0; }
  .how img { width:100%; max-width:360px; height:auto; border-radius:12px; display:block; justify-self:center; }
  .steps { list-style:none; margin:0; padding:0; display:grid; gap:14px; grid-template-columns:minmax(0,1fr); }
  .steps h3 { font-size:17px; margin:0; }
  .steps p { margin:2px 0 0; color:var(--muted); }
  .tribe-tile { display:flex; align-items:center; justify-content:center; }
  .tribe-tile img { width:56%; height:auto; display:block; }
  .tribe-tile:nth-of-type(odd) img { transform:rotate(-6deg); }
  .tribe-tile:nth-of-type(even) img { transform:rotate(6deg); }
  @media (min-width:720px) {
    .hello img { width:112px; height:112px; }
    .tribe-tile img { width:72%; }
    .bubble { font-size:17px; }
    .how { grid-template-columns:320px minmax(0,1fr); grid-template-rows:auto 1fr; column-gap:32px; align-items:start; }
    .how h2 { grid-column:2; grid-row:1; }
    .how img { grid-column:1; grid-row:1 / span 2; }
    .how .steps { grid-column:2; grid-row:2; }
    .steps { gap:20px; }
    .countries { grid-template-columns:repeat(4,minmax(0,1fr)); gap:32px 20px; }
    .country-group ol { gap:20px; }
    .n3 { grid-column:span 3; --cols:3; }
    .n4 { grid-column:span 4; --cols:4; }
  }
`;

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

const countryName = (code: string): string => {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export interface CountryGroup {
  countryCode: string;
  name: string;
  pages: LandingPage[];
}

/** Countries by name, cities by name within each. */
export const groupByCountry = (pages: LandingPage[]): CountryGroup[] => {
  const groups = new Map<string, LandingPage[]>();

  for (const page of pages) {
    groups.set(page.countryCode, [
      ...(groups.get(page.countryCode) ?? []),
      page,
    ]);
  }

  return [...groups.entries()]
    .map(([countryCode, group]) => ({
      countryCode,
      name: countryName(countryCode),
      pages: [...group].sort((a, b) =>
        a.cityName.localeCompare(b.cityName, 'en'),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
};

/**
 * A country's block is as wide as its cities, up to the row: one column for
 * one city, the full row for four or more (`n1` to `n4`). The blocks pack
 * densely, so single-city countries sit side by side instead of each leaving a
 * half-empty row under its own heading.
 */
const renderGroup = (group: CountryGroup, first: number): string => {
  const width = Math.min(group.pages.length, 4);
  const flag = getCountryFlagEmoji(group.countryCode);

  return `
      <section class="country-group n${width}">
        <h2>${flag ? `<span class="flag" aria-hidden="true">${flag}</span>` : ''}${escapeHtml(group.name)}</h2>
        <ol>${group.pages.map((page, i) => renderCard(page, first + i)).join('')}
        </ol>
      </section>`;
};

const renderCard = (page: LandingPage, index: number): string => {
  const cityName = escapeHtml(page.cityName);
  const cover = page.items[0]?.imageUrl;
  const dishes = page.items.map((item) => item.name).join(' · ');

  return `
      <li class="city-card">
        <a class="entry" href="${escapeHtml(landingPageUrl(page))}">
          ${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="${index === 0 ? 'eager' : 'lazy'}" width="800" height="800" />` : ''}
          <h3>${cityName}</h3>
          <p class="dishes">${escapeHtml(dishes)}</p>
        </a>
        ${renderPostLinks(page)}
      </li>`;
};

const cities = (count: number): string =>
  `${count} ${count === 1 ? 'city' : 'cities'}`;

const CHARACTERS = `${BITE_TRIBE_ORIGIN}/assets/characters`;

/**
 * The app's own cast: Leela, who fronts every city post on Instagram, and the
 * seven bite characters. Served from the web build like the logo, so the page
 * still loads nothing from another host.
 */
const leelaGreeting = (count: number): string => `<div class="hello">
      <img src="${CHARACTERS}/leela.jpg" alt="Leela, BiteTribe's traveller" width="274" height="320" />
      <p class="bubble">Hi, I'm Leela! Out of all the dishes people have rated on BiteTribe, these are my top 5 in ${cities(count)} 👇</p>
    </div>`;

const TRIBE = [
  '01-viking',
  '02-arab',
  '03-ethiopian',
  '04-turk',
  '05-chinese',
  '06-japanese',
  '07-swiss',
];

/**
 * The bite characters, placed inside the city grid on alternating edges -
 * right, then left - on every second row of four cards (every fourth row of
 * two on a phone), so the cards flow around them instead of standing as one
 * block.
 *
 * The count is what the cities can fill: the k-th character sits on wide row
 * 2k-1, and the rows up to it hold 7k-4 cities beside the characters. Fewer
 * cities, fewer characters, so none is left on an empty row at the end. The
 * phone rows up to the same character hold fewer cities (7k-6), so the wide
 * layout sets the count.
 */
export const tribeTiles = (
  cityCount: number,
): { html: string; css: string } => {
  const count = Math.min(TRIBE.length, Math.floor((cityCount + 4) / 7));
  const names = TRIBE.slice(0, count);

  const html = names
    .map(
      (name, i) =>
        `\n      <div class="tribe-tile t${i + 1}" aria-hidden="true"><img src="${CHARACTERS}/${name}.svg" alt="" width="120" height="120" loading="lazy" /></div>`,
    )
    .join('');

  const phone = names
    .map((_, i) => `.t${i + 1}{grid-area:${4 * i + 1}/${i % 2 ? 1 : 2}}`)
    .join('');
  const wide = names
    .map((_, i) => `.t${i + 1}{grid-area:${2 * i + 1}/${i % 2 ? 1 : 4}}`)
    .join('');

  return {
    html,
    css: `${phone}@media (min-width:720px){${wide}}`,
  };
};

/** The heading: what the app holds, said plainly, with the count. */
export const cityIndexHeading = (count: number): string =>
  `What you'll find on BiteTribe in ${cities(count)}`;

/**
 * The street food comic (redrawn with Leela's current look, issue #2091), and
 * the app's tagline as three steps beside it. The steps are text, not part of
 * the image, so a crawler reads what the app does.
 */
const HOW_IT_WORKS = `<section class="how" aria-labelledby="how-title">
      <h2 id="how-title">How BiteTribe works</h2>
      <img src="${CHARACTERS}/leela-comic.jpg" alt="A comic: Leela arrives at a night street food market, can't choose, finds a five-star Pad Thai on the BiteTribe map, gets it from the stall and photographs it to rate it herself." width="620" height="1100" loading="lazy" />
      <ol class="steps">
        <li><h3>Find it</h3><p>Twenty stalls and no idea what's good? Open the map and see what the people before you ate, with their photo, the price they paid and how they rated it.</p></li>
        <li><h3>Try it</h3><p>Order the dish somebody gave five stars, not the one with the biggest sign.</p></li>
        <li><h3>Share it</h3><p>Photograph your plate and rate it, and the next traveller finds it too.</p></li>
      </ol>
    </section>`;

/** The `<title>`: the phrase people search for, then the brand. */
export const cityIndexTitle = (count: number): string =>
  `What to eat in ${cities(count)} – BiteTribe`;

export const cityIndexDescription = (count: number): string =>
  `The five dishes to eat in ${cities(count)}, each one photographed, priced and rated by the person who ate it.`;

/** An `ItemList` of the city pages, in the order the page shows them. */
export const cityIndexJsonLd = (groups: CountryGroup[]): object => {
  const pages = groups.flatMap((group) => group.pages);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cityIndexTitle(pages.length),
    url: CITY_INDEX_URL,
    numberOfItems: pages.length,
    itemListElement: pages.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: landingPageUrl(page),
      name: page.title,
    })),
  };
};

/** The page for the published set. Callers pass only published pages. */
export const renderCityIndex = (pages: LandingPage[]): string => {
  const groups = groupByCountry(pages);
  const description = cityIndexDescription(pages.length);
  const tribe = tribeTiles(pages.length);
  let first = 0;
  const sections = groups
    .map((group) => {
      const html = renderGroup(group, first);
      first += group.pages.length;
      return html;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="BiteTribe" />

  ${renderSocialMeta({
    title: cityIndexTitle(pages.length),
    description,
    imageUrl: groups[0]?.pages[0]?.items[0]?.imageUrl,
    canonicalUrl: CITY_INDEX_URL,
  })}

  <script type="application/ld+json">${renderJsonLd(cityIndexJsonLd(groups))}</script>

  <style>${STYLE}${INDEX_STYLE}${tribe.css}</style>
</head>
<body>
  ${PAGE_HEADER}
  <main>
    <p class="eyebrow">BiteTribe city guides</p>
    <h1>${escapeHtml(cityIndexHeading(pages.length))}</h1>
    ${leelaGreeting(pages.length)}
    <div class="countries">${tribe.html}${sections}
    </div>
    ${HOW_IT_WORKS}
    ${renderCallToAction(CITY_INDEX_SOURCE)}
  </main>
  ${PAGE_FOOTER}
</body>
</html>`;
};
