import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
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
