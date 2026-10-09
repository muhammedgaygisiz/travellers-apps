import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { Bite, PublicUser } from 'model';
import { getIonicConfig } from 'utils';
import { HapticsService } from 'haptics';
import { ProfileComponent } from '../profile.component';

/** Copied from `en.json`. */
const TRANSLATIONS: Translation = {
  block: 'Block',
  unblock: 'Unblock',
  'block-username': 'Block @{{username}}?',
  'block-confirmation-message':
    "You won't see their Bites, reviews or profile any more, and you'll stop following each other. They won't be told.",
  'you-blocked-this-account':
    'You blocked this account. Their Bites and reviews are hidden from you.',
};

@Injectable()
class BlockTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

const OTHER_USER: PublicUser = {
  userId: 'other',
  displayName: 'Alice',
  about: 'Loves ramen',
  email: '',
  photoUrl: '',
};

type AlertElement = HTMLElement & { header?: string; message?: string };

const MockHapticsService = {
  warning: jest.fn().mockResolvedValue(undefined),
};

/** GitHub issue #1609. */
describe(`${ProfileComponent.name} block`, () => {
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
          loader: BlockTranslocoLoader,
        }),
        { provide: HapticsService, useValue: MockHapticsService },
      ],
    });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('user', OTHER_USER);
    componentRef.setInput('userId', 'me');
    componentRef.setInput('bites', [{ id: 'bite-1', name: 'Ramen' } as Bite]);
    fixture.detectChanges();

    MockHapticsService.warning.mockClear();
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const byTestId = (id: string): HTMLElement | null =>
    element().querySelector(`[data-testid="${id}"]`);

  const queryAlerts = (): AlertElement[] => [
    ...element().querySelectorAll<AlertElement>('ion-alert'),
  ];

  describe('given the account is not blocked', () => {
    // Follow stays the one prominent action; Block is secondary.
    it('keeps Block out of the action row, beside Follow', () => {
      const actions = [
        ...element().querySelectorAll('.profile-actions ion-button'),
      ].map((button) => button.textContent?.trim());

      expect(actions).toEqual(['follow']);
      expect(byTestId('profile-unblock')).toBeNull();
    });

    it('offers Block from the header menu', () => {
      // Its accessible name is checked in `block-user.spec.ts` in a real
      // browser: `ion-button` moves `aria-label` into its shadow button.
      byTestId('profile-actions-menu')?.click();
      fixture.detectChanges();

      expect(component.isProfileActionsMenuOpen()).toBe(true);
    });

    it('asks for confirmation once the menu has closed after Block', () => {
      component.openProfileActionsMenu(new Event('click'));
      component.chooseBlockFromMenu();

      expect(component.isProfileActionsMenuOpen()).toBe(false);
      expect(component.isBlockConfirmationOpen()).toBe(false);

      component.handleProfileActionsMenuDismiss();

      expect(component.isBlockConfirmationOpen()).toBe(true);
    });

    it('asks nothing when the menu is dismissed without a choice', () => {
      component.openProfileActionsMenu(new Event('click'));
      component.handleProfileActionsMenuDismiss();

      expect(component.isBlockConfirmationOpen()).toBe(false);
    });

    it('does not offer the menu on the signed-in user’s own profile', () => {
      componentRef.setInput('userId', OTHER_USER.userId);
      fixture.detectChanges();

      expect(byTestId('profile-actions-menu')).toBeNull();
    });

    it('asks before blocking, naming the account', () => {
      component.openBlockConfirmationDialog();
      fixture.detectChanges();

      const [alert] = queryAlerts();

      expect(alert.header).toBe('Block @Alice?');
      expect(alert.message).toBe(TRANSLATIONS['block-confirmation-message']);
    });

    it('blocks the profile owner once the confirmation is accepted', () => {
      const blocked: PublicUser[] = [];
      component.blockButtonClick.subscribe((user) => blocked.push(user));

      component.openBlockConfirmationDialog();
      component.handleBlockConfirmationDismiss(
        new CustomEvent('didDismiss', { detail: { role: 'block' } }),
      );
      fixture.detectChanges();

      expect(blocked).toEqual([OTHER_USER]);
      expect(MockHapticsService.warning).toHaveBeenCalledTimes(1);
      expect(queryAlerts()).toHaveLength(0);
    });

    it('blocks nobody when the confirmation is cancelled', () => {
      const blocked: PublicUser[] = [];
      component.blockButtonClick.subscribe((user) => blocked.push(user));

      component.openBlockConfirmationDialog();
      component.handleBlockConfirmationDismiss(
        new CustomEvent('didDismiss', { detail: { role: 'cancel' } }),
      );

      expect(blocked).toEqual([]);
      expect(MockHapticsService.warning).not.toHaveBeenCalled();
    });
  });

  describe('given the account is blocked', () => {
    beforeEach(() => {
      componentRef.setInput('isBlocked', true);
      fixture.detectChanges();
    });

    it('shows none of its content', () => {
      expect(byTestId('profile-blocked')?.textContent?.trim()).toBe(
        TRANSLATIONS['you-blocked-this-account'],
      );
      expect(element().querySelector('bt-bite')).toBeNull();
      expect(element().textContent).not.toContain('Loves ramen');
    });

    it('offers unblocking instead of following or blocking', () => {
      expect(byTestId('profile-unblock')).not.toBeNull();
      expect(byTestId('profile-actions-menu')).toBeNull();
      const actions = [
        ...element().querySelectorAll('.profile-actions ion-button'),
      ].map((button) => button.textContent?.trim());

      expect(actions).toEqual(['Unblock']);
    });

    it('unblocks the profile owner straight away', () => {
      const unblocked: PublicUser[] = [];
      component.unblockButtonClick.subscribe((user) => unblocked.push(user));

      byTestId('profile-unblock')?.click();

      expect(unblocked).toEqual([OTHER_USER]);
    });
  });
});
