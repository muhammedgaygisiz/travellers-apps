import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from '../profile.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let compRef: ComponentRef<ProfileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  const renderedHeadlineCount = (): string | undefined =>
    (fixture.nativeElement as HTMLElement)
      .querySelector('[data-testid="profile-headline-count"]')
      ?.textContent?.trim();

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Nothing is for sale yet, so no tier badge shows at any subscriptionTier (#1878).
  describe('subscription tier', () => {
    it.each([undefined, 0, 1, 2])(
      'renders no tier badge for subscriptionTier %s',
      (subscriptionTier) => {
        compRef.setInput('user', {
          displayName: 'Mo',
          userId: 'user123',
          subscriptionTier,
        });
        compRef.setInput('userId', 'user123');
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('.profile-display-name')).not.toBeNull();
        expect(element.querySelector('ion-badge')).toBeNull();
        expect(element.textContent).not.toMatch(/\b(FREE|PRO|ULTRA)\b/);
      },
    );
  });

  describe('followerCount', () => {
    it('should return 0 if followers is 0', () => {
      compRef.setInput('profileMetadata', { followers: 0 });

      expect(component.followerCount()).toBe(0);
    });

    it('should return the length of followers if followers is defined', () => {
      compRef.setInput('profileMetadata', { followers: 3 });

      expect(component.followerCount()).toBe(3);
    });
  });

  describe('followingCount', () => {
    it('should return 0 if following is 0', () => {
      compRef.setInput('profileMetadata', { following: 0 });

      expect(component.followingCount()).toBe(0);
    });

    it('should return the length of following if following is defined', () => {
      compRef.setInput('profileMetadata', { following: 5 });

      expect(component.followingCount()).toBe(5);
    });
  });

  describe('showSkeleton', () => {
    it('should show the skeleton while loading without a profile', () => {
      compRef.setInput('isLoading', true);
      compRef.setInput('user', undefined);

      expect(component.showSkeleton()).toBe(true);
    });

    it('should keep the loaded profile visible while it reloads', () => {
      compRef.setInput('isLoading', true);
      compRef.setInput('user', { displayName: 'Mo' });

      expect(component.showSkeleton()).toBe(false);
    });

    it('should not show the skeleton when loading finished without a profile', () => {
      compRef.setInput('isLoading', false);
      compRef.setInput('user', undefined);

      expect(component.showSkeleton()).toBe(false);
    });

    it('should render the skeleton instead of the profile fields while loading', () => {
      compRef.setInput('isLoading', true);
      compRef.setInput('user', undefined);

      fixture.detectChanges();

      const nativeElement = fixture.nativeElement as HTMLElement;

      expect(nativeElement.querySelector('profile-skeleton')).toBeTruthy();
      expect(nativeElement.querySelector('.no-profile-message')).toBeFalsy();
    });

    it('should run the header progress bar while the skeleton shows', () => {
      compRef.setInput('isLoading', true);
      compRef.setInput('user', undefined);

      fixture.detectChanges();

      const nativeElement = fixture.nativeElement as HTMLElement;

      expect(nativeElement.querySelector('profile-skeleton')).toBeTruthy();
      expect(
        nativeElement.querySelector('[data-testid="page-loading-bar"]'),
      ).toBeTruthy();
    });

    it('should render the not-available message when loading finished without a profile', () => {
      compRef.setInput('isLoading', false);
      compRef.setInput('user', undefined);

      fixture.detectChanges();

      const nativeElement = fixture.nativeElement as HTMLElement;

      expect(nativeElement.querySelector('profile-skeleton')).toBeFalsy();
      expect(nativeElement.querySelector('.no-profile-message')).toBeTruthy();
    });
  });

  describe('biteCount', () => {
    it('should return 0 if bites is undefined', () => {
      compRef.setInput('bites', undefined);

      expect(component.biteCount()).toBe(0);
    });

    it('should return the length of bites if bites is defined', () => {
      const bitesArray = [{}, {}, {}];
      compRef.setInput('user', { public: true });
      compRef.setInput('bites', bitesArray);

      expect(component.biteCount()).toBe(bitesArray.length);
    });

    it('should prefer the aggregate biteCount from the user document', () => {
      compRef.setInput('bites', [{}, {}, {}]);
      compRef.setInput('user', { public: true, biteCount: 42 });

      expect(component.biteCount()).toBe(42);
    });

    it('should fall back to the loaded bites when the user has no aggregate', () => {
      const bitesArray = [{}, {}];
      compRef.setInput('bites', bitesArray);
      compRef.setInput('user', { public: true });

      expect(component.biteCount()).toBe(bitesArray.length);
    });

    // The header used to report an aggregate that predated the user's own
    // write, next to a list that already showed the new Bite (issue #1310).
    it('should render the count the store hands it', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'Mo',
        biteCount: 3,
      });
      compRef.setInput('bites', [{}, {}, {}]);

      fixture.detectChanges();

      expect(renderedHeadlineCount()).toBe('3');
    });

    it('should never render fewer bites than the list under it shows', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'Mo',
        biteCount: 2,
      });
      compRef.setInput('bites', [{}, {}, {}]);

      fixture.detectChanges();

      expect(renderedHeadlineCount()).toBe('3');
    });

    it('should keep the aggregate when the list is a paginated subset', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'Mo',
        biteCount: 120,
      });
      compRef.setInput('bites', [{}, {}, {}]);

      fixture.detectChanges();

      expect(renderedHeadlineCount()).toBe('120');
    });
  });

  describe('displayedBites', () => {
    describe('given bites', () => {
      it('should return the correct number of bites based on currentPage', () => {
        const bitesArray = new Array(150)
          .fill({})
          .map((_, i) => ({ id: i + 1 }));
        compRef.setInput('bites', bitesArray);
        component.currentPage.set(2);

        const displayed = component.displayedBites();

        expect(displayed.length).toBe(100);
        expect(displayed[0].id).toBe(1);
        expect(displayed[49].id).toBe(50);
      });
    });

    describe('given bites are undefined', () => {
      it('should return an empty array', () => {
        compRef.setInput('bites', undefined);

        const displayed = component.displayedBites();

        expect(displayed.length).toBe(0);
      });
    });
  });

  describe('emptyBitesMessage', () => {
    it('should show a placeholder when the user has no bites', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        userId: 'user1',
      });
      compRef.setInput('bites', []);

      fixture.detectChanges();

      const emptyBitesMessage = fixture.nativeElement.querySelector(
        '.empty-bites-message',
      ) as HTMLElement;

      expect(emptyBitesMessage.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'no-bites-yet',
      );
    });
  });

  describe('isUnfollowedUser', () => {
    const userMock = { userId: 'user1' };
    beforeEach(() => {
      compRef.setInput('user', userMock);
      compRef.setInput('userId', userMock.userId);
    });

    it('should return false if current user is me', () => {
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return true if current user in not me', () => {
      compRef.setInput('userId', 'user2');
      expect(component.isUnfollowedUser()).toBe(true);
    });

    it('should return false if profile owner in not defined', () => {
      compRef.setInput('user', undefined);
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return false if profile owners userId in not defined', () => {
      compRef.setInput('user', {});
      expect(component.isUnfollowedUser()).toBe(false);
    });
  });

  describe('profile visibility', () => {
    const queryVisibility = (): HTMLElement | null => {
      return fixture.nativeElement.querySelector('profile-visibility');
    };

    it('should show the visibility status on the own profile', () => {
      compRef.setInput('user', { userId: 'user1', public: true });
      compRef.setInput('userId', 'user1');

      fixture.detectChanges();

      expect(component.showVisibilityStatus()).toBe(true);
      expect(queryVisibility()).toBeTruthy();
    });

    it('should not show the visibility status on another user profile', () => {
      compRef.setInput('user', { userId: 'user1', public: true });
      compRef.setInput('userId', 'user2');

      fixture.detectChanges();

      expect(component.showVisibilityStatus()).toBe(false);
      expect(queryVisibility()).toBeNull();
    });

    it('should not show the visibility status without a signed-in user', () => {
      compRef.setInput('user', { userId: 'user1', public: true });
      compRef.setInput('userId', undefined);

      fixture.detectChanges();

      expect(component.isOwnProfile()).toBe(false);
      expect(queryVisibility()).toBeNull();
    });

    it('should emit gotoEditProfile when the visibility status is activated', () => {
      compRef.setInput('user', { userId: 'user1', public: false });
      compRef.setInput('userId', 'user1');
      const gotoEditProfileSpy = jest.spyOn(component.gotoEditProfile, 'emit');

      fixture.detectChanges();

      const status = fixture.nativeElement.querySelector(
        '[data-testid="profile-visibility"]',
      ) as HTMLButtonElement;
      status.click();

      expect(gotoEditProfileSpy).toHaveBeenCalled();
    });
  });

  describe('profile location', () => {
    it('should show displayName when present', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const displayName = fixture.nativeElement.querySelector(
        '.profile-display-name',
      ) as HTMLElement;

      expect(displayName.textContent?.replace(/\s+/g, ' ').trim()).toBe('mo');
    });

    it('should show displayName placeholder when displayName is not present', () => {
      compRef.setInput('user', {
        public: true,
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const displayName = fixture.nativeElement.querySelector(
        '.profile-display-name',
      ) as HTMLElement;

      expect(displayName.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'no-display-name',
      );
    });

    it('should show fullName before city separated by a comma', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        fullName: 'Muhammed Gaygisiz',
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Muhammed Gaygisiz, Zurich',
      );
    });

    it('should show only city when fullName is not present', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe('Zurich');
    });

    // An account created through onboarding carries its display name in
    // `fullName`, so the meta line repeated the heading. See GitHub issue
    // #1270.
    it('should show only city when fullName repeats the display name', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'run5mo',
        fullName: 'run5mo',
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe('Zurich');
    });

    it('should treat a fullName differing only in case as a repeat', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        fullName: ' Mo ',
        city: 'Zurich',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe('Zurich');
    });

    it('should show nothing when fullName repeats the display name and no city is known', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'run5mo',
        fullName: 'run5mo',
        userId: 'user1',
      });

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.profile-meta')).toBeNull();
    });

    // The placeholder announced missing data for a city the app never asked
    // the user for. See GitHub issue #1270.
    it('should show no location placeholder when fullName and city are empty', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        userId: 'user1',
      });

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.profile-meta')).toBeNull();
    });

    it('should still show a real name that differs from the display name', () => {
      compRef.setInput('user', {
        public: true,
        displayName: 'mo',
        fullName: 'Muhammed Gaygisiz',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Muhammed Gaygisiz',
      );
    });
  });

  describe('onFollow', () => {
    it('should emit followClick with user when user is defined', () => {
      const userMock = { userId: 'user1' };
      compRef.setInput('user', userMock);
      const followClickSpy = jest.spyOn(component.followButtonClick, 'emit');

      component.onFollow();

      expect(followClickSpy).toHaveBeenCalledWith(userMock);
    });

    it('should not emit followClick when user is undefined', () => {
      compRef.setInput('user', undefined);
      const followClickSpy = jest.spyOn(component.followButtonClick, 'emit');

      component.onFollow();

      expect(followClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('unfollow', () => {
    it('should emit unfollowClick with user when user is defined', () => {
      const userMock = { userId: 'user1' };
      compRef.setInput('user', userMock);
      const unfollowClickSpy = jest.spyOn(
        component.unfollowButtonClick,
        'emit',
      );

      component.unfollow();

      expect(unfollowClickSpy).toHaveBeenCalledWith(userMock);
    });

    it('should not emit unfollowClick when user is undefined', () => {
      compRef.setInput('user', undefined);
      const unfollowClickSpy = jest.spyOn(
        component.unfollowButtonClick,
        'emit',
      );

      component.unfollow();

      expect(unfollowClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('openConfirmationDialog', () => {
    it('should set isOpen to true', () => {
      component.isOpen.set(false);
      component.openConfirmationDialog();
      expect(component.isOpen()).toBe(true);
    });
  });

  describe('handleConfirmationDismiss', () => {
    it('should call unfollow and set isOpen to false when role is UNFOLLOW', () => {
      const unfollowSpy = jest.spyOn(component, 'unfollow');
      component.isOpen.set(true);

      const event = new CustomEvent('dismiss', {
        detail: { role: 'unfollow' },
      });

      component.handleConfirmationDismiss(event);

      expect(unfollowSpy).toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
    });

    it('should set isOpen to false when role is not UNFOLLOW', () => {
      const unfollowSpy = jest.spyOn(component, 'unfollow');
      component.isOpen.set(true);

      const event = new CustomEvent('dismiss', {
        detail: { role: 'CANCEL' },
      });

      component.handleConfirmationDismiss(event);

      expect(unfollowSpy).not.toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('onIonInfinite', () => {
    it('should increment currentPage by 1 and complete the event', () => {
      component.currentPage.set(1);
      const completeSpy = jest.fn();

      const event = {
        target: {
          complete: completeSpy,
        },
      } as unknown as Parameters<ProfileComponent['onIonInfinite']>[0];

      component.onIonInfinite(event);

      expect(component.currentPage()).toBe(2);
      expect(completeSpy).toHaveBeenCalled();
    });
  });
  /** GitHub issue #1787. */
  describe('pronouns (issue #1826)', () => {
    const renderedPronouns = (): string | undefined => {
      fixture.detectChanges();

      return (fixture.nativeElement as HTMLElement)
        .querySelector('[data-testid="profile-pronouns"]')
        ?.textContent?.trim();
    };

    it('shows them after the display name on a public profile', () => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        public: true,
        pronouns: 'they/them',
      });

      expect(renderedPronouns()).toBe('they/them');
    });

    it('shows nothing in their place on a public profile without them', () => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        public: true,
      });

      expect(renderedPronouns()).toBeUndefined();
    });

    it('does not expose them to another account on a private profile', () => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        public: false,
        pronouns: 'she/her',
      });

      expect(renderedPronouns()).toBeUndefined();
    });

    it('treats a profile with no saved visibility as private', () => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        pronouns: 'she/her',
      });

      expect(renderedPronouns()).toBeUndefined();
    });

    it('shows the owner their own pronouns on a private profile', () => {
      compRef.setInput('userId', 'owner');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        public: false,
        pronouns: 'he/they',
      });

      expect(renderedPronouns()).toBe('he/they');
    });

    it('shows nothing for pronouns that are only spaces', () => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', {
        userId: 'owner',
        displayName: 'Mo',
        public: true,
        pronouns: '   ',
      });

      expect(renderedPronouns()).toBeUndefined();
    });
  });

  describe("another account's private profile (issue #1863)", () => {
    const standIn = {
      userId: 'owner',
      public: false,
      displayName: '',
      email: '',
      photoUrl: '',
    };

    beforeEach(() => {
      compRef.setInput('userId', 'viewer');
      compRef.setInput('user', standIn);
      compRef.setInput('bites', [{ id: 'bite1' }]);
      fixture.detectChanges();
    });

    it('names it anonymous and says it is private', () => {
      const element = fixture.nativeElement as HTMLElement;

      // The heading translates through the pipe, which the mocked service
      // leaves empty; the block and report dialogs name it by this.
      expect(component.displayName()).toBe('anonymous');
      expect(
        element.querySelector('[data-testid="profile-private"]'),
      ).not.toBeNull();
    });

    it('shows none of its Bites, flags or about', () => {
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('bt-bite')).toBeNull();
      expect(element.querySelector('country-flags')).toBeNull();
      expect(element.querySelector('.profile-about')).toBeNull();
      expect(component.biteCount()).toBe(0);
    });

    it('withholds what a private profile says even if it reaches the page', () => {
      compRef.setInput('user', {
        ...standIn,
        fullName: 'Real Name',
        city: 'Zurich',
        about: 'About me',
        countryCodes: ['AT'],
        biteCount: 4,
      });
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).not.toContain('Real Name');
      expect(text).not.toContain('Zurich');
      expect(text).not.toContain('About me');
      expect(component.biteCount()).toBe(0);
    });

    it('still shows its owner everything', () => {
      compRef.setInput('userId', 'owner');
      compRef.setInput('user', { ...standIn, about: 'About me' });
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;

      expect(
        element.querySelector('[data-testid="profile-private"]'),
      ).toBeNull();
      expect(element.querySelector('.profile-about')?.textContent).toContain(
        'About me',
      );
      expect(element.querySelector('bt-bite')).not.toBeNull();
    });
  });

  describe('the weekly top-3 badges (issue #2031)', () => {
    const badges = (): HTMLElement[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.weekly-badge',
        ),
      );

    it('shows one button per list, This week first, coloured by place', () => {
      compRef.setInput('user', {
        public: true,
        userId: 'u1',
        weeklyBadges: [
          { board: 'mostLiked', place: 3, week: '2026-11-09' },
          { board: 'thisWeek', place: 1, week: '2026-11-09' },
        ],
      });
      fixture.detectChanges();

      expect(badges().map((b) => b.dataset['testid'])).toEqual([
        'profile-weekly-badge-thisWeek',
        'profile-weekly-badge-mostLiked',
      ]);
      expect(badges()[0].classList).toContain('weekly-badge--gold');
      expect(badges()[1].classList).toContain('weekly-badge--bronze');
    });

    it('opens the list a badge was won on', () => {
      const opened: string[] = [];
      component.weeklyBadgeClick.subscribe((board) => opened.push(board));
      compRef.setInput('user', {
        public: true,
        userId: 'u1',
        weeklyBadges: [{ board: 'mostLiked', place: 2, week: '2026-11-09' }],
      });
      fixture.detectChanges();

      badges()[0].click();

      expect(opened).toEqual(['mostLiked']);
    });

    it('shows no badge row without a badge', () => {
      compRef.setInput('user', { public: true, userId: 'u1' });
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="profile-weekly-badges"]',
        ),
      ).toBeNull();
    });
  });

  describe('the show on globe button', () => {
    const button = (): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="profile-show-on-globe"]',
      );

    it('should show the button for a profile with countries', () => {
      compRef.setInput('user', {
        public: true,
        userId: 'u1',
        countryCodes: ['AT'],
      });
      fixture.detectChanges();

      expect(button()).not.toBeNull();
    });

    it('should hide the button for a profile without countries', () => {
      compRef.setInput('user', {
        public: true,
        userId: 'u1',
        countryCodes: [' ', ''],
      });
      fixture.detectChanges();

      expect(button()).toBeNull();
    });

    it("should hand on the profile's user id when tapped", () => {
      const opened: string[] = [];

      component.worldClick.subscribe((userId) => opened.push(userId));
      compRef.setInput('user', {
        public: true,
        userId: 'u1',
        countryCodes: ['AT'],
      });
      fixture.detectChanges();
      button()?.click();

      expect(opened).toEqual(['u1']);
    });
  });
});
