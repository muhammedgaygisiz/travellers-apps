import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FollowersListComponent } from '../followers-list.component';
import { PublicUser } from 'model';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(FollowersListComponent.name, () => {
  let component: FollowersListComponent;
  let fixture: ComponentFixture<FollowersListComponent>;
  let componentRef: ComponentRef<FollowersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FollowersListComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FollowersListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run the header progress bar while the spinner shows', () => {
    componentRef.setInput('type', 'followers');
    componentRef.setInput('users', []);
    componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();

    componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeFalsy();
  });

  describe('given the list could not be read', () => {
    // An unreadable list is not an empty one: "no followers yet" would state
    // something untrue about the account. See GitHub issue #1232.
    it('should report the failure instead of claiming there are none', () => {
      componentRef.setInput('type', 'followers');
      componentRef.setInput('users', []);
      componentRef.setInput('isLoading', false);
      componentRef.setInput('hasError', true);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="followers-error-message"]',
        ),
      ).toBeTruthy();
    });

    it('should offer the read again', () => {
      jest.spyOn(component.retryClick, 'emit');
      componentRef.setInput('type', 'followers');
      componentRef.setInput('users', []);
      componentRef.setInput('isLoading', false);
      componentRef.setInput('hasError', true);
      fixture.detectChanges();

      fixture.nativeElement
        .querySelector('[data-testid="followers-error-retry"]')
        .click();

      expect(component.retryClick.emit).toHaveBeenCalled();
    });

    it('should say nothing when the read simply came back empty', () => {
      componentRef.setInput('type', 'followers');
      componentRef.setInput('users', []);
      componentRef.setInput('isLoading', false);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="followers-error-message"]',
        ),
      ).toBeNull();
    });
  });

  describe('toggleTitleText', () => {
    it('should return "Followers" when type is followers', () => {
      componentRef.setInput('type', 'followers');
      expect(component.toggleTitleText()).toBe('followers');
    });

    it('should return "Following" when type is following', () => {
      componentRef.setInput('type', 'following');
      expect(component.toggleTitleText()).toBe('following');
    });
  });

  describe('openConfirmationDialog', () => {
    const mockUser: PublicUser = {
      userId: 'user123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoUrl: 'photo.jpg',
    };

    it('should hold the row being confirmed and stop event propagation', () => {
      const mockEvent = { stopPropagation: jest.fn() } as {
        stopPropagation: jest.Mock;
      };
      component.openConfirmationDialog(mockEvent, mockUser);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.userPendingUnfollow()).toBe(mockUser);
    });
  });

  describe('handleConfirmationDismiss', () => {
    const mockUser: PublicUser = {
      userId: 'user123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoUrl: 'photo.jpg',
    };

    it('should call unfollow and release the pending row when role is unfollow', () => {
      const mockEvent = {
        detail: { role: 'unfollow' },
      } as CustomEvent<{ role: string }>;
      const unfollowSpy = jest.spyOn(component, 'unfollow');

      component.handleConfirmationDismiss(mockEvent, mockUser);

      expect(unfollowSpy).toHaveBeenCalledWith(mockUser);
      expect(component.userPendingUnfollow()).toBeUndefined();
    });

    it('should only release the pending row when role is cancel', () => {
      const mockEvent = {
        detail: { role: 'cancel' },
      } as CustomEvent<{ role: string }>;
      const unfollowSpy = jest.spyOn(component, 'unfollow');

      component.handleConfirmationDismiss(mockEvent, mockUser);

      expect(unfollowSpy).not.toHaveBeenCalled();
      expect(component.userPendingUnfollow()).toBeUndefined();
    });
  });

  // A per-row alert bound to one shared boolean opened every row at once, and
  // the topmost — the last row's — is the one the user answered. See issue
  // #1334.
  describe('given a Following list the signed-in user owns', () => {
    const following: PublicUser[] = [
      {
        userId: 'user1',
        displayName: 'Alice',
        email: '',
        photoUrl: '',
        public: true,
      },
      {
        userId: 'user2',
        displayName: 'Bob',
        email: '',
        photoUrl: '',
        public: true,
      },
      {
        userId: 'user3',
        displayName: 'Charlie',
        email: '',
        photoUrl: '',
        public: true,
      },
    ];

    const queryAlerts = (): HTMLElement[] => [
      ...fixture.nativeElement.querySelectorAll('ion-alert'),
    ];

    const queryUnfollowButtons = (): HTMLElement[] => [
      ...fixture.nativeElement.querySelectorAll('ion-item ion-button'),
    ];

    beforeEach(() => {
      componentRef.setInput('type', 'following');
      componentRef.setInput('users', following);
      componentRef.setInput('loggedInUserId', 'me');
      componentRef.setInput('profileOwnerid', 'me');
      fixture.detectChanges();
    });

    it('should not carry a confirmation for any row up front', () => {
      expect(queryUnfollowButtons()).toHaveLength(3);
      expect(queryAlerts()).toHaveLength(0);
    });

    it('should open exactly one confirmation when a row is clicked', () => {
      queryUnfollowButtons()[0].click();
      fixture.detectChanges();

      expect(queryAlerts()).toHaveLength(1);
    });

    it('should unfollow the account whose row was clicked', () => {
      const unfollowed: string[] = [];
      component.unfollowClick.subscribe((user) =>
        unfollowed.push(user.displayName),
      );

      // Alice sorts first, so hers is the first row.
      queryUnfollowButtons()[0].click();
      fixture.detectChanges();

      queryAlerts()[0].dispatchEvent(
        new CustomEvent('didDismiss', { detail: { role: 'unfollow' } }),
      );
      fixture.detectChanges();

      expect(unfollowed).toEqual(['Alice']);
      expect(queryAlerts()).toHaveLength(0);
    });

    // The alert's message is built from this user, so a wrong one here is the
    // wrong name in front of the reader.
    it('should hold the account whose row was clicked, not the last row', () => {
      queryUnfollowButtons()[1].click();
      fixture.detectChanges();

      expect(component.userPendingUnfollow()?.displayName).toBe('Bob');
    });
  });

  describe('unfollow', () => {
    it('should emit unfollowClick when user is provided', () => {
      const mockUser: PublicUser = {
        userId: 'user123',
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
      };
      const emitSpy = jest.spyOn(component.unfollowClick, 'emit');

      component.unfollow(mockUser);

      expect(emitSpy).toHaveBeenCalledWith(mockUser);
    });

    it('should not emit unfollowClick when user is null', () => {
      const emitSpy = jest.spyOn(component.unfollowClick, 'emit');

      component.unfollow(null as unknown as PublicUser);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('input properties', () => {
    it('should accept users input', () => {
      const mockUsers: PublicUser[] = [
        {
          userId: 'user1',
          displayName: 'User 1',
          email: 'user1@example.com',
          photoUrl: 'photo1.jpg',
        },
      ];
      componentRef.setInput('users', mockUsers);
      expect(component.users()).toEqual(mockUsers);
    });

    it('should accept type input', () => {
      componentRef.setInput('type', 'followers');
      expect(component.type()).toBe('followers');
    });

    it('should accept loggedInUserId input', () => {
      componentRef.setInput('loggedInUserId', 'current-user-id');
      expect(component.loggedInUserId()).toBe('current-user-id');
    });

    it('should accept isLoading input', () => {
      componentRef.setInput('isLoading', true);
      expect(component.isLoading()).toBe(true);
    });
  });

  describe('sortedUsers', () => {
    it('should return users sorted by displayName', () => {
      const mockUsers: PublicUser[] = [
        { userId: 'user1', displayName: 'Charlie', email: '', photoUrl: '' },
        { userId: 'user2', displayName: 'Alice', email: '', photoUrl: '' },
        { userId: 'user3', displayName: 'Bob', email: '', photoUrl: '' },
      ];
      componentRef.setInput('users', mockUsers);
      expect(component.sortedUsers().map((u) => u.displayName)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
    });

    it('should return empty array when users is undefined', () => {
      componentRef.setInput('users', undefined);
      expect(component.sortedUsers()).toEqual([]);
    });

    it('should not mutate the original users input', () => {
      const mockUsers: PublicUser[] = [
        { userId: 'user1', displayName: 'Charlie', email: '', photoUrl: '' },
        { userId: 'user2', displayName: 'Alice', email: '', photoUrl: '' },
      ];
      componentRef.setInput('users', mockUsers);
      component.sortedUsers();
      expect(component.users()?.map((u) => u.displayName)).toEqual([
        'Charlie',
        'Alice',
      ]);
    });
  });

  describe('confirmationButtons', () => {
    it('should have Cancel and Yes, unfollow buttons', () => {
      expect(component.confirmationButtons).toEqual([
        { text: 'cancel', role: 'cancel' },
        { text: 'yes-unfollow', role: 'unfollow' },
      ]);
    });
  });

  describe('defaultHref', () => {
    it('should point to my-profile', () => {
      expect(component.defaultHref).toBe('/my-profile');
    });
  });

  describe('onImageError', () => {
    it('should add userId to imageErroredUserIds set', () => {
      component.onImageError('user123');
      expect(component.imageErroredUserIds().has('user123')).toBe(true);
    });

    it('should add multiple userIds to imageErroredUserIds set', () => {
      component.onImageError('user1');
      component.onImageError('user2');
      expect(component.imageErroredUserIds().has('user1')).toBe(true);
      expect(component.imageErroredUserIds().has('user2')).toBe(true);
    });
  });
});
