import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import type { PendingFollowRequest } from 'model';
import { getIonicConfig } from 'utils';
import { FollowRequestsListComponent } from '../follow-requests-list.component';

/** Copied from `en.json`. */
const TRANSLATIONS: Translation = {
  'follow-requests': 'Follow requests',
  'no-follow-requests': 'No follow requests right now.',
  'follow-request-accept': 'Accept',
  'follow-request-decline': 'Decline',
  anonymous: 'Anonymous',
};

@Injectable()
class ListTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

const pia: PendingFollowRequest = {
  requesterUid: 'pia',
  displayName: 'Pia',
  photoUrl: 'https://example.com/pia.jpg',
  createdAt: '2026-11-19T10:00:00.000Z',
};
const nameless: PendingFollowRequest = {
  requesterUid: 'nameless',
  createdAt: '2026-11-18T10:00:00.000Z',
};

describe(FollowRequestsListComponent.name, () => {
  let fixture: ComponentFixture<FollowRequestsListComponent>;
  let component: FollowRequestsListComponent;
  let componentRef: ComponentRef<FollowRequestsListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          loader: ListTranslocoLoader,
        }),
      ],
    });

    fixture = TestBed.createComponent(FollowRequestsListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => [
    ...element().querySelectorAll<HTMLElement>('ion-item'),
  ];
  const byTestId = (id: string, root: ParentNode = element()): HTMLElement =>
    root.querySelector(`[data-testid="${id}"]`) as HTMLElement;

  const render = (
    requests: PendingFollowRequest[],
    inputs: Record<string, unknown> = {},
  ): void => {
    componentRef.setInput('requests', requests);
    Object.entries(inputs).forEach(([name, value]) =>
      componentRef.setInput(name, value),
    );
    // Twice: the first pass settles the list, the second renders what that
    // settles, as the page's next change detection would.
    fixture.detectChanges();
    fixture.detectChanges();
  };

  it('lists the requests in the order they arrive, with a name or Anonymous', () => {
    render([pia, nameless]);

    expect(rows().map((row) => row.querySelector('h2')?.textContent)).toEqual([
      'Pia',
      'Anonymous',
    ]);
    expect(rows()[0].querySelector('img')?.getAttribute('src')).toBe(
      pia.photoUrl,
    );
    expect(rows()[1].querySelector('img')).toBeNull();
  });

  it('says so when nothing is pending', () => {
    render([]);

    expect(byTestId('follow-requests-empty')).not.toBeNull();
    expect(element().textContent).toContain('No follow requests right now.');
    expect(rows()).toHaveLength(0);
  });

  it('waits for the first read before saying nothing is pending', () => {
    render([], { isLoading: true });

    expect(byTestId('follow-requests-empty')).toBeNull();
  });

  it('offers a retry when the read failed', () => {
    const retries: void[] = [];
    component.retryClick.subscribe(() => retries.push(undefined));
    render([], { hasError: true });

    byTestId('follow-requests-error-retry').click();

    expect(byTestId('follow-requests-empty')).toBeNull();
    expect(retries).toHaveLength(1);
  });

  it('accepts and declines without opening the profile', () => {
    const accepted: PendingFollowRequest[] = [];
    const declined: PendingFollowRequest[] = [];
    const opened: PendingFollowRequest[] = [];
    component.accept.subscribe((request) => accepted.push(request));
    component.decline.subscribe((request) => declined.push(request));
    component.requesterClick.subscribe((request) => opened.push(request));
    render([pia, nameless]);

    byTestId('follow-request-accept', rows()[0]).click();
    byTestId('follow-request-decline', rows()[1]).click();

    expect(accepted).toEqual([pia]);
    expect(declined).toEqual([nameless]);
    expect(opened).toEqual([]);
  });

  it("opens the requester's profile when the row is tapped", () => {
    const opened: PendingFollowRequest[] = [];
    component.requesterClick.subscribe((request) => opened.push(request));
    render([pia]);

    rows()[0].click();

    expect(opened).toEqual([pia]);
  });

  it('disables both answers while one is on its way', () => {
    render([pia, nameless], { answeringIds: new Set(['pia']) });

    const disabled = (id: string, row: HTMLElement): boolean =>
      (byTestId(id, row) as HTMLButtonElement).disabled;

    expect(disabled('follow-request-accept', rows()[0])).toBe(true);
    expect(disabled('follow-request-decline', rows()[0])).toBe(true);
    expect(disabled('follow-request-accept', rows()[1])).toBe(false);
  });

  it('falls back to the default avatar when the photo fails', () => {
    render([pia]);

    rows()[0].querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(rows()[0].querySelector('img')).toBeNull();
  });
});
