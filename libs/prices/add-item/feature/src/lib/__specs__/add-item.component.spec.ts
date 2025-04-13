import { AddItemComponent } from '../components/add-item.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import * as rxjs from 'rxjs';
import { of } from 'rxjs';
import { ComponentRef } from '@angular/core';

addNecessaryIcons();

jest.mock('localization');
jest.spyOn(rxjs, 'fromEvent').mockReturnValue(of({}));

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const IMAGE_BLOB = 'image-blob';

describe('AddItemComponent', () => {
  let component: AddItemComponent;
  let fixture: ComponentFixture<AddItemComponent>;
  let scheduler: TestScheduler;
  let componentRef: ComponentRef<AddItemComponent>;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);

    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(AddItemComponent);
    componentRef = fixture.componentRef;
    component = fixture.componentInstance;
    component.reader = {
      result: IMAGE_BLOB,
      readAsDataURL: jest.fn(),
    } as unknown as FileReader;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onload$', () => {
    it('should set price and image', () => {
      scheduler.run(({ expectObservable }) => {
        expectObservable(component.onload$);
      });

      expect(component.priceFormGroup.controls['image'].value).toEqual(
        IMAGE_BLOB
      );
      expect(component.imagePreview).toEqual(IMAGE_BLOB);
    });
  });

  describe('ngOnChanges', () => {
    it('should patch location form control', () => {
      const LOCATION = 'Köln';
      componentRef.setInput('location', LOCATION);
      component.ngOnChanges({
        location: {
          previousValue: undefined,
          currentValue: LOCATION,
          firstChange: false,
          isFirstChange: (): boolean => false,
        },
      });

      expect(component.priceFormGroup.controls['location'].value).toEqual(
        LOCATION
      );
    });
  });

  describe('onSelect', () => {
    it('should call readAsDataURL', () => {
      const FILE = new File([], 'test.jpg');

      const readAsDataURLSpy = jest.spyOn(component.reader, 'readAsDataURL');

      component.onSelect({ target: { files: [FILE] } } as unknown as Event);

      expect(readAsDataURLSpy).toHaveBeenCalledWith(FILE);
    });
  });

  describe('triggerImageUpload', () => {
    it('should trigger file uploader click', () => {
      const clickSpy = jest.spyOn(
        component.fileUploader()!.nativeElement,
        'click'
      );

      component.triggerImageUpload();

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });
});
