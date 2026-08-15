import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteComponent } from '../bite.component';
import { ToMetricPipe } from 'common/distance';
import { Bite, Like, LikeClick } from 'model';
import {
  ComponentRef,
  CUSTOM_ELEMENTS_SCHEMA,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { IonModal, provideIonicAngular } from '@ionic/angular/standalone';
import { ToBlobUrlPipe } from 'image-compression';
import { OverlayEventDetail } from '@ionic/core';
import { addNecessaryIcons } from 'utils';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { STALE_PENDING_UPLOAD_MS } from '../utils/image-status';

jest.mock('heic2any', () => jest.fn());

@Pipe({ name: 'toBlobUrl' })
class MockToBlobUrlPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('BiteComponent', () => {
  let component: BiteComponent;
  let componentRef: ComponentRef<BiteComponent>;
  let fixture: ComponentFixture<BiteComponent>;

  const mockBite: Bite = {
    id: 'bite1',
    name: 'Test Bite',
    image: 'test-image.jpg',
    place: 'Test Place',
    price: 15.99,
    currency: 'USD',
    position: { longitude: 12.34, latitude: 56.78 },
    distance: '500',
    restaurantId: 'rest1',
    likes: [
      { userId: 'user1', likeType: 'thumbup' } as Like,
      { userId: 'user2', likeType: 'drooling' } as Like,
    ],
    tags: ['spicy', 'vegetarian'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BiteComponent],
      providers: [
        provideIonicAngular(),
        ToMetricPipe,
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: TranslocoPipe, useValue: MockTranslocoPipe },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(BiteComponent, {
      remove: { imports: [ToBlobUrlPipe] },
      add: { imports: [MockToBlobUrlPipe] },
    });

    fixture = TestBed.createComponent(BiteComponent);
    componentRef = fixture.componentRef;
    component = fixture.componentInstance;

    componentRef.setInput('bite', mockBite);
    componentRef.setInput('userId', 'user1');
    componentRef.setInput('showEditButton', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('image status', () => {
    const queryFailed = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="bite-image-failed"]');

    const setPendingBite = (biteUserId?: string): void => {
      componentRef.setInput('bite', {
        ...mockBite,
        userId: biteUserId,
        image: '',
        imagePath: undefined,
        imageStatus: 'pending',
        createdAtTimestamp: Date.now(),
      });
      fixture.detectChanges();
    };

    it('should show the uploading overlay while the upload is pending', () => {
      setPendingBite('user1');

      expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
      expect(queryFailed()).toBeNull();
    });

    it('should stop claiming an abandoned upload is still running', () => {
      componentRef.setInput('bite', {
        ...mockBite,
        image: '',
        imagePath: undefined,
        imageStatus: 'pending',
        createdAtTimestamp: Date.now() - STALE_PENDING_UPLOAD_MS,
      });
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ion-spinner')).toBeNull();
    });

    it('should replace the uploading overlay once the upload failed', () => {
      componentRef.setInput('bite', {
        ...mockBite,
        image: '',
        imagePath: undefined,
        imageStatus: 'failed',
      });
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ion-spinner')).toBeNull();
    });

    it('should not pass a failed upload off as a photo the poster still holds locally', () => {
      componentRef.setInput('bite', {
        ...mockBite,
        image: 'data:image/jpeg;base64,local-copy',
        imagePath: undefined,
        imageStatus: 'failed',
      });
      fixture.detectChanges();

      expect(queryFailed()).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('img.cursor-pointer'),
      ).toBeNull();
    });

    it('should show the image once the upload finished', () => {
      componentRef.setInput('bite', {
        ...mockBite,
        imageStatus: 'uploaded',
      });
      fixture.detectChanges();

      expect(queryFailed()).toBeNull();
      expect(fixture.nativeElement.querySelector('ion-spinner')).toBeNull();
    });
  });

  it('should emit biteClick when bite is clicked', (done) => {
    component.biteClick.subscribe((emittedBite) => {
      expect(emittedBite).toEqual(mockBite);
      done();
    });

    component.biteClick.emit(mockBite);
  });

  it('should render restaurant text without clickable styling', () => {
    const restaurantText: HTMLElement = fixture.nativeElement.querySelector(
      'ion-card-subtitle ion-text',
    );

    expect(restaurantText.classList.contains('cursor-pointer')).toBe(false);
  });

  it('should emit likeButtonClick with correct data', (done) => {
    const expectedData: LikeClick = {
      likeType: 'thumbup',
      biteId: 'bite1',
      action: 'save',
    };

    component.likeButtonClick.subscribe((data) => {
      expect(data).toEqual(expectedData);
      done();
    });

    component.likeButtonClick.emit(expectedData);
  });

  it('should emit gotoEdit when edit is clicked', (done) => {
    component.gotoEdit.subscribe((emittedBite) => {
      expect(emittedBite).toEqual(mockBite);
      done();
    });

    component.gotoEdit.emit(mockBite);
  });

  it('should have correct initial input values', () => {
    expect(component.bite()).toEqual(mockBite);
    expect(component.userId()).toBe('user1');
    expect(component.showEditButton()).toBe(false);
  });

  it('should have correct tags from bite data', () => {
    const tags = component.bite().tags;
    expect(tags).toContain('spicy');
    expect(tags).toContain('vegetarian');
    expect(tags?.length).toBe(2);
  });

  describe('handleConfirmationDismiss', () => {
    it('should emit deleteBite when role is DELETE', () => {
      jest.spyOn(component.deleteBite, 'emit');

      const mockEvent = {
        detail: { role: 'delete' },
      } as CustomEvent<OverlayEventDetail>;

      component.handleConfirmationDismiss(mockEvent);

      expect(component.deleteBite.emit).toHaveBeenCalledWith(mockBite);
      expect(component.isOpen()).toBe(false);
    });

    it('should not emit deleteBite when role is CANCEL', () => {
      jest.spyOn(component.deleteBite, 'emit');

      const mockEvent = {
        detail: { role: 'cancel' },
      } as CustomEvent<OverlayEventDetail>;

      component.handleConfirmationDismiss(mockEvent);

      expect(component.deleteBite.emit).not.toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('openConfirmationDialog', () => {
    it('should set isOpen to true', () => {
      component.isOpen.set(false);
      component.openConfirmationDialog();
      expect(component.isOpen()).toBe(true);
    });
  });

  describe('delete confirmation alert', () => {
    const queryAlert = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('ion-alert');

    it('should not be in the DOM while it is closed', () => {
      expect(queryAlert()).toBeNull();
    });

    it('should not be in the DOM for a card that only shows the delete button', () => {
      componentRef.setInput('showEditButton', true);
      fixture.detectChanges();

      expect(queryAlert()).toBeNull();
    });

    it('should be created once delete is invoked', () => {
      component.openConfirmationDialog();
      fixture.detectChanges();

      expect(queryAlert()).not.toBeNull();
    });

    it('should be removed again after the confirmation is dismissed', () => {
      component.openConfirmationDialog();
      fixture.detectChanges();

      component.handleConfirmationDismiss({
        detail: { role: 'cancel' },
      } as CustomEvent<OverlayEventDetail>);
      fixture.detectChanges();

      expect(queryAlert()).toBeNull();
    });
  });

  describe('isOwnUnratedBite', () => {
    it('should return true when bite belongs to current user and has no rating', () => {
      componentRef.setInput('bite', { ...mockBite, userId: 'user1' });
      componentRef.setInput('userId', 'user1');
      expect(component.isOwnUnratedBite()).toBe(true);
    });

    it('should return false when bite belongs to another user', () => {
      componentRef.setInput('bite', { ...mockBite, userId: 'other-user' });
      componentRef.setInput('userId', 'user1');
      expect(component.isOwnUnratedBite()).toBe(false);
    });

    it('should return false when bite already has a rating', () => {
      componentRef.setInput('bite', {
        ...mockBite,
        userId: 'user1',
        rating: 4,
      });
      componentRef.setInput('userId', 'user1');
      expect(component.isOwnUnratedBite()).toBe(false);
    });

    it('should return false when userId is not provided', () => {
      componentRef.setInput('bite', { ...mockBite, userId: 'user1' });
      componentRef.setInput('userId', undefined);
      expect(component.isOwnUnratedBite()).toBe(false);
    });
  });

  describe('openRatingModal', () => {
    it('should set isRatingModalOpen to true and reset selectedRating', () => {
      component.selectedRating.set(3);
      component.openRatingModal();
      expect(component.isRatingModalOpen()).toBe(true);
      expect(component.selectedRating()).toBe(0);
    });
  });

  describe('onRatingChosen', () => {
    it('should update selectedRating', () => {
      component.onRatingChosen(4);
      expect(component.selectedRating()).toBe(4);
    });
  });

  describe('saveRating', () => {
    it('should emit rateNowClick with bite and rating when rating is set', () => {
      jest.spyOn(component.rateNowClick, 'emit');
      const mockModal = {
        dismiss: jest.fn().mockResolvedValue(undefined),
      } as unknown as IonModal;

      componentRef.setInput('bite', { ...mockBite, userId: 'user1' });
      component.selectedRating.set(3);
      component.saveRating(mockModal);

      expect(component.rateNowClick.emit).toHaveBeenCalledWith({
        bite: { ...mockBite, userId: 'user1' },
        rating: 3,
      });
      expect(component.isRatingModalOpen()).toBe(false);
    });

    it('should not emit rateNowClick when no rating is selected', () => {
      jest.spyOn(component.rateNowClick, 'emit');
      const mockModal = {
        dismiss: jest.fn().mockResolvedValue(undefined),
      } as unknown as IonModal;

      component.selectedRating.set(0);
      component.saveRating(mockModal);

      expect(component.rateNowClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('closeRatingModal', () => {
    it('should close the modal and reset isRatingModalOpen', () => {
      const mockModal = {
        dismiss: jest.fn().mockResolvedValue(undefined),
      } as unknown as IonModal;

      component.isRatingModalOpen.set(true);
      component.closeRatingModal(mockModal);

      expect(mockModal.dismiss).toHaveBeenCalled();
      expect(component.isRatingModalOpen()).toBe(false);
    });
  });
});
