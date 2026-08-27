import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import type { DeleteAccountIdentity } from 'bite-tribe/account-data-access';
import { DeleteMyAccountComponent } from '../delete-my-account.component';

// A real Transloco instance rather than a stubbed service: the alert copy and
// the contract lists are the behaviour under test, so the keys have to resolve.
const en = {
  cancel: 'Cancel',
  password: 'Password',
  'no-display-name': 'No display name',
  'delete-account': 'Delete Account',
  'delete-account-irreversible': 'Deleting your account cannot be undone.',
  'delete-account-kept-bites':
    'Your Bites stay on BiteTribe without your name.',
  'delete-account-removed-profile': 'Your profile, display name and photo',
  'delete-account-failed': 'We could not delete your account.',
  'delete-account-account-changed': 'The signed-in account changed.',
  'delete-account-reauth-failed': 'We could not confirm it was you.',
  'delete-account-in-progress': 'Deleting your account...',
  'delete-account-confirm-title': 'Delete account?',
  'delete-account-confirm-delete': 'Delete account',
  'delete-account-reauth-title': "Confirm it's you",
  'delete-account-identity-title': 'Account to be deleted',
  'delete-account-identity-method-password':
    'Signed in with email and password',
  'delete-account-identity-method-google': 'Signed in with Google',
  'delete-account-identity-method-apple': 'Signed in with Apple',
  'delete-account-identity-method-unknown': 'Signed in with a linked account',
  'delete-account-identity-unavailable': 'No account is signed in.',
};

const passwordAccount: DeleteAccountIdentity = {
  uid: 'user-1',
  displayName: 'Mia Fernandes',
  email: 'mia@example.com',
  photoUrl: '',
  signInMethod: 'password',
};

interface AlertButton {
  role?: string;
  handler?: (value?: unknown) => unknown;
}

interface AlertOptions {
  header?: string;
  subHeader?: string;
  buttons: AlertButton[];
  inputs?: unknown[];
}

describe(DeleteMyAccountComponent.name, () => {
  let component: DeleteMyAccountComponent;
  let fixture: ComponentFixture<DeleteMyAccountComponent>;
  let compRef: ComponentRef<DeleteMyAccountComponent>;
  let presentedAlerts: AlertOptions[];
  const present = jest.fn();

  beforeEach(() => {
    presentedAlerts = [];
    present.mockReset().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideIonicAngular(getIonicConfig()),
        {
          provide: AlertController,
          useValue: {
            create: jest.fn((options: AlertOptions) => {
              presentedAlerts.push(options);

              return Promise.resolve({ present });
            }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DeleteMyAccountComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    compRef.setInput('identity', passwordAccount);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('names both what is deleted and what is kept', () => {
    const removed = fixture.nativeElement.querySelector(
      '[data-testid="delete-account-removed"]',
    );
    const kept = fixture.nativeElement.querySelector(
      '[data-testid="delete-account-kept"]',
    );

    expect(removed).toBeTruthy();
    expect(kept).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Your Bites stay on BiteTribe without your name.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Your profile, display name and photo',
    );
  });

  describe('the account being deleted', () => {
    it('names the signed-in account before the destructive action', () => {
      const identity = fixture.nativeElement.querySelector(
        '[data-testid="delete-account-identity"]',
      );

      expect(identity.textContent).toContain('Mia Fernandes');
      expect(identity.textContent).toContain('mia@example.com');
      expect(identity.textContent).toContain(
        'Signed in with email and password',
      );
    });

    it.each([
      ['google', 'Signed in with Google'],
      ['apple', 'Signed in with Apple'],
    ] as const)('names the %s sign-in method', (signInMethod, label) => {
      compRef.setInput('identity', {
        ...passwordAccount,
        email: '',
        signInMethod,
      });
      fixture.detectChanges();

      const identity = fixture.nativeElement.querySelector(
        '[data-testid="delete-account-identity"]',
      );

      expect(identity.textContent).toContain(label);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="delete-account-identity-email"]',
        ),
      ).toBeNull();
    });

    it('falls back to the generic avatar when the photo does not load', () => {
      compRef.setInput('identity', {
        ...passwordAccount,
        photoUrl: 'https://example.com/broken.jpg',
      });
      fixture.detectChanges();

      const image = fixture.nativeElement.querySelector(
        '[data-testid="delete-account-identity"] img',
      );

      expect(image).toBeTruthy();

      image.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="delete-account-identity"] img',
        ),
      ).toBeNull();
    });

    it('offers no deletion while no account is signed in', async () => {
      const emitted: unknown[] = [];
      component.deleteAccount.subscribe((request) => emitted.push(request));

      compRef.setInput('identity', null);
      fixture.detectChanges();

      const submit = fixture.nativeElement.querySelector(
        '[data-testid="delete-account-submit"]',
      );

      expect(submit.disabled).toBe(true);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="delete-account-identity-missing"]',
        ),
      ).toBeTruthy();

      await component.confirmDelete();

      expect(present).not.toHaveBeenCalled();
      expect(emitted).toEqual([]);
    });
  });

  describe('confirmDelete', () => {
    it('asks for an explicit destructive confirmation before emitting', async () => {
      const emitted: unknown[] = [];
      component.deleteAccount.subscribe((request) => emitted.push(request));

      await component.confirmDelete();

      expect(present).toHaveBeenCalled();
      expect(emitted).toEqual([]);

      const destructive = presentedAlerts[0].buttons.find(
        (button) => button.role === 'destructive',
      );
      destructive?.handler?.();

      expect(emitted).toEqual([{ uid: 'user-1' }]);
    });

    it('repeats the account in the final confirmation', async () => {
      await component.confirmDelete();

      expect(presentedAlerts[0].subHeader).toBe(
        'Mia Fernandes · mia@example.com',
      );
    });

    it('names the sign-in method when the provider withholds the email', async () => {
      compRef.setInput('identity', {
        ...passwordAccount,
        email: '',
        displayName: '',
        signInMethod: 'apple',
      });
      fixture.detectChanges();

      await component.confirmDelete();

      expect(presentedAlerts[0].subHeader).toBe(
        'No display name · Signed in with Apple',
      );
    });

    it('offers a cancel option', async () => {
      await component.confirmDelete();

      expect(
        presentedAlerts[0].buttons.some((button) => button.role === 'cancel'),
      ).toBe(true);
    });
  });

  describe('password prompt', () => {
    it('opens automatically when the flow needs a fresh sign-in', async () => {
      compRef.setInput('passwordRequired', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(presentedAlerts[0].header).toBe("Confirm it's you");
      expect(presentedAlerts[0].inputs).toHaveLength(1);
    });

    it('names the account the password belongs to', async () => {
      await component.promptForPassword();

      expect(presentedAlerts[0].subHeader).toBe(
        'Mia Fernandes · mia@example.com',
      );
    });

    it('emits the typed password with the confirmed account', async () => {
      const emitted: unknown[] = [];
      component.deleteAccount.subscribe((request) => emitted.push(request));

      await component.promptForPassword();

      const destructive = presentedAlerts[0].buttons.find(
        (button) => button.role === 'destructive',
      );

      expect(destructive?.handler?.({ password: '' })).toBe(false);
      expect(emitted).toEqual([]);

      expect(destructive?.handler?.({ password: 'hunter2' })).toBe(true);
      expect(emitted).toEqual([{ uid: 'user-1', password: 'hunter2' }]);
    });
  });

  it('disables the actions while the deletion runs', () => {
    compRef.setInput('deleting', true);
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '[data-testid="delete-account-submit"]',
    );
    const progress = fixture.nativeElement.querySelector(
      '[data-testid="delete-account-progress"]',
    );

    expect(submit.disabled).toBe(true);
    expect(progress).toBeTruthy();
  });

  it('shows the failure message when the deletion failed', () => {
    compRef.setInput('failed', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="delete-account-error"]',
      ).textContent,
    ).toContain('We could not delete your account.');
  });

  // The generic copy tells the user to try again; after a refused sign-in that
  // is an instruction to repeat something that fails the same way.
  it('says so when the re-authentication was refused', () => {
    compRef.setInput('failed', true);
    compRef.setInput('failure', 'reauth-failed');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="delete-account-error"]',
      ).textContent,
    ).toContain('We could not confirm it was you.');
  });

  it('says so when the deletion was refused because the account changed', () => {
    compRef.setInput('failed', true);
    compRef.setInput('failure', 'account-changed');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="delete-account-error"]',
      ).textContent,
    ).toContain('The signed-in account changed.');
  });
});
