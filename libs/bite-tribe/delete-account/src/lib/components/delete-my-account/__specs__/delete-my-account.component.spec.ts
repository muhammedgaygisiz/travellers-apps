import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import { DeleteMyAccountComponent } from '../delete-my-account.component';

// A real Transloco instance rather than a stubbed service: the alert copy and
// the contract lists are the behaviour under test, so the keys have to resolve.
const en = {
  cancel: 'Cancel',
  password: 'Password',
  'delete-account': 'Delete Account',
  'delete-account-irreversible': 'Deleting your account cannot be undone.',
  'delete-account-kept-bites':
    'Your Bites stay on BiteTribe without your name.',
  'delete-account-removed-profile': 'Your profile, display name and photo',
  'delete-account-failed': 'We could not delete your account.',
  'delete-account-in-progress': 'Deleting your account...',
  'delete-account-confirm-title': 'Delete account?',
  'delete-account-confirm-delete': 'Delete account',
  'delete-account-reauth-title': "Confirm it's you",
};

interface AlertButton {
  role?: string;
  handler?: (value?: unknown) => unknown;
}

interface AlertOptions {
  header?: string;
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

      expect(emitted).toEqual([{}]);
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

    it('emits the typed password', async () => {
      const emitted: unknown[] = [];
      component.deleteAccount.subscribe((request) => emitted.push(request));

      await component.promptForPassword();

      const destructive = presentedAlerts[0].buttons.find(
        (button) => button.role === 'destructive',
      );

      expect(destructive?.handler?.({ password: '' })).toBe(false);
      expect(emitted).toEqual([]);

      expect(destructive?.handler?.({ password: 'hunter2' })).toBe(true);
      expect(emitted).toEqual([{ password: 'hunter2' }]);
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
      ),
    ).toBeTruthy();
  });
});
