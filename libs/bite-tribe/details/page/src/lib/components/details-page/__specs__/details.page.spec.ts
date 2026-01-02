import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPage } from '../details.page';
import { PageComponent } from 'common/ui/page';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import {
  AlertController,
  PopoverController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ToBlobUrlPipe } from 'image-compression';
import { addNecessaryIcons } from 'utils';
import { AppLauncher } from '@capacitor/app-launcher';
import { Platform } from '@ionic/angular';
import { Bite } from 'model';
import { vi, Mock } from 'vitest';

@Pipe({ name: 'toBlobUrl' })
class MockToBlobUrlPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

vi.mock('heic2any', () => vi.fn());
vi.mock('localization');
addNecessaryIcons();

// Properly mock the AppLauncher module
vi.mock('@capacitor/app-launcher', () => ({
  AppLauncher: {
    canOpenUrl: vi.fn(),
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
      ],
    })
      .overrideComponent(DetailsPage, {
        remove: { imports: [ToBlobUrlPipe] },
        add: { imports: [MockToBlobUrlPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DetailsPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    platform = TestBed.inject(Platform);
    alertController = TestBed.inject(AlertController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default reviews', () => {
    expect(component.reviews()).toMatchSnapshot();
  });

  describe('Bite Display', () => {
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
      const img = fixture.debugElement.query(By.css('img'));
      expect(img.attributes['src']).toBe('test.jpg');

      const content = fixture.debugElement.nativeElement.textContent;
      expect(content).toContain('Pizza');
      expect(content).toContain('Italian Restaurant');
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
      const emitSpy = vi.spyOn(component.submitNewReview, 'emit');
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
      const emitSpy = vi.spyOn(component.submitNewReview, 'emit');
      component.reviewFormGroup.patchValue({ review: '' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit review when bite id is missing', () => {
      // Arrange
      const emitSpy = vi.spyOn(component.submitNewReview, 'emit');
      componentRef.setInput('bite', undefined);
      component.reviewFormGroup.patchValue({ review: 'Great food!' });

      // Act
      component.saveReview();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
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
        create: vi.fn(),
      } as unknown as PopoverController;
      const presentSpy = vi.fn();
      (popoverControllerMock.create as Mock).mockReturnValue({
        present: presentSpy,
      });

      component['popoverController'] = popoverControllerMock;
      await component.showBucketListsSelection(mockEvent);

      expect(popoverControllerMock.create).toHaveBeenCalled();
      expect(presentSpy).toHaveBeenCalled();
    });

    it('should bind the correct context to onNewList in popover', async () => {
      const mockEvent = new MouseEvent('click');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const boundOnNewList = vi.spyOn(component.onNewList, 'bind');

      await component.showBucketListsSelection(mockEvent);

      expect(boundOnNewList).toHaveBeenCalledWith(component);
    });
  });

  describe('openNavigation', () => {
    let windowOpenSpy: Mock;

    const mockBite = {
      id: '1',
      name: 'Test Bite',
      position: { latitude: 10, longitude: 20 },
    };

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
      componentRef.setInput('bite', mockBite);
      componentRef.changeDetectorRef.detectChanges();
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
      vi.clearAllMocks();
    });

    it('should not open navigation if bite has no position', async () => {
      componentRef.setInput('bite', { ...mockBite, position: undefined });
      componentRef.changeDetectorRef.detectChanges();

      await component.openNavigation();

      expect(window.open).not.toHaveBeenCalled();
    });

    describe('on iOS', () => {
      beforeEach(() => {
        vi.spyOn(platform, 'is').mockImplementation((p) => p === 'ios');
      });

      it('should show alert to choose app if Google Maps is installed', async () => {
        (AppLauncher.canOpenUrl as Mock).mockResolvedValue({
          value: true,
        });
        const alert = { present: vi.fn() } as any;
        const createSpy = vi
          .spyOn(alertController, 'create')
          .mockResolvedValue(alert);

        await component.openNavigation();

        expect(createSpy).toHaveBeenCalled();
        expect(alert.present).toHaveBeenCalled();
        expect(window.open).not.toHaveBeenCalled();
      });

      it('should open Apple Maps if Google Maps is not installed', async () => {
        (AppLauncher.canOpenUrl as Mock).mockResolvedValue({
          value: false,
        });
        await component.openNavigation();
        expect(window.open).toHaveBeenCalledWith(
          'maps://?daddr=10,20',
          '_system',
        );
      });

      it('should open Apple Maps if checking for Google Maps fails', async () => {
        (AppLauncher.canOpenUrl as Mock).mockRejectedValue(
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
        vi.spyOn(platform, 'is').mockImplementation((p) => p === 'android');
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
        vi.spyOn(platform, 'is').mockImplementation(() => false);
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
      const emitSpy = vi.spyOn(component.restaurantClick, 'emit');

      component.onRestaurantClick(mockBite);

      expect(emitSpy).toHaveBeenCalledWith(mockBite);
    });

    it('should not emit restaurant click event when bite data is undefined', () => {
      const emitSpy = vi.spyOn(component.restaurantClick, 'emit');

      component.onRestaurantClick(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Navigation buttons on iOS', () => {
    let windowOpenSpy: Mock;
    const mockBite = {
      id: '1',
      name: 'Test Bite',
      position: { latitude: 10, longitude: 20 },
    };

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
      vi.spyOn(platform, 'is').mockImplementation((p) => p === 'ios');
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open Apple Maps when Apple Maps button is clicked', async () => {
      (AppLauncher.canOpenUrl as Mock).mockResolvedValue({ value: true });

      // We need to extract the handler function from the alert controller
      componentRef.setInput('bite', mockBite);

      // Mock alert controller to capture the buttons
      let capturedButtons: any[] = [];
      vi.spyOn(alertController, 'create').mockImplementation((options: any) => {
        capturedButtons = options.buttons;
        return Promise.resolve({
          present: vi.fn(),
        } as any);
      });

      // Start navigation flow to trigger alert creation
      await component.openNavigation();

      // Find Apple Maps button
      const appleMapsButton = capturedButtons.find(
        (btn) => btn.text === 'Apple Maps',
      );
      expect(appleMapsButton).toBeDefined();

      // Call the handler
      appleMapsButton.handler();

      // Check if window.open was called with correct URL
      expect(window.open).toHaveBeenCalledWith(
        'maps://?daddr=10,20',
        '_system',
      );
    });

    it('should open Google Maps when Google Maps button is clicked', async () => {
      (AppLauncher.canOpenUrl as Mock).mockResolvedValue({ value: true });
      componentRef.setInput('bite', mockBite);

      // Mock alert controller to capture the buttons
      let capturedButtons: any[] = [];
      vi.spyOn(alertController, 'create').mockImplementation((options: any) => {
        capturedButtons = options.buttons;
        return Promise.resolve({
          present: vi.fn(),
        } as any);
      });

      await component.openNavigation();

      const googleMapsButton = capturedButtons.find(
        (btn) => btn.text === 'Google Maps',
      );
      expect(googleMapsButton).toBeDefined();

      googleMapsButton.handler();

      expect(window.open).toHaveBeenCalledWith(
        'comgooglemaps://?daddr=10,20&directionsmode=driving',
        '_system',
      );
    });
  });

  describe('Navigation outputs', () => {
    it('should emit logoutClick event', () => {
      const emitSpy = vi.spyOn(component.logoutClick, 'emit');

      // Trigger the event
      component.logoutClick.emit();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit gotoSettings event', () => {
      const emitSpy = vi.spyOn(component.gotoSettings, 'emit');

      component.gotoSettings.emit();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit gotoMyBites event', () => {
      const emitSpy = vi.spyOn(component.gotoMyBites, 'emit');

      component.gotoMyBites.emit();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit gotoMyBucketlists event', () => {
      const emitSpy = vi.spyOn(component.gotoMyBucketlists, 'emit');

      component.gotoMyBucketlists.emit();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('isGoogleMapsInstalled', () => {
    it('should return true when Google Maps is installed', async () => {
      (AppLauncher.canOpenUrl as Mock).mockResolvedValue({ value: true });

      const result = await component['isGoogleMapsInstalled']();

      expect(result).toBe(true);
    });

    it('should return false when Google Maps is not installed', async () => {
      (AppLauncher.canOpenUrl as Mock).mockResolvedValue({ value: false });

      const result = await component['isGoogleMapsInstalled']();

      expect(result).toBe(false);
    });
  });

  describe('editBite', () => {
    it('should emit gotoEdit event when bite is provided', () => {
      const mockBite = { id: '1', name: 'Test Bite' } as Bite;
      const emitSpy = vi.spyOn(component.gotoEdit, 'emit');

      component.editBite(mockBite);

      expect(emitSpy).toHaveBeenCalledWith(mockBite);
    });

    it('should not emit gotoEdit event when bite is undefined', () => {
      const emitSpy = vi.spyOn(component.gotoEdit, 'emit');

      component.editBite(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onNewList', () => {
    it('should emit newList event with provided list name', () => {
      const emitSpy = vi.spyOn(component.newList, 'emit');
      const newListName = 'My New List';

      component.onNewList(newListName);

      expect(emitSpy).toHaveBeenCalledWith(newListName);
    });
  });
});
