import { Injectable } from '@angular/core';
import { isAuthEntryUrl } from 'utils';

/**
 * Holds the URL a visitor asked for while they were not, or not yet, known to
 * be signed in.
 *
 * A shared Bite link is the product's only share surface, so the recipient
 * arrives cold on `/bite/:biteId` with no session restored yet. Whatever auth
 * decides next — sign in first, or resolve a session that arrived too late for
 * the guard — the address they typed is the one they wanted, and it is gone
 * from the router the moment a guard redirects. Remembering it here lets the
 * sign-in flow and the start page hand it back instead of depositing the
 * visitor on Home (issue #1246).
 *
 * The URL is held in memory for the current page only. A visitor who reloads
 * or closes the tab before signing in has abandoned that intent, and a stale
 * target surfacing in a later session would be the more surprising outcome.
 */
@Injectable({ providedIn: 'root' })
export class RequestedUrlService {
  private requestedUrl: string | undefined;

  /**
   * Records the URL to return to. Sign-in pages are ignored: returning to one
   * after signing in would put the visitor back where they started.
   */
  remember(url: string): void {
    this.requestedUrl = isAuthEntryUrl(url) ? undefined : url;
  }

  /** Returns the remembered URL, if any, and forgets it. */
  consume(): string | undefined {
    const requestedUrl = this.requestedUrl;
    this.requestedUrl = undefined;

    return requestedUrl;
  }
}
