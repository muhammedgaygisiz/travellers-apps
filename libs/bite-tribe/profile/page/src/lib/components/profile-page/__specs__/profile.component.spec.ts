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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('subscriptionTier', () => {
    describe('given no user', () => {
      it('should return 0', () => {
        compRef.setInput('user', undefined);

        expect(component.subscriptionTier()).toBe(0);
      });
    });

    describe('given a user without subscriptionTier', () => {
      it('should return 0', () => {
        compRef.setInput('user', {});

        expect(component.subscriptionTier()).toBe(0);
      });
    });

    describe('given a user with subscriptionTier 1', () => {
      it('should return 1', () => {
        compRef.setInput('user', { subscriptionTier: 1 });

        expect(component.subscriptionTier()).toBe(1);
      });
    });
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
      expect(nativeElement.querySelector('.subscription-badge')).toBeFalsy();
      expect(nativeElement.querySelector('.no-profile-message')).toBeFalsy();
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
      compRef.setInput('bites', bitesArray);

      expect(component.biteCount()).toBe(bitesArray.length);
    });

    it('should prefer the aggregate biteCount from the user document', () => {
      compRef.setInput('bites', [{}, {}, {}]);
      compRef.setInput('user', { biteCount: 42 });

      expect(component.biteCount()).toBe(42);
    });

    it('should fall back to the loaded bites when the user has no aggregate', () => {
      const bitesArray = [{}, {}];
      compRef.setInput('bites', bitesArray);
      compRef.setInput('user', {});

      expect(component.biteCount()).toBe(bitesArray.length);
    });
  });

  describe('biteTrailCount', () => {
    it('should return 0 if biteTrails is undefined', () => {
      compRef.setInput('biteTrails', undefined);

      expect(component.biteTrailCount()).toBe(0);
    });

    it('should return the length of biteTrails if biteTrails is defined', () => {
      const biteTrailsArray = [{}, {}, {}, {}];
      compRef.setInput('biteTrails', biteTrailsArray);

      expect(component.biteTrailCount()).toBe(biteTrailsArray.length);
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

  describe('displayedBiteTrails', () => {
    describe('given biteTrails', () => {
      it('should return the correct number of biteTrails based on currentPage', () => {
        const biteTrailsArray = new Array(120)
          .fill({})
          .map((_, i) => ({ id: i + 1 }));
        compRef.setInput('biteTrails', biteTrailsArray);
        component.currentPage.set(1);

        const displayed = component.displayedBiteTrails();

        expect(displayed.length).toBe(50);
        expect(displayed[0].id).toBe(1);
        expect(displayed[49].id).toBe(50);
      });
    });

    describe('given biteTrails are undefined', () => {
      it('should return an empty array', () => {
        compRef.setInput('biteTrails', undefined);

        const displayed = component.displayedBiteTrails();

        expect(displayed.length).toBe(0);
      });
    });
  });

  describe('emptyBitesMessage', () => {
    it('should show a placeholder when the user has no bites', () => {
      compRef.setInput('user', {
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

    it('should show a placeholder when the organisation has no Bite Trails', () => {
      compRef.setInput('user', {
        displayName: 'mo',
        isOrganisation: true,
        userId: 'user1',
      });
      compRef.setInput('biteTrails', []);

      fixture.detectChanges();

      const emptyBitesMessage = fixture.nativeElement.querySelector(
        '.empty-bites-message',
      ) as HTMLElement;

      expect(emptyBitesMessage.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'no-bite-trails-yet',
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

  describe('profile location', () => {
    it('should show displayName when present', () => {
      compRef.setInput('user', {
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

    it('should show only location placeholder when fullName and city are empty', () => {
      compRef.setInput('user', {
        displayName: 'mo',
        userId: 'user1',
      });

      fixture.detectChanges();

      const location = fixture.nativeElement.querySelector(
        '.profile-meta',
      ) as HTMLElement;

      expect(location.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'no-location',
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
});
