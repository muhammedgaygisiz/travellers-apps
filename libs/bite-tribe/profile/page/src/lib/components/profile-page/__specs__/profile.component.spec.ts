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
        compRef.setInput('user', {} as any);

        expect(component.subscriptionTier()).toBe(0);
      });
    });

    describe('given a user with subscriptionTier 1', () => {
      it('should return 1', () => {
        compRef.setInput('user', { subscriptionTier: 1 } as any);

        expect(component.subscriptionTier()).toBe(1);
      });
    });
  });

  describe('followerCount', () => {
    it('should return 0 if followers is 0', () => {
      compRef.setInput('profileMetadata', { followers: 0 } as any);

      expect(component.followerCount()).toBe(0);
    });

    it('should return the length of followers if followers is defined', () => {
      compRef.setInput('profileMetadata', { followers: 3 } as any);

      expect(component.followerCount()).toBe(3);
    });
  });

  describe('followingCount', () => {
    it('should return 0 if following is 0', () => {
      compRef.setInput('profileMetadata', { following: 0 } as any);

      expect(component.followingCount()).toBe(0);
    });

    it('should return the length of following if following is defined', () => {
      compRef.setInput('profileMetadata', { following: 5 } as any);

      expect(component.followingCount()).toBe(5);
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

  describe('isUnfollowedUser', () => {
    const userMock = { userId: 'user1' } as any;
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
      compRef.setInput('user', {} as any);
      expect(component.isUnfollowedUser()).toBe(false);
    });
  });

  describe('onFollow', () => {
    it('should emit followClick with user when user is defined', () => {
      const userMock = { userId: 'user1' } as any;
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
      const userMock = { userId: 'user1' } as any;
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
      } as any;

      component.onIonInfinite(event);

      expect(component.currentPage()).toBe(2);
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
