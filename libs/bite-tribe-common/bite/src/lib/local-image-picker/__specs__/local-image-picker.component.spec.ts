import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import {
  LocalImagePickerComponent,
  type LocalImage,
} from '../local-image-picker.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const image = (name: string): LocalImage => ({
  name,
  uri: `file:///${name}`,
  src: `capacitor://${name}`,
});

describe(LocalImagePickerComponent.name, () => {
  let component: LocalImagePickerComponent;
  let fixture: ComponentFixture<LocalImagePickerComponent>;
  let componentRef: ComponentRef<LocalImagePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalImagePickerComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalImagePickerComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should show a spinner while the photos are being read', () => {
    componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
  });

  it('should report an empty device', () => {
    componentRef.setInput('images', []);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="local-image-picker-empty"]',
      ),
    ).toBeTruthy();
  });

  it('should show the photos it was given', () => {
    componentRef.setInput('images', [image('a.jpg'), image('b.jpg')]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="local-image-picker-grid"] img',
      ),
    ).toHaveLength(2);
  });

  it('should report the picked photo instead of acting on it', () => {
    componentRef.setInput('images', [image('a.jpg')]);
    fixture.detectChanges();
    const emitted: LocalImage[] = [];
    component.imageSelected.subscribe((value) => emitted.push(value));

    fixture.nativeElement
      .querySelector('[data-testid="local-image-picker-grid"] img')
      .click();

    expect(emitted).toEqual([image('a.jpg')]);
  });

  it('should report a cancellation', () => {
    fixture.detectChanges();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    fixture.nativeElement.querySelector('ion-button').click();

    expect(cancelled).toBe(true);
  });
});
