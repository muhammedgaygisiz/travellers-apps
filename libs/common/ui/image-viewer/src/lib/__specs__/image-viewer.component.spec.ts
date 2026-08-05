import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons } from 'utils';
import {
  ImageViewerComponent,
  ImageViewerImage,
} from '../image-viewer.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const IMAGES: ImageViewerImage[] = [
  { src: 'first.jpg', alt: 'first' },
  { src: 'second.jpg', alt: 'second', actionLabel: 'Open Bite' },
  { src: 'third.jpg', alt: 'third' },
];

describe('ImageViewerComponent', () => {
  let fixture: ComponentFixture<ImageViewerComponent>;

  const setup = (images: ImageViewerImage[], startIndex = 0): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(ImageViewerComponent);
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('startIndex', startIndex);
    fixture.detectChanges();
  };

  const query = (testId: string): HTMLElement | undefined =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))
      ?.nativeElement;

  it('renders a slide per image', () => {
    setup(IMAGES);

    expect(fixture.debugElement.queryAll(By.css('swiper-slide')).length).toBe(
      3,
    );
  });

  it('starts at the requested photo', () => {
    setup(IMAGES, 2);

    expect(fixture.componentInstance.activeIndex()).toBe(2);
    expect(query('image-viewer-position')?.textContent?.trim()).toBe('3 / 3');
  });

  it('hides the position indicator for a single photo', () => {
    setup([IMAGES[0]]);

    expect(query('image-viewer-position')).toBeUndefined();
  });

  it('emits closed when the close button is used', () => {
    setup(IMAGES);
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);

    query('image-viewer-close')?.click();

    expect(closed).toHaveBeenCalled();
  });

  it('shows the action only for photos that carry a label', () => {
    setup(IMAGES);

    expect(query('image-viewer-action')).toBeUndefined();

    fixture.componentInstance.activeIndex.set(1);
    fixture.detectChanges();

    expect(query('image-viewer-action')?.textContent).toContain('Open Bite');
  });

  it('emits the active index when the action is chosen', () => {
    setup(IMAGES, 1);
    const actionSelected = jest.fn();
    fixture.componentInstance.actionSelected.subscribe(actionSelected);

    query('image-viewer-action')?.click();

    expect(actionSelected).toHaveBeenCalledWith(1);
  });

  it('follows the active slide when the user swipes', () => {
    setup(IMAGES);

    fixture.componentInstance.onSlideChange(
      new CustomEvent('swiperslidechange', { detail: [{ activeIndex: 2 }] }),
    );
    fixture.detectChanges();

    expect(query('image-viewer-position')?.textContent?.trim()).toBe('3 / 3');
  });
});
