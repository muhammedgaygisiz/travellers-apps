import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { NetworkStatusService } from 'common/networkstatus';
import type { ConnectionStatus } from '@capacitor/network';
import type { Bite } from 'model';
import { BiteImageStatusComponent } from '../bite-image-status.component';
import {
  PENDING_UPLOAD_RECHECK_MS,
  STALE_PENDING_UPLOAD_MS,
} from '../../utils/image-status';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const bite = (overrides: Partial<Bite> = {}): Bite =>
  ({
    id: 'bite1',
    name: 'Pizza',
    image: '',
    place: 'Trattoria',
    price: 12,
    createdAtTimestamp: Date.now(),
    ...overrides,
  }) as Bite;

describe(BiteImageStatusComponent.name, () => {
  let component: BiteImageStatusComponent;
  let fixture: ComponentFixture<BiteImageStatusComponent>;
  let componentRef: ComponentRef<BiteImageStatusComponent>;
  // Undefined until the first Capacitor read resolves, which is the state the
  // component is created in on a real device.
  const networkStatus = signal<ConnectionStatus | undefined>(undefined);

  beforeEach(async () => {
    networkStatus.set({ connected: true, connectionType: 'wifi' });

    await TestBed.configureTestingModule({
      imports: [BiteImageStatusComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        {
          provide: NetworkStatusService,
          useValue: { status: networkStatus },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteImageStatusComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const querySpinner = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('ion-spinner');
  const queryFailed = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="bite-image-failed"]');
  const queryRetryButton = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="bite-image-retry"]');
  const queryOfflineHint = (): HTMLElement | null =>
    fixture.nativeElement.querySelector(
      '[data-testid="bite-image-retry-offline"]',
    );

  // The template renders the message through TranslocoPipe, which resolves to
  // an empty string against the mocked service, so the key is asserted at the
  // source instead of in the DOM.
  const pendingTextKey = (): string => component['pendingTextKey']();

  describe('pending', () => {
    it('should show the uploading state', () => {
      componentRef.setInput('bite', bite({ imageStatus: 'pending' }));
      fixture.detectChanges();

      expect(querySpinner()).toBeTruthy();
      expect(queryFailed()).toBeNull();
    });

    it('should tell the poster to keep the app open', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'pending', userId: 'user1' }),
      );
      componentRef.setInput('userId', 'user1');

      expect(pendingTextKey()).toBe('uploading-keep-app-open');
    });

    it('should not tell other users to keep their app open for someone else’s upload', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'pending', userId: 'someone-else' }),
      );
      componentRef.setInput('userId', 'user1');

      expect(pendingTextKey()).toBe('loading-photo');
    });

    it('should show the neutral wait message to a signed-out viewer', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'pending', userId: 'someone-else' }),
      );
      componentRef.setInput('userId', undefined);

      expect(pendingTextKey()).toBe('loading-photo');
    });
  });

  describe('failed', () => {
    it('should show the failed state', () => {
      componentRef.setInput('bite', bite({ imageStatus: 'failed' }));
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(querySpinner()).toBeNull();
    });

    it('should give up on a pending upload that goes stale while it is on screen', () => {
      jest.useFakeTimers();
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'pending', createdAtTimestamp: Date.now() }),
      );
      fixture.detectChanges();

      expect(querySpinner()).toBeTruthy();

      jest.advanceTimersByTime(
        STALE_PENDING_UPLOAD_MS + PENDING_UPLOAD_RECHECK_MS,
      );
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(querySpinner()).toBeNull();
    });

    it('should read an abandoned pending upload as failed', () => {
      componentRef.setInput(
        'bite',
        bite({
          imageStatus: 'pending',
          createdAtTimestamp: Date.now() - STALE_PENDING_UPLOAD_MS,
        }),
      );
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(querySpinner()).toBeNull();
    });
  });

  describe('retry', () => {
    const setUpFailedOwnBite = (): void => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'failed', userId: 'user1' }),
      );
      componentRef.setInput('userId', 'user1');
      componentRef.setInput('enableRetry', true);
      fixture.detectChanges();
    };

    it('should offer the retry to the poster', () => {
      setUpFailedOwnBite();

      expect(queryRetryButton()).toBeTruthy();
    });

    it('should ask the surface to retry rather than acting itself', () => {
      setUpFailedOwnBite();
      const emitted: Bite[] = [];
      component.retryImageUpload.subscribe((value) => emitted.push(value));

      queryRetryButton()?.click();

      expect(emitted).toEqual([expect.objectContaining({ id: 'bite1' })]);
    });

    it('should not offer the retry where the surface cannot handle it', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'failed', userId: 'user1' }),
      );
      componentRef.setInput('userId', 'user1');
      fixture.detectChanges();

      expect(queryRetryButton()).toBeNull();
    });

    it('should not offer the retry to another user', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'failed', userId: 'someone-else' }),
      );
      componentRef.setInput('userId', 'user1');
      componentRef.setInput('enableRetry', true);
      fixture.detectChanges();

      expect(queryRetryButton()).toBeNull();
    });

    describe('while the device reports no connection', () => {
      const goOffline = (): void => {
        networkStatus.set({ connected: false, connectionType: 'none' });
        fixture.detectChanges();
      };

      it('should say so instead of offering a retry that cannot work', () => {
        setUpFailedOwnBite();
        goOffline();

        expect(queryRetryButton()).toBeNull();
        expect(queryOfflineHint()).toBeTruthy();
      });

      it('should still say the upload failed', () => {
        setUpFailedOwnBite();
        goOffline();

        expect(queryFailed()).toBeTruthy();
      });

      it('should offer the retry again once the connection is back', () => {
        setUpFailedOwnBite();
        goOffline();

        networkStatus.set({ connected: true, connectionType: 'cellular' });
        fixture.detectChanges();

        expect(queryRetryButton()).toBeTruthy();
        expect(queryOfflineHint()).toBeNull();
      });

      it('should keep the hint to the poster, who is the only one offered a retry', () => {
        componentRef.setInput(
          'bite',
          bite({ imageStatus: 'failed', userId: 'someone-else' }),
        );
        componentRef.setInput('userId', 'user1');
        componentRef.setInput('enableRetry', true);
        goOffline();

        expect(queryOfflineHint()).toBeNull();
      });
    });

    it('should offer the retry while the connection is still unknown', () => {
      // Nothing has reported yet on a cold start. An unknown connection is not
      // an absent one, so the poster keeps the button. See GitHub issue #1390.
      networkStatus.set(undefined);
      setUpFailedOwnBite();

      expect(queryRetryButton()).toBeTruthy();
      expect(queryOfflineHint()).toBeNull();
    });

    it('should not offer the retry while the upload is still pending', () => {
      componentRef.setInput(
        'bite',
        bite({ imageStatus: 'pending', userId: 'user1' }),
      );
      componentRef.setInput('userId', 'user1');
      componentRef.setInput('enableRetry', true);
      fixture.detectChanges();

      expect(queryRetryButton()).toBeNull();
    });
  });

  it.each(['uploaded', undefined] as const)(
    'should render nothing for a %s image',
    (imageStatus) => {
      componentRef.setInput('bite', bite({ imageStatus }));
      fixture.detectChanges();

      expect(querySpinner()).toBeNull();
      expect(queryFailed()).toBeNull();
    },
  );
});
