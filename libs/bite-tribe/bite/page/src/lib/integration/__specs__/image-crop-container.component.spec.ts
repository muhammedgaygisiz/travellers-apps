import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { BiteService } from '../bite.service';
import { ImageCropContainer } from '../image-crop-container.component';

describe('ImageCropContainer', () => {
  let component: ImageCropContainer;
  let fixture: ComponentFixture<ImageCropContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BiteService,
          useValue: {
            editingBite: signal(undefined),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setEditedImage: () => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ImageCropContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
