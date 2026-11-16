import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { MapSelectionComponent } from '../map-selection.component';

addNecessaryIcons();

@Component({
  imports: [MapSelectionComponent],
  template: `
    <bt-map-selection heading="Fondue" (closeClick)="closed = true">
      <ng-template><p class="projected">card</p></ng-template>
    </bt-map-selection>
  `,
})
class HostComponent {
  closed = false;
}

describe(MapSelectionComponent.name, () => {
  const originalMatchMedia = window.matchMedia;

  const mockMatchMedia = (wide: boolean): void => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: wide,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  };

  const render = (): ComponentFixture<HostComponent> => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string): string => key,
            langChanges$: of('en'),
            config: { reRenderOnLangChange: false },
            getActiveLang: (): string => 'en',
            selectTranslate: (key: string): Observable<string> => of(key),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  };

  const query = (root: HTMLElement, selector: string): HTMLElement | null =>
    root.querySelector(selector) as HTMLElement | null;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should ask for the 768px wide-screen breakpoint', () => {
    mockMatchMedia(false);
    render();
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('should open in the bottom drawer on a phone', () => {
    mockMatchMedia(false);
    const root = render().nativeElement as HTMLElement;

    const drawer = query(root, '[data-testid="map-snap-drawer"]');
    expect(drawer?.textContent).toContain('Fondue');
    expect(query(drawer as HTMLElement, '.projected')).toBeTruthy();
    expect(query(root, '[data-testid="map-side-panel"]')).toBeFalsy();
  });

  it('should open in the side panel on a wide screen and close from it', () => {
    mockMatchMedia(true);
    const fixture = render();
    const root = fixture.nativeElement as HTMLElement;

    const panel = query(root, '[data-testid="map-side-panel"]');
    expect(panel?.textContent).toContain('Fondue');
    expect(query(panel as HTMLElement, '.projected')).toBeTruthy();
    expect(query(root, '[data-testid="map-snap-drawer"]')).toBeFalsy();
    expect(query(root, 'bt-map-selection')?.classList).toContain(
      'is-side-panel',
    );

    query(root, '[data-testid="map-side-panel-close"]')?.click();
    expect(fixture.componentInstance.closed).toBe(true);
  });
});
