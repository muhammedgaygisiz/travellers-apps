import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { PublicUser } from 'model';
import { getIonicConfig } from 'utils';
import { HapticsService } from 'haptics';
import { ProfileComponent } from '../profile.component';

/** Copied from `en.json`. */
const TRANSLATIONS: Translation = {
  'follow-requests': 'Follow requests',
};

@Injectable()
class RowTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

const ME: PublicUser = {
  userId: 'me',
  public: false,
  displayName: 'Me',
  email: '',
  photoUrl: '',
};

/**
 * The Follow requests row on the own private profile (GitHub issue #2165).
 */
describe(`${ProfileComponent.name} follow requests row`, () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let componentRef: ComponentRef<ProfileComponent>;

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
          loader: RowTranslocoLoader,
        }),
        {
          provide: HapticsService,
          useValue: { warning: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('userId', 'me');
  });

  const render = (user: PublicUser, count: number | undefined): void => {
    componentRef.setInput('user', user);
    componentRef.setInput('followRequestCount', count);
    fixture.detectChanges();
  };

  const row = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="profile-follow-requests"]',
    );

  it('shows the row with the pending count on the own private profile', () => {
    render(ME, 3);

    expect(row()?.textContent).toContain('Follow requests');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[data-testid="profile-follow-requests-count"]')
        ?.textContent?.trim(),
    ).toBe('3');
  });

  it('shows no row when nothing is pending', () => {
    render(ME, 0);
    expect(row()).toBeNull();

    render(ME, undefined);
    expect(row()).toBeNull();
  });

  it('shows no row on a public own profile', () => {
    render({ ...ME, public: true }, 3);

    expect(row()).toBeNull();
  });

  it("shows no row on another account's profile", () => {
    render({ ...ME, userId: 'someone-else' }, 3);

    expect(row()).toBeNull();
  });

  it('opens the requests when the row is tapped', () => {
    const clicks: void[] = [];
    component.followRequestsClick.subscribe(() => clicks.push(undefined));
    render(ME, 2);

    row()?.click();

    expect(clicks).toHaveLength(1);
  });
});
