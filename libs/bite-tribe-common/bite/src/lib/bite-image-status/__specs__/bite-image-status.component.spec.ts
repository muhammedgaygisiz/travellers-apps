import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Bite } from 'model';
import { BiteImageStatusComponent } from '../bite-image-status.component';
import { STALE_PENDING_UPLOAD_MS } from '../../utils/image-status';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteImageStatusComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteImageStatusComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  const querySpinner = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('ion-spinner');
  const queryFailed = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="bite-image-failed"]');

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
