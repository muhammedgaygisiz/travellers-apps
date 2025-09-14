import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageCropPageComponent } from '../image-crop-page.component';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';

jest.mock('localization');

addNecessaryIcons();

type MockFileReader = {
  readAsDataURL: jest.Mock;
  addEventListener?: jest.Mock;
  onload: null | (() => void);
  result: string;
  EMPTY: 0;
  LOADING: 1;
  DONE: 2;
};

describe('ImageCropPageComponent', () => {
  let component: ImageCropPageComponent;
  let fixture: ComponentFixture<ImageCropPageComponent>;
  let imageCroppedEvent: ImageCroppedEvent;
  let mockFileReader: MockFileReader;
  const IMAGE_BLOB =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });
    fixture = TestBed.createComponent(ImageCropPageComponent);

    component = fixture.componentInstance;
    imageCroppedEvent = {
      base64: IMAGE_BLOB,
      blob: new Blob([''], { type: 'image/png' }),
      width: 100,
      height: 100,
      cropperPosition: { x1: 0, y1: 0, x2: 100, y2: 100 },
    } as ImageCroppedEvent;

    mockFileReader = {
      readAsDataURL: jest.fn(),
      addEventListener: jest.fn((_, cb) => cb()),
      onload: null,
      result: IMAGE_BLOB,
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    };

    // @ts-expect-error - Mocking FileReader
    global.FileReader = jest.fn(() => mockFileReader);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit cropped image on emitCroppedImage', (done) => {
    jest.spyOn(component.croppedImage, 'emit');
    component.currentCropBlob = imageCroppedEvent.blob;

    component.emitCroppedImage();

    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    expect(component.croppedImage.emit).toHaveBeenCalledWith(
      imageCroppedEvent.base64
    );
    done();
  });

  it('should handle load image failure', () => {
    jest.spyOn(console, 'error');
    component.onLoadImageFailed();
    expect(console.error).toHaveBeenCalledWith('Image load failed.');
  });

  it('should handle image cropped event', () => {
    jest.spyOn(component, 'onLoadImageFailed');
    component.onImageCropped(imageCroppedEvent);
    expect(component.currentCropBlob).toBe(imageCroppedEvent.blob);
  });

  describe('imageFileNew', () => {
    it('should return null for non-base64 image', () => {
      component.image = signal('http://example.com/image.png') as any;

      expect(component.imageFileNew()).toBeNull();
    });

    it('should return File for base64 image', () => {
      component.image = signal(IMAGE_BLOB) as any;

      const file = component.imageFileNew();
      expect(file instanceof File).toBeTruthy();
      expect(file?.type).toBe('image/png');
    });
  });

  describe('imgFromHtmlElem', () => {
    it('should set onload handler for image element', async () => {
      const mockImageElement = {
        onload: null,
      } as unknown as HTMLImageElement;

      // Mock the nativeElement to return our mockImageElement
      component.imageFromUrl = signal({
        nativeElement: mockImageElement,
      }) as any;
      const PNG_FILE = new File([''], 'image.png', { type: 'image/png' });
      component['extractFileFromHtmlImageElement'] = jest.fn(() => PNG_FILE);

      fixture.detectChanges();
      await fixture.whenRenderingDone();

      expect(mockImageElement.onload).toBeInstanceOf(Function);

      // Simulate image load
      mockImageElement.onload?.({} as any);

      const file = component.imageFileNew();
      expect(file instanceof File).toBeTruthy();
      expect(file?.type).toBe('image/png');
    });
  });
});
