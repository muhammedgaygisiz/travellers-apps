import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  AlertController,
  IonContent,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { GalleryPage } from '../gallery.page';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

describe(GalleryPage.name, () => {
  let component: GalleryPage;
  let fixture: ComponentFixture<GalleryPage>;

  beforeEach(() => {
    addNecessaryIcons();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(GalleryPage);
    component = fixture.componentInstance;
  });

  it('shows only locally provided images', () => {
    fixture.componentRef.setInput('images', [
      { name: 'photo.jpg', src: 'local-photo-uri' },
    ]);
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('.gallery-grid img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('local-photo-uri');
  });

  it('opens the viewer at the tapped photo', () => {
    fixture.componentRef.setInput('images', [
      { name: 'first.jpg', src: 'first-uri' },
      { name: 'second.jpg', src: 'second-uri' },
    ]);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelectorAll('[data-testid="gallery-tile"]')[1]
      .click();

    expect(component.viewerIndex()).toBe(1);
  });

  it('offers the Bite action only for photos named after a Bite', () => {
    fixture.componentRef.setInput('images', [
      { name: 'bites_abc-123.jpg', src: 'first-uri', biteId: 'abc-123' },
      { name: 'IMG_0417.jpg', src: 'second-uri' },
    ]);
    fixture.detectChanges();

    const [fromBite, unrelated] = component.viewerImages();
    expect(fromBite.actionLabel).toBe('open-bite');
    expect(unrelated.actionLabel).toBeUndefined();
  });

  it('closes the viewer before leaving for the Bite', () => {
    fixture.componentRef.setInput('images', [
      { name: 'bites_abc-123.jpg', src: 'first-uri', biteId: 'abc-123' },
    ]);
    fixture.detectChanges();
    jest.spyOn(component.openBite, 'emit');
    component.openViewer(0);

    component.goToBite(0);

    expect(component.viewerIndex()).toBeUndefined();
    expect(component.openBite.emit).toHaveBeenCalledWith('abc-123');
  });

  it('stays put for a photo without a Bite', () => {
    fixture.componentRef.setInput('images', [
      { name: 'IMG_0417.jpg', src: 'first-uri' },
    ]);
    fixture.detectChanges();
    jest.spyOn(component.openBite, 'emit');

    component.goToBite(0);

    expect(component.openBite.emit).not.toHaveBeenCalled();
  });

  describe('returning from a Bite', () => {
    const images = [{ name: 'first.jpg', src: 'first-uri' }];

    // `ta-page` renders an ion-content of its own, so the grid's is picked by
    // its class rather than by directive, which would match the wrapper first.
    const contentInstance = (): IonContent =>
      fixture.debugElement.query(
        By.css('ion-content.content-safe-padding-bottom'),
      ).componentInstance;

    // The first render is what creates the ion-content to spy on, and the
    // restore fires during change detection, so the offset arrives only after
    // the spy is in place.
    const renderWith = (
      scrollTop: number,
      galleryImages = images,
    ): jest.SpyInstance => {
      fixture.componentRef.setInput('images', galleryImages);
      fixture.detectChanges();

      const scrollToPoint = jest
        .spyOn(contentInstance(), 'scrollToPoint')
        .mockResolvedValue(undefined);

      fixture.componentRef.setInput('initialScrollTop', scrollTop);
      fixture.detectChanges();

      return scrollToPoint;
    };

    it('restores the offset the user left from', () => {
      const scrollToPoint = renderWith(240);

      expect(scrollToPoint).toHaveBeenCalledWith(0, 240);
    });

    it('restores it once, not on every later change', () => {
      const scrollToPoint = renderWith(240);
      scrollToPoint.mockClear();

      fixture.componentRef.setInput('images', [
        ...images,
        { name: 'second.jpg', src: 'second-uri' },
      ]);
      fixture.componentRef.setInput('initialScrollTop', 300);
      fixture.detectChanges();

      expect(scrollToPoint).not.toHaveBeenCalled();
    });

    it('leaves the grid alone when the user never scrolled', () => {
      const scrollToPoint = renderWith(0);

      expect(scrollToPoint).not.toHaveBeenCalled();
    });

    it('waits for the images before scrolling anywhere', () => {
      const scrollToPoint = renderWith(240, []);

      expect(scrollToPoint).not.toHaveBeenCalled();
    });

    it('reports the current offset for the way out', async () => {
      fixture.componentRef.setInput('images', images);
      fixture.detectChanges();
      jest
        .spyOn(contentInstance(), 'getScrollElement')
        .mockResolvedValue({ scrollTop: 180 } as HTMLElement);

      expect(await component.currentScrollTop()).toBe(180);
    });

    it('reports no offset before the content exists', async () => {
      expect(await component.currentScrollTop()).toBe(0);
    });
  });

  it('runs the header progress bar while the spinner shows', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();
  });

  it('emits deleteAll after destructive confirmation', async () => {
    const present = jest.fn();
    let destructiveHandler: (() => void) | undefined;
    jest
      .spyOn(TestBed.inject(AlertController), 'create')
      .mockImplementation(async (options) => {
        destructiveHandler = (
          options.buttons as { role?: string; handler?: () => void }[]
        ).find(({ role }) => role === 'destructive')?.handler;
        return { present } as never;
      });
    jest.spyOn(component.deleteAll, 'emit');

    await component.confirmDeleteAll();
    destructiveHandler?.();

    expect(present).toHaveBeenCalled();
    expect(component.deleteAll.emit).toHaveBeenCalled();
  });
});
