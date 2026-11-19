import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { ProfileMetaData, PublicUser } from 'model';
import { getIonicConfig } from 'utils';
import { HapticsService } from 'haptics';
import { ProfileComponent } from '../profile.component';

/** Copied from `en.json`. */
const TRANSLATIONS: Translation = {
  follow: 'Follow',
  'follow-requested': 'Requested',
  'stop-following': 'Stop following',
};

@Injectable()
class RequestTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

/** What another account receives of a private profile (issue #1863). */
const PRIVATE_USER: PublicUser = {
  userId: 'private-owner',
  public: false,
  displayName: '',
  email: '',
  photoUrl: '',
};

const METADATA: ProfileMetaData = {
  followers: 4,
  following: 2,
  isFollowedByMe: false,
  isRequestedByMe: false,
};

/**
 * The follow button on another account's private profile (GitHub issue
 * #2164): Follow sends a request, Requested withdraws it.
 */
describe(`${ProfileComponent.name} follow request`, () => {
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
          loader: RequestTranslocoLoader,
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

    componentRef.setInput('user', PRIVATE_USER);
    componentRef.setInput('userId', 'me');
  });

  const render = (metadata: ProfileMetaData): void => {
    componentRef.setInput('profileMetadata', metadata);
    fixture.detectChanges();
  };

  const requestedButton = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="profile-follow-requested"]',
    );

  const actionLabels = (): string[] =>
    [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        '.profile-actions ion-button',
      ),
    ].map((button) => button.textContent?.trim() ?? '');

  it('offers Follow while there is no request', () => {
    render(METADATA);

    expect(requestedButton()).toBeNull();
    expect(actionLabels()).toContain('Follow');
  });

  it('reads Requested while a request is pending', () => {
    render({ ...METADATA, isRequestedByMe: true });

    expect(requestedButton()?.textContent?.trim()).toBe('Requested');
    expect(actionLabels()).not.toContain('Follow');
  });

  it('withdraws the request when Requested is tapped', () => {
    const withdrawn: PublicUser[] = [];
    component.withdrawFollowRequestClick.subscribe((user) =>
      withdrawn.push(user),
    );
    render({ ...METADATA, isRequestedByMe: true });

    requestedButton()?.click();

    expect(withdrawn).toEqual([PRIVATE_USER]);
  });

  it('emits the follow click for the private profile, which the store turns into a request', () => {
    const followed: PublicUser[] = [];
    component.followButtonClick.subscribe((user) => followed.push(user));
    render(METADATA);

    component.onFollow();

    expect(followed).toEqual([PRIVATE_USER]);
  });

  it('shows Stop following once the request was accepted', () => {
    render({ ...METADATA, isFollowedByMe: true });

    expect(requestedButton()).toBeNull();
    expect(actionLabels()).toContain('Stop following');
  });
});
