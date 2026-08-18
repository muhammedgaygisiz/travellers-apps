import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { PublicUser } from 'model';
import { getIonicConfig } from 'utils';
import { ProfileComponent } from '../profile.component';

/**
 * The two keys the followers list already uses for this dialog, copied from
 * `en.json`. The interpolation is the point: the profile page used to build
 * the sentence itself, so it read English in all eleven locales and dropped
 * the `@` the shared string puts in front of the name. See GitHub issue #1343.
 */
const TRANSLATIONS: Translation = {
  'stop-following': 'Stop following',
  'are-you-sure-you-want-to-stop-following-username':
    'Are you sure you want to stop following @{{username}}?',
};

@Injectable()
class DialogTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

const FOLLOWED_USER: PublicUser = {
  userId: 'other',
  displayName: 'Alice',
  email: '',
  photoUrl: '',
};

type AlertElement = HTMLElement & { header?: string; message?: string };

describe(`${ProfileComponent.name} unfollow dialog`, () => {
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
          loader: DialogTranslocoLoader,
        }),
      ],
    });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('user', FOLLOWED_USER);
    componentRef.setInput('userId', 'me');
    componentRef.setInput('profileMetadata', { isFollowedByMe: true });
    fixture.detectChanges();
  });

  const queryAlerts = (): AlertElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<AlertElement>(
      'ion-alert',
    ),
  ];

  it('should not create the alert before an unfollow is invoked', () => {
    expect(queryAlerts()).toHaveLength(0);
  });

  it('should create the alert once an unfollow is invoked', () => {
    component.openConfirmationDialog();
    fixture.detectChanges();

    expect(queryAlerts()).toHaveLength(1);
  });

  it('should ask the question in the active language, naming the account', () => {
    component.openConfirmationDialog();
    fixture.detectChanges();

    const [alert] = queryAlerts();

    expect(alert.header).toBe('Stop following');
    expect(alert.message).toBe(
      'Are you sure you want to stop following @Alice?',
    );
  });

  it('should drop the alert again once the confirmation is dismissed', () => {
    component.openConfirmationDialog();
    fixture.detectChanges();

    component.handleConfirmationDismiss(
      new CustomEvent('didDismiss', { detail: { role: 'cancel' } }),
    );
    fixture.detectChanges();

    expect(queryAlerts()).toHaveLength(0);
  });

  it('should unfollow the profile owner when the confirmation is accepted', () => {
    const unfollowed: PublicUser[] = [];
    component.unfollowButtonClick.subscribe((user) => unfollowed.push(user));

    component.openConfirmationDialog();
    fixture.detectChanges();

    component.handleConfirmationDismiss(
      new CustomEvent('didDismiss', { detail: { role: 'unfollow' } }),
    );
    fixture.detectChanges();

    expect(unfollowed).toEqual([FOLLOWED_USER]);
    expect(queryAlerts()).toHaveLength(0);
  });
});
