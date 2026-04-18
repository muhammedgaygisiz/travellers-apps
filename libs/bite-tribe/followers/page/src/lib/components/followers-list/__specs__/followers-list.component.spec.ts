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
    it('should set isOpen to true and stop event propagation', () => {
      const mockEvent = { stopPropagation: jest.fn() } as {
        stopPropagation: jest.Mock;
      };
      component.openConfirmationDialog(mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isOpen()).toBe(true);
    });
  });

  describe('handleConfirmationDismiss', () => {
    const mockUser: PublicUser = {
      userId: 'user123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoUrl: 'photo.jpg',
    };

    it('should call unfollow and set isOpen to false when role is unfollow', () => {
      const mockEvent = {
        detail: { role: 'unfollow' },
      } as CustomEvent<{ role: string }>;
      const unfollowSpy = jest.spyOn(component, 'unfollow');

      component.handleConfirmationDismiss(mockEvent, mockUser);

      expect(unfollowSpy).toHaveBeenCalledWith(mockUser);
      expect(component.isOpen()).toBe(false);
    });

    it('should only set isOpen to false when role is cancel', () => {
      const mockEvent = {
        detail: { role: 'cancel' },
      } as CustomEvent<{ role: string }>;
      const unfollowSpy = jest.spyOn(component, 'unfollow');

      component.handleConfirmationDismiss(mockEvent, mockUser);

      expect(unfollowSpy).not.toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
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
});
