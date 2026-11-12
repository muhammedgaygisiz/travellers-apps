import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

/**
 * The fewest and most Bites a published city page holds.
 *
 * The callable's numbers, restated so the editor can say why Publish is not
 * available rather than letting the operator find out from a rejected call
 * (issue #1490).
 */
export const MIN_ITEMS = 3;
export const MAX_ITEMS = 5;

export type LandingPageStatus = 'draft' | 'published' | 'withdrawn';

/** One Bite on the page, as the publish snapshot stored it. */
export interface LandingPageItem {
  biteId: string;
  name: string;
  imageUrl: string;
  place: string;
  locality?: string;
}

/** What the editor owns and sends to `saveLandingPage`. */
export interface LandingPageDraft {
  /** The page's id and its URL: one page per city, `/eat/<city>`. */
  city: string;
  cityName: string;
  countryCode: string;
  locale: string;
  title: string;
  metaDescription: string;
  intro: string;
  biteIds: string[];
}

/** A stored page as `listLandingPages` returns it. */
export interface LandingPage extends LandingPageDraft {
  status: LandingPageStatus;
  items: LandingPageItem[];
  publishedAt?: number;
  updatedAt?: number;
  updatedBy?: string;
}

/** The public URL of a page, on the canonical host. */
export const landingPageUrl = (page: Pick<LandingPage, 'city'>): string =>
  `https://bitetribe.app/eat/${encodeURIComponent(page.city)}`;

/**
 * The four operator callables behind city landing pages (epic #1487).
 *
 * Every write goes through a callable, never a client write: the callables
 * carry `requireAdmin` and the operator log, and `landingPages` has no client
 * rule at all. Errors are not swallowed - an operator who is told a page went
 * live when it did not will not look again.
 */
@Injectable({ providedIn: 'root' })
export class LandingPagesDataAccessService {
  async list(): Promise<LandingPage[]> {
    const { data } = await FirebaseFunctions.callByName<
      Record<string, never>,
      LandingPage[]
    >({ name: 'listLandingPages', data: {} });

    return data ?? [];
  }

  async save(draft: LandingPageDraft): Promise<LandingPage> {
    const { data } = await FirebaseFunctions.callByName<
      LandingPageDraft,
      LandingPage
    >({ name: 'saveLandingPage', data: draft });

    return data;
  }

  async preview(draft: LandingPageDraft): Promise<string> {
    const { data } = await FirebaseFunctions.callByName<
      LandingPageDraft,
      { html: string }
    >({ name: 'previewLandingPage', data: draft });

    return data.html;
  }

  async setStatus(
    city: string,
    status: Exclude<LandingPageStatus, 'draft'>,
  ): Promise<LandingPage> {
    const { data } = await FirebaseFunctions.callByName<
      { city: string; status: string },
      LandingPage
    >({ name: 'setLandingPageStatus', data: { city, status } });

    return data;
  }
}
