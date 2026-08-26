import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPage } from '../details.page';
import { PageComponent } from 'common/ui/page';
import { ReactiveFormsModule } from '@angular/forms';
import {
  AlertButton,
  AlertController,
  PopoverController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ToBlobUrlPipe } from 'image-compression';
import { addNecessaryIcons } from 'utils';
import { AppLauncher } from '@capacitor/app-launcher';
import { Platform } from '@ionic/angular';
import type { Bite, PublicUser } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { TranslocoPipe } from '@jsverse/transloco';

@Pipe({ name: 'toBlobUrl' })
class MockToBlobUrlPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  static calls: string[] = [];

  transform(value: string): string {
    MockTranslocoPipe.calls.push(value);
    return value;
  }
}

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn((): string => 'en'),
  load: jest.fn(() => of({})),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

/**
 * Lets a failure report run to completion. Reporting waits for the active
 * language before it writes the alert, so a single microtask tick is not enough
 * to reach the presented overlay.
 */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Properly mock the AppLauncher module
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: {
    canOpenUrl: jest.fn(),
  },
}));

describe('DetailsPage', () => {
  let component: DetailsPage;
  let fixture: ComponentFixture<DetailsPage>;
  let componentRef: ComponentRef<DetailsPage>;
  let platform: Platform;
  let alertController: AlertController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        ReactiveFormsModule,
        PageComponent,
        DetailsPage,
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(DetailsPage, {
        remove: { imports: [ToBlobUrlPipe, TranslocoPipe] },
        add: { imports: [MockToBlobUrlPipe, MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DetailsPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    platform = TestBed.inject(Platform);
    alertController = TestBed.inject(AlertController);
    fixture.detectChanges();
    MockTranslocoPipe.calls = [];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default review threads', () => {
    expect(component.reviewThreads()).toMatchSnapshot();
  });

  describe('Image viewer', () => {
    it('opens the viewer with the photo that was tapped', () => {
      componentRef.setInput('bite', {
        id: '1',
        name: 'Pizza',
        image: 'dish.jpg',
      } as Bite);
      componentRef.changeDetectorRef.detectChanges();

      fixture.nativeElement
        .querySelector('[data-testid="dish-image-button"]')
        .click();

      expect(component.viewerImages()).toEqual([
        { src: 'dish.jpg', alt: 'Dish Image' },
      ]);
    });

    it('offers no action, since the page already is the Bite', () => {
      component.openImageViewer('dish.jpg');

      expect(component.viewerImages()[0].actionLabel).toBeUndefined();
    });

    it('closes on request', () => {
      component.openImageViewer('dish.jpg');

      component.closeImageViewer();

      expect(component.viewerImages()).toEqual([]);
    });
  });

  describe('Deleted Bite', () => {
    /**
     * Ionic mounts alerts on the app root, so the page only ever holds a handle
     * to one. The handle is what the page presents and, on teardown, dismisses.
     */
    const alertStub = (): { present: jest.Mock; dismiss: jest.Mock } => ({
      present: jest.fn(),
      dismiss: jest.fn().mockResolvedValue(true),
    });

    it('blocks the page with a dismissal-proof alert offering the way back', async () => {
      const alert = alertStub();
      const present = alert.present;
      let created: Parameters<AlertController['create']>[0] | undefined;
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async (options) => {
          created = options;
          return alert as never;
        });
      jest.spyOn(component.goBack, 'emit');

      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(present).toHaveBeenCalled();
      expect(created?.backdropDismiss).toBe(false);
      expect(created?.buttons).toHaveLength(1);

      (created?.buttons as { handler?: () => void }[])[0].handler?.();
      expect(component.goBack.emit).toHaveBeenCalled();
    });

    it('offers the read again as well as the way back when it simply failed', async () => {
      // A timeout, a rejected permission or an App Check refusal says nothing
      // about whether the Bite exists, so unlike a deleted one it is worth
      // retrying. Without this the page had no answer at all. See #1232.
      const alert = alertStub();
      const present = alert.present;
      let created: Parameters<AlertController['create']>[0] | undefined;
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async (options) => {
          created = options;
          return alert as never;
        });
      jest.spyOn(component.retryLoad, 'emit');
      jest.spyOn(component.goBack, 'emit');

      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(present).toHaveBeenCalled();
      expect(created?.backdropDismiss).toBe(false);

      const buttons = created?.buttons as {
        text?: string;
        handler?: () => void;
      }[];
      expect(buttons).toHaveLength(2);

      buttons[0].handler?.();
      expect(component.goBack.emit).toHaveBeenCalled();

      buttons[1].handler?.();
      expect(component.retryLoad.emit).toHaveBeenCalled();
    });

    it('reports a failed read again once the retry fails again', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alertStub() as never);

      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      // The retry puts the read back in flight before it fails again.
      componentRef.setInput('biteUnavailable', false);
      componentRef.changeDetectorRef.detectChanges();
      await settle();
      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(create).toHaveBeenCalledTimes(2);
    });

    it('reports a missing Bite once, not on every check', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alertStub() as never);

      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('still reaches the screen when the read fails again mid-report', async () => {
      // A cold start onto a Bite - a tapped notification, a shared link - reads
      // twice, so the page can give up, recover and give up again while one
      // report is still running. The second failure used to find the
      // single-flight guard closed, and the page then said nothing at all,
      // which is the silence issue #1232 was raised to end.
      let finishDismiss!: () => void;
      const abandoned = {
        present: jest.fn(),
        dismiss: jest.fn(
          () =>
            new Promise<boolean>((resolve) => {
              finishDismiss = (): void => resolve(true);
            }),
        ),
      };
      const presented = alertStub();
      jest
        .spyOn(alertController, 'create')
        .mockImplementationOnce(async () => abandoned as never)
        .mockImplementation(async () => presented as never);

      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();

      // The read is in flight again before the first report has an alert to
      // show, so that report is abandoned while it takes its alert down.
      componentRef.setInput('biteUnavailable', false);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(abandoned.dismiss).toHaveBeenCalled();

      // It fails again while that teardown is still running.
      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      finishDismiss();
      await settle();

      expect(presented.present).toHaveBeenCalled();
    });

    it('reports the branch the read settled on, not the one it dropped', async () => {
      // The dropped report named the branch it was raised for. A retry can
      // settle on the other one, so what finally reaches the screen has to be
      // the failure the page is on now.
      let finishDismiss!: () => void;
      const abandoned = {
        present: jest.fn(),
        dismiss: jest.fn(
          () =>
            new Promise<boolean>((resolve) => {
              finishDismiss = (): void => resolve(true);
            }),
        ),
      };
      const presented = alertStub();
      const create = jest
        .spyOn(alertController, 'create')
        .mockImplementationOnce(async () => abandoned as never)
        .mockImplementation(async () => presented as never);

      componentRef.setInput('biteUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();

      componentRef.setInput('biteUnavailable', false);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      // This time the read comes back saying the Bite is gone for good.
      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      finishDismiss();
      await settle();

      expect(presented.present).toHaveBeenCalled();

      const buttons = create.mock.calls[1][0]?.buttons as unknown[];
      expect(buttons).toHaveLength(1);
    });

    it('takes the alert down with the page it belongs to', async () => {
      // The alert lives on the app root, not in the page, so a route change
      // leaves it on screen over the page navigated back to, where its
      // dismissal-proof backdrop swallows every tap. See #1304.
      const alert = alertStub();
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alert as never);

      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();
      expect(alert.present).toHaveBeenCalled();

      fixture.destroy();
      await settle();

      expect(alert.dismiss).toHaveBeenCalled();
    });

    it('never presents an alert the destroyed page could no longer take down', async () => {
      // A destruction landing between creating the alert and presenting it
      // would otherwise leak the very overlay the teardown is there to remove.
      const alert = alertStub();
      let releaseCreate: () => void = () => undefined;
      jest.spyOn(alertController, 'create').mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseCreate = (): void => resolve(alert as never);
          }),
      );

      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      fixture.destroy();
      releaseCreate();
      await settle();
      await settle();

      expect(alert.present).not.toHaveBeenCalled();
      expect(alert.dismiss).toHaveBeenCalled();
    });

    it('presents one alert at a time, so a re-read cannot stack a second', async () => {
      // While the page tears down its inputs settle back to undefined and then
      // re-read as the same failure, which used to reach presentation a second
      // time while the first alert was still being created. Two stacked alerts
      // need two presses of the same action to clear. See #1304.
      const alert = alertStub();
      let releaseCreate: () => void = () => undefined;
      const create = jest.spyOn(alertController, 'create').mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseCreate = (): void => resolve(alert as never);
          }),
      );

      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      // The inputs settle and the failure re-reads, all before the first alert
      // exists.
      componentRef.setInput('biteNotFound', false);
      componentRef.changeDetectorRef.detectChanges();
      componentRef.setInput('biteNotFound', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      releaseCreate();
      await settle();
      await settle();

      expect(create).toHaveBeenCalledTimes(1);
      expect(alert.present).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bite Display', () => {
    const actionTestIds = [
      'bite-details-share',
      'bite-details-navigation',
      'bite-details-bucket-list',
    ];

    const setLoadedBite = (): void => {
      componentRef.setInput('bite', { id: '1', name: 'Pizza' } as Bite);
      componentRef.changeDetectorRef.detectChanges();
    };

    it.each(actionTestIds)(
      'exposes %s as a coach-mark anchor once the bite is loaded',
      (testId) => {
        setLoadedBite();

        expect(
          fixture.nativeElement.querySelector(`[data-testid="${testId}"]`),
        ).toBeTruthy();
      },
    );

    it.each(actionTestIds)('hides %s while the bite is loading', (testId) => {
      expect(
        fixture.nativeElement.querySelector(`[data-testid="${testId}"]`),
      ).toBeFalsy();
    });

    it('shows a placeholder for each hidden action while the bite is loading', () => {
      const iconSkeletons = fixture.nativeElement.querySelectorAll(
        'ion-skeleton-text.icon-skeleton',
      );

      expect(iconSkeletons.length).toBe(actionTestIds.length);
    });

    it('runs the header progress bar while the skeletons show', () => {
      expect(
        fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
      ).toBeTruthy();

      setLoadedBite();

      expect(
        fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
      ).toBeFalsy();
    });

    it('does not expose the restaurant link while the bite is loading', () => {
      expect(
        fixture.nativeElement.querySelector('.restaurant-distance .link'),
      ).toBeFalsy();
    });

    // The separator and the distance placeholder used to survive every guard
    // on this line, so a page with no Bite still rendered "· -".
    describe('place and distance line', () => {
      const readLine = (): string =>
        (
          fixture.nativeElement.querySelector(
            '.restaurant-distance',
          ) as HTMLElement
        ).textContent
          ?.replace(/\s+/g, ' ')
          .trim() ?? '';

      const readerPosition = {
        coords: { latitude: 46.9, longitude: 7.4 },
      } as unknown as GeolocationPosition;

      it('stays empty while the bite is loading', () => {
        componentRef.setInput('position', readerPosition);
        componentRef.changeDetectorRef.detectChanges();

        expect(readLine()).toBe('');
      });

      it('stays empty for a bite with neither a place nor a position', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          place: '',
        } as Bite);
        componentRef.setInput('position', readerPosition);
        componentRef.changeDetectorRef.detectChanges();

        expect(readLine()).toBe('');
      });

      it('shows the place alone when the reader has no position', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          place: 'Einstein au Jardin',
          position: { latitude: 46.9, longitude: 7.4 },
        } as Bite);
        componentRef.setInput('position', undefined);
        componentRef.changeDetectorRef.detectChanges();

        expect(readLine()).toBe('Einstein au Jardin');
      });

      it('shows the place alone when the bite has no position', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          place: 'Einstein au Jardin',
        } as Bite);
        componentRef.setInput('position', readerPosition);
        componentRef.changeDetectorRef.detectChanges();

        expect(readLine()).toBe('Einstein au Jardin');
      });

      it('joins the place and the distance when both are known', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          place: 'Einstein au Jardin',
          position: { latitude: 46.9, longitude: 7.4 },
        } as Bite);
        componentRef.setInput('position', readerPosition);
        componentRef.changeDetectorRef.detectChanges();

        expect(readLine()).toBe('Einstein au Jardin · 0.00 km');
      });
    });

    // Read-only, an empty tag list is a heading over nothing: no tags to read
    // and no way to add any.
    describe('tags', () => {
      const tagList = (): HTMLElement | null =>
        fixture.nativeElement.querySelector('bt-tags-input');

      it('hides the tag list for a bite without tags', () => {
        componentRef.setInput('bite', { id: '1', name: 'Pizza' } as Bite);
        componentRef.changeDetectorRef.detectChanges();

        expect(tagList()).toBeNull();
      });

      it('hides the tag list for a bite with an empty tag array', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          tags: [],
        } as unknown as Bite);
        componentRef.changeDetectorRef.detectChanges();

        expect(tagList()).toBeNull();
      });

      it('hides the tag list while the bite is loading', () => {
        expect(tagList()).toBeNull();
      });

      it('shows the tag list for a bite that has tags', () => {
        componentRef.setInput('bite', {
          id: '1',
          name: 'Pizza',
          tags: ['halal'],
        } as unknown as Bite);
        componentRef.changeDetectorRef.detectChanges();

        expect(tagList()).not.toBeNull();
      });
    });

    it('should show a review field skeleton while bite is loading', () => {
      const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

      const reviewSkeleton = nativeElement.querySelector(
        'ion-skeleton-text.review-field-skeleton',
      );
      const reviewField = nativeElement.querySelector(
        'ion-textarea[formControlName="review"]',
      );

      expect(reviewSkeleton).toBeTruthy();
      expect(reviewField).toBeFalsy();
    });

    it('should display bite details when bite input is provided', () => {
      // Arrange
      const mockBite = {
        id: '1',
        name: 'Pizza',
        place: 'Italian Restaurant',
        price: 12.99,
        imagePath: 'test.jpg',
        tags: ['italian', 'pizza'],
      };

      // Act
      componentRef.setInput('bite', mockBite);
      componentRef.changeDetectorRef.detectChanges();

      // Assert
      const content = fixture.debugElement.nativeElement.textContent;
      expect(content).toContain('Pizza');
      expect(content).toContain('Italian Restaurant');
    });

    it('should render localized edit button for own bite', () => {
      componentRef.setInput('bite', { id: '1', name: 'Pizza' } as Bite);
      componentRef.setInput('biteCreator', { userId: 'user-1' } as PublicUser);
      componentRef.setInput('userId', 'user-1');
      componentRef.changeDetectorRef.detectChanges();

      const editButton = fixture.debugElement.nativeElement.querySelector(
        'ion-button.ion-margin-top.safe-padding-bottom',
      );

      expect(editButton).toBeTruthy();
      expect(MockTranslocoPipe.calls).toContain('edit-bite');
    });

    // A Bite whose creator deleted their account keeps the Bite but has no
    // creator, so it must render exactly like a private user's Bite: no author
    // row, and no owner actions.
    it('should hide the creator row and owner actions when the bite has no creator', () => {
      componentRef.setInput('bite', { id: '1', name: 'Pizza' } as Bite);
      componentRef.setInput('biteCreator', undefined);
      componentRef.setInput('userId', 'user-1');
      componentRef.changeDetectorRef.detectChanges();

      const creatorRow = fixture.debugElement.nativeElement.querySelector(
        '.bite-creator-container',
      );
      const editButton = fixture.debugElement.nativeElement.querySelector(
        'ion-button.ion-margin-top.safe-padding-bottom',
      );

      expect(creatorRow).toBeFalsy();
      expect(editButton).toBeFalsy();
    });

    it('should hide the creator row for a private creator', () => {
      componentRef.setInput('bite', { id: '1', name: 'Pizza' } as Bite);
      componentRef.setInput('biteCreator', {
        userId: 'user-2',
        public: false,
      } as PublicUser);
      componentRef.changeDetectorRef.detectChanges();

      expect(
        fixture.debugElement.nativeElement.querySelector(
          '.bite-creator-container',
        ),
      ).toBeFalsy();
    });
  });

  describe('Review Form', () => {
    it('should initialize with empty review field', () => {
      expect(component.reviewFormGroup.get('review')?.value).toBe('');
    });

    it('should be invalid when review field is empty', () => {
      component.reviewFormGroup.patchValue({ review: '' });
      expect(component.isReviewFieldInvalid()).toBe(true);
    });

    it('should be valid when review field has value', () => {
      component.reviewFormGroup.patchValue({ review: 'Great food!' });
      expect(component.isReviewFieldInvalid()).toBe(false);
    });

    it('should emit review and reset form on saveReview when bite exists', () => {
      // Arrange
      const mockBite = { id: '123', name: 'Pizza' };
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      componentRef.setInput('bite', mockBite);
      component.reviewFormGroup.patchValue({ review: 'Great food!' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith({
        review: 'Great food!',
        biteId: '123',
      });
      expect(component.reviewFormGroup.get('review')?.value).toBe('');
    });

    it('should not emit review when form is invalid', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      component.reviewFormGroup.patchValue({ review: '' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit review when bite id is missing', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.submitNewReview, 'emit');
      componentRef.setInput('bite', undefined);
      component.reviewFormGroup.patchValue({ review: 'Great food!' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('saveReply', () => {
    const reply = {
      review: 'Thanks!',
      parentReviewId: 'root-1',
      threadId: 'root-1',
    };

    it('adds the Bite on screen to the answer the thread raised', () => {
      const emitSpy = jest.spyOn(component.submitReviewReply, 'emit');
      componentRef.setInput('bite', { id: '123', name: 'Pizza' });

      component.saveReply(reply);

      expect(emitSpy).toHaveBeenCalledWith({ ...reply, biteId: '123' });
    });

    it('sends nothing while the Bite is not loaded, since it names the target', () => {
      const emitSpy = jest.spyOn(component.submitReviewReply, 'emit');
      componentRef.setInput('bite', undefined);

      component.saveReply(reply);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('isBucketlistBite', () => {
    it('should return true if bite is in any bucketlist', () => {
      const mockBite = { id: '1', name: 'Pizza' };
      const mockBucketlists = [
        { id: 'list1', name: 'List 1', biteIds: ['1'] },
        { id: 'list2', name: 'List 2', biteIds: [] },
      ];

      componentRef.setInput('bite', mockBite);
      componentRef.setInput('bucketlists', mockBucketlists);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isBucketlistBite()).toBe(true);
    });

    it('should return false if bite is not in any bucketlist', () => {
      const mockBite = { id: '1', name: 'Pizza' };
      const mockBucketlists = [
        { id: 'list1', name: 'List 1', biteIds: ['2'] },
        { id: 'list2', name: 'List 2', biteIds: [] },
      ];

      componentRef.setInput('bite', mockBite);
      componentRef.setInput('bucketlists', mockBucketlists);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isBucketlistBite()).toBe(false);
    });

    it('should return false if bite is undefined', () => {
      const mockBucketlists = [
        { id: 'list1', name: 'List 1', biteIds: ['1'] },
        { id: 'list2', name: 'List 2', biteIds: [] },
      ];

      componentRef.setInput('bite', undefined);
      componentRef.setInput('bucketlists', mockBucketlists);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isBucketlistBite()).toBe(false);
    });

    it('should return false if bucketlists is undefined', () => {
      const mockBite = { id: '1', name: 'Pizza' };

      componentRef.setInput('bite', mockBite);
      componentRef.setInput('bucketlists', undefined);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isBucketlistBite()).toBe(false);
    });

    it('should return false if bite id is missing', () => {
      const mockBite = { name: 'Pizza' } as unknown as Bite;
      const mockBucketlists = [
        { id: 'list1', name: 'List 1', biteIds: ['1'] },
        { id: 'list2', name: 'List 2', biteIds: [] },
      ];

      componentRef.setInput('bite', mockBite);
      componentRef.setInput('bucketlists', mockBucketlists);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isBucketlistBite()).toBe(false);
    });
  });

  describe('Bucket List Selection', () => {
    it('should create and present popover with correct configuration', async () => {
      const mockEvent = new MouseEvent('click');
      const mockBucketlists = [{ id: '1', name: 'List 1' }];
      const mockBite = { id: '1', name: 'Bite 1' };

      componentRef.setInput('bucketlists', mockBucketlists);
      componentRef.setInput('bite', mockBite);

      const popoverControllerMock = {
        create: jest.fn(),
      } as unknown as PopoverController;
      const presentSpy = jest.fn();
      (popoverControllerMock.create as jest.Mock).mockReturnValue({
        present: presentSpy,
      });

      component['popoverController'] = popoverControllerMock;
      await component.showBucketListsSelection(mockEvent);

      expect(popoverControllerMock.create).toHaveBeenCalled();
      expect(presentSpy).toHaveBeenCalled();
    });

    it('should bind the correct context to promptForNewList in popover', async () => {
      const mockEvent = new MouseEvent('click');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const boundPrompt = jest.spyOn(component.promptForNewList, 'bind');

      await component.showBucketListsSelection(mockEvent);

      expect(boundPrompt).toHaveBeenCalledWith(component);
    });
  });

  // The popover destroys itself on select, so the name prompt is owned by the
  // page. Ionic passes the alert's text inputs to the handler as an object
  // keyed by input name — reading it as an array dropped the name and left the
  // list uncreated. See GitHub issue #1231.
  describe('promptForNewList', () => {
    const presentAlertAndGetSaveHandler = async (): Promise<
      AlertButton['handler']
    > => {
      let capturedButtons: AlertButton[] = [];
      const alert = document.createElement('ion-alert');
      jest.spyOn(alert, 'present').mockResolvedValue();
      jest.spyOn(alertController, 'create').mockImplementation((options) => {
        capturedButtons = (options?.buttons ?? []).filter(
          (button): button is AlertButton => typeof button !== 'string',
        );
        return Promise.resolve(alert);
      });

      await component.promptForNewList();

      return capturedButtons.find((button) => button.text === 'save')?.handler;
    };

    it('should emit the name Ionic reports for the alert input', async () => {
      const emitSpy = jest.spyOn(component.newList, 'emit');

      const handler = await presentAlertAndGetSaveHandler();
      const dismissed = handler?.({ name: 'My New List' });

      expect(emitSpy).toHaveBeenCalledWith('My New List');
      expect(dismissed).toBe(true);
    });

    it('should trim the name before emitting', async () => {
      const emitSpy = jest.spyOn(component.newList, 'emit');

      const handler = await presentAlertAndGetSaveHandler();
      handler?.({ name: '  Street Food  ' });

      expect(emitSpy).toHaveBeenCalledWith('Street Food');
    });

    it('should keep the alert open and emit nothing for a blank name', async () => {
      const emitSpy = jest.spyOn(component.newList, 'emit');

      const handler = await presentAlertAndGetSaveHandler();
      const dismissed = handler?.({ name: '   ' });

      expect(emitSpy).not.toHaveBeenCalled();
      expect(dismissed).toBe(false);
    });
  });

  describe('openNavigation', () => {
    let windowOpenSpy: jest.SpyInstance;

    const mockBite = {
      id: '1',
      name: 'Test Bite',
      position: { latitude: 10, longitude: 20 },
    };

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();
      componentRef.setInput('bite', mockBite);
      componentRef.changeDetectorRef.detectChanges();
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
      jest.clearAllMocks();
    });

    it('should not open navigation if bite has no position', async () => {
      componentRef.setInput('bite', { ...mockBite, position: undefined });
      componentRef.changeDetectorRef.detectChanges();

      await component.openNavigation();

      expect(window.open).not.toHaveBeenCalled();
    });

    describe('on iOS', () => {
      beforeEach(() => {
        jest.spyOn(platform, 'is').mockImplementation((p) => p === 'ios');
      });

      it('should show alert to choose app if Google Maps is installed', async () => {
        (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({
          value: true,
        });
        const alert = document.createElement('ion-alert');
        jest.spyOn(alert, 'present').mockResolvedValue();
        const createSpy = jest
          .spyOn(alertController, 'create')
          .mockResolvedValue(alert);

        await component.openNavigation();

        expect(createSpy).toHaveBeenCalled();
        expect(alert.present).toHaveBeenCalled();
        expect(window.open).not.toHaveBeenCalled();
      });

      it('should open Apple Maps if Google Maps is not installed', async () => {
        (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({
          value: false,
        });
        await component.openNavigation();
        expect(window.open).toHaveBeenCalledWith(
          'maps://?daddr=10,20',
          '_system',
        );
      });

      it('should open Apple Maps if checking for Google Maps fails', async () => {
        (AppLauncher.canOpenUrl as jest.Mock).mockRejectedValue(
          new Error('some error'),
        );
        await component.openNavigation();
        expect(window.open).toHaveBeenCalledWith(
          'maps://?daddr=10,20',
          '_system',
        );
      });
    });

    describe('on Android', () => {
      beforeEach(() => {
        jest.spyOn(platform, 'is').mockImplementation((p) => p === 'android');
      });

      it('should open geo intent', async () => {
        await component.openNavigation();
        const expectedUrl = `geo:0,0?q=10,20(${encodeURIComponent(
          mockBite.name,
        )})`;
        expect(window.open).toHaveBeenCalledWith(expectedUrl, '_system');
      });
    });

    describe('on Web', () => {
      beforeEach(() => {
        jest.spyOn(platform, 'is').mockImplementation(() => false);
      });

      it('should open Google Maps in a new tab', async () => {
        await component.openNavigation();
        const expectedUrl =
          'https://www.google.com/maps/dir/?api=1&destination=10,20';
        expect(window.open).toHaveBeenCalledWith(expectedUrl, '_blank');
      });
    });
  });

  describe('Restaurant Click', () => {
    it('should emit restaurant click event when bite data is provided', () => {
      const mockBite = { id: '123', name: 'Test Restaurant' } as Bite;
      const emitSpy = jest.spyOn(component.restaurantClick, 'emit');

      component.onRestaurantClick(mockBite);

      expect(emitSpy).toHaveBeenCalledWith(mockBite);
    });

    it('should not emit restaurant click event when bite data is undefined', () => {
      const emitSpy = jest.spyOn(component.restaurantClick, 'emit');

      component.onRestaurantClick(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Navigation buttons on iOS', () => {
    let windowOpenSpy: jest.SpyInstance;
    const mockBite = {
      id: '1',
      name: 'Test Bite',
      position: { latitude: 10, longitude: 20 },
    };

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();
      jest.spyOn(platform, 'is').mockImplementation((p) => p === 'ios');
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open Apple Maps when Apple Maps button is clicked', async () => {
      (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({ value: true });

      // We need to extract the handler function from the alert controller
      componentRef.setInput('bite', mockBite);

      // Mock alert controller to capture the buttons
      let capturedButtons: AlertButton[] = [];
      jest.spyOn(alertController, 'create').mockImplementation((options) => {
        capturedButtons = (options?.buttons ?? []).filter(
          (button): button is AlertButton => typeof button !== 'string',
        );
        return Promise.resolve(document.createElement('ion-alert'));
      });

      // Start navigation flow to trigger alert creation
      await component.openNavigation();

      // Find Apple Maps button
      const appleMapsButton = capturedButtons.find(
        (btn) => btn.text === 'Apple Maps',
      );
      expect(appleMapsButton).toBeDefined();

      // Call the handler
      appleMapsButton?.handler?.(undefined);

      // Check if window.open was called with correct URL
      expect(window.open).toHaveBeenCalledWith(
        'maps://?daddr=10,20',
        '_system',
      );
    });

    it('should open Google Maps when Google Maps button is clicked', async () => {
      (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({ value: true });
      componentRef.setInput('bite', mockBite);

      // Mock alert controller to capture the buttons
      let capturedButtons: AlertButton[] = [];
      jest.spyOn(alertController, 'create').mockImplementation((options) => {
        capturedButtons = (options?.buttons ?? []).filter(
          (button): button is AlertButton => typeof button !== 'string',
        );
        return Promise.resolve(document.createElement('ion-alert'));
      });

      await component.openNavigation();

      const googleMapsButton = capturedButtons.find(
        (btn) => btn.text === 'Google Maps',
      );
      expect(googleMapsButton).toBeDefined();

      googleMapsButton?.handler?.(undefined);

      expect(window.open).toHaveBeenCalledWith(
        'comgooglemaps://?daddr=10,20&directionsmode=driving',
        '_system',
      );
    });
  });

  describe('Navigation outputs', () => {
    it('should emit logoutClick event', () => {
      const emitSpy = jest.spyOn(component.logoutClick, 'emit');

      // Trigger the event
      component.logoutClick.emit();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('isGoogleMapsInstalled', () => {
    it('should return true when Google Maps is installed', async () => {
      (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({ value: true });

      const result = await component['isGoogleMapsInstalled']();

      expect(result).toBe(true);
    });

    it('should return false when Google Maps is not installed', async () => {
      (AppLauncher.canOpenUrl as jest.Mock).mockResolvedValue({ value: false });

      const result = await component['isGoogleMapsInstalled']();

      expect(result).toBe(false);
    });
  });

  describe('editBite', () => {
    it('should emit gotoEdit event when bite is provided', () => {
      const mockBite = { id: '1', name: 'Test Bite' } as Bite;
      const emitSpy = jest.spyOn(component.gotoEdit, 'emit');

      component.editBite(mockBite);

      expect(emitSpy).toHaveBeenCalledWith(mockBite);
    });

    it('should not emit gotoEdit event when bite is undefined', () => {
      const emitSpy = jest.spyOn(component.gotoEdit, 'emit');

      component.editBite(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('newBite', () => {
    it('should emit gotoNew event when bite is provided', () => {
      const mockBite = { id: '1', name: 'Test Bite' } as Bite;
      const emitSpy = jest.spyOn(component.gotoNew, 'emit');

      component.newBite(mockBite);

      expect(emitSpy).toHaveBeenCalledWith(mockBite);
    });

    it('should not emit gotoNew event when bite is undefined', () => {
      const emitSpy = jest.spyOn(component.gotoNew, 'emit');

      component.newBite(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onNewList', () => {
    it('should emit newList event with provided list name', () => {
      const emitSpy = jest.spyOn(component.newList, 'emit');
      const newListName = 'My New List';

      component.onNewList(newListName);

      expect(emitSpy).toHaveBeenCalledWith(newListName);
    });
  });

  describe('onShareBiteClicked', () => {
    describe('given bite is defined', () => {
      it('should emit shareBite event with bite data', () => {
        const mockBite = { id: '1', name: 'Test Bite' } as Bite;
        const emitSpy = jest.spyOn(component.shareBite, 'emit');

        component.onShareBiteClicked(mockBite);

        expect(emitSpy).toHaveBeenCalledWith(mockBite);
      });
    });

    describe('given bite is undefined', () => {
      it('should not emit shareBite event', () => {
        const emitSpy = jest.spyOn(component.shareBite, 'emit');

        component.onShareBiteClicked(undefined);

        expect(emitSpy).not.toHaveBeenCalled();
      });
    });
  });
});
