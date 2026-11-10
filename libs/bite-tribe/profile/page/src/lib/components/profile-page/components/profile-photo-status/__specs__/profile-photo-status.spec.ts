import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { ConnectionStatus } from '@capacitor/network';
import { NetworkStatusService } from 'common/networkstatus';
import {
  PENDING_UPLOAD_RECHECK_MS,
  STALE_PENDING_UPLOAD_MS,
} from 'bite-tribe-common/bite';
import { getIonicConfig } from 'utils';
import type { PublicUser } from 'model';
import { ProfilePhotoStatus } from '../profile-photo-status';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const user = (overrides: Partial<PublicUser> = {}): PublicUser =>
  ({ userId: 'u', photoUrl: 'old', ...overrides }) as PublicUser;

/** GitHub issue #1953. */
describe(ProfilePhotoStatus.name, () => {
  let fixture: ComponentFixture<ProfilePhotoStatus>;
  const networkStatus = signal<ConnectionStatus | undefined>(undefined);

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const render = (value: PublicUser): void => {
    fixture.componentRef.setInput('user', value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    networkStatus.set({ connected: true, connectionType: 'wifi' });

    await TestBed.configureTestingModule({
      imports: [ProfilePhotoStatus],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: NetworkStatusService, useValue: { status: networkStatus } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePhotoStatus);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows nothing for a photo with no upload going on', () => {
    render(user());

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows the upload in progress', () => {
    render(
      user({
        photoStatus: 'pending',
        photoUploadStartedAtTimestamp: Date.now(),
      }),
    );

    expect(query('profile-photo-pending')).not.toBeNull();
    expect(query('profile-photo-retry')).toBeNull();
  });

  it('offers a retry for a failed upload and asks for it once on a tap', () => {
    const retry = jest.fn();
    fixture.componentInstance.retryPhotoUpload.subscribe(retry);
    render(user({ photoStatus: 'failed' }));

    query('profile-photo-retry')?.querySelector('ion-button')?.click();

    expect(query('profile-photo-failed')).not.toBeNull();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('retries on a tap anywhere on the avatar', () => {
    const retry = jest.fn();
    fixture.componentInstance.retryPhotoUpload.subscribe(retry);
    render(user({ photoStatus: 'failed' }));

    query('profile-photo-failed')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('says what failed to a screen reader', () => {
    render(user({ photoStatus: 'failed' }));

    expect(query('profile-photo-failed')?.hasAttribute('aria-label')).toBe(
      true,
    );
  });

  it('says why there is no retry while offline', () => {
    networkStatus.set({ connected: false, connectionType: 'none' });
    render(user({ photoStatus: 'failed' }));

    expect(query('profile-photo-retry')).toBeNull();
    expect(query('profile-photo-retry-offline')).not.toBeNull();
  });

  it('turns an upload that is left pending into a failure on screen', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000_000);
    render(
      user({
        photoStatus: 'pending',
        photoUploadStartedAtTimestamp: Date.now(),
      }),
    );

    jest.setSystemTime(1_000_000_000 + STALE_PENDING_UPLOAD_MS);
    jest.advanceTimersByTime(PENDING_UPLOAD_RECHECK_MS);
    fixture.detectChanges();

    expect(query('profile-photo-failed')).not.toBeNull();
  });
});
