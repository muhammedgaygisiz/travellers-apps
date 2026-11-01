import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { PublicUser, USER_REPORT_REASONS, UserReportReason } from 'model';
import { getIonicConfig } from 'utils';
import { HapticsService } from 'haptics';
import { ProfileComponent } from '../profile.component';

/** Copied from `en.json`. */
const TRANSLATIONS: Translation = {
  'report-profile': 'Report',
  'report-profile-title': 'Report @{{username}}?',
  'report-profile-message':
    'Why should we look at this profile? They are not told who reported them.',
  'report-profile-reason-harassment': 'Harassment or hate',
  'report-profile-reason-impersonation': 'Pretending to be someone else',
  'report-profile-reason-spam': 'Spam or advertising',
  'report-profile-reason-inappropriate': 'Offensive or inappropriate',
  'report-profile-reason-other': 'Something else',
  'report-profile-submit': 'Report',
};

@Injectable()
class ReportTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

const OTHER_USER: PublicUser = {
  userId: 'other',
  displayName: 'Alice',
  email: '',
  photoUrl: '',
};

type AlertElement = HTMLElement & { header?: string; message?: string };

const dismissal = (
  role: string,
  values?: UserReportReason,
): CustomEvent<{ role: string; data: { values?: UserReportReason } }> =>
  new CustomEvent('didDismiss', { detail: { role, data: { values } } });

/** GitHub issue #1829. */
describe(`${ProfileComponent.name} report`, () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let componentRef: ComponentRef<ProfileComponent>;
  let reports: { user: PublicUser; reason: UserReportReason }[];

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
          loader: ReportTranslocoLoader,
        }),
        { provide: HapticsService, useValue: { warning: jest.fn() } },
      ],
    });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('user', OTHER_USER);
    componentRef.setInput('userId', 'me');
    fixture.detectChanges();

    reports = [];
    component.reportProfile.subscribe((report) => reports.push(report));
  });

  const queryAlerts = (): AlertElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<AlertElement>(
      'ion-alert',
    ),
  ];

  it('offers Report on somebody else’s profile', () => {
    expect(component.canReport()).toBe(true);
    expect(component.showProfileActionsMenu()).toBe(true);
  });

  it('does not offer Report on the signed-in user’s own profile', () => {
    componentRef.setInput('userId', OTHER_USER.userId);
    fixture.detectChanges();

    expect(component.canReport()).toBe(false);
    expect(component.showProfileActionsMenu()).toBe(false);
  });

  it('does not offer Report to a signed-out reader', () => {
    componentRef.setInput('userId', undefined);
    fixture.detectChanges();

    expect(component.canReport()).toBe(false);
  });

  it('still offers Report once the account is blocked', () => {
    componentRef.setInput('isBlocked', true);
    fixture.detectChanges();

    expect(component.canReport()).toBe(true);
    expect(component.showProfileActionsMenu()).toBe(true);
  });

  it('asks why once the menu has closed after Report', () => {
    component.openProfileActionsMenu(new Event('click'));
    component.chooseReportFromMenu();

    expect(component.isReportDialogOpen()).toBe(false);

    component.handleProfileActionsMenuDismiss();

    expect(component.isReportDialogOpen()).toBe(true);
    expect(component.isBlockConfirmationOpen()).toBe(false);
  });

  it('names the account and says it is not told who reported it', () => {
    component.openReportDialog();
    fixture.detectChanges();

    const [alert] = queryAlerts();

    expect(alert.header).toBe('Report @Alice?');
    expect(alert.message).toBe(TRANSLATIONS['report-profile-message']);
  });

  it('offers every reason, impersonation included and Not food left out', () => {
    component.openReportDialog();

    expect(component.reportReasonInputs().map(({ value }) => value)).toEqual([
      ...USER_REPORT_REASONS,
    ]);
  });

  // A profile opened cold is built before the translations arrive.
  it('translates the reasons when the dialog opens, not when the page is built', () => {
    expect(component.reportReasonInputs()).toEqual([]);

    component.openReportDialog();

    expect(component.reportReasonInputs().map(({ label }) => label)).toContain(
      'Pretending to be someone else',
    );
  });

  it('keeps the dialog open until a reason is picked', () => {
    component.openReportDialog();
    const submit = component
      .reportButtons()
      .find(({ role }) => role === 'report');

    expect(submit?.handler?.(undefined)).toBe(false);
    expect(submit?.handler?.('spam')).toBe(true);
  });

  it('reports the profile with the reason picked', () => {
    component.openReportDialog();
    component.handleReportDialogDismiss(dismissal('report', 'harassment'));
    fixture.detectChanges();

    expect(reports).toEqual([{ user: OTHER_USER, reason: 'harassment' }]);
    expect(queryAlerts()).toHaveLength(0);
  });

  it('reports nothing when the dialog is cancelled', () => {
    component.openReportDialog();
    component.handleReportDialogDismiss(dismissal('cancel', 'harassment'));

    expect(reports).toEqual([]);
    expect(component.isReportDialogOpen()).toBe(false);
  });
});
