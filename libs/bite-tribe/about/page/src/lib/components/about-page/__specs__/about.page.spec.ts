import { Component, input, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoTestingModule } from '@jsverse/transloco';
import { GlobeComponent } from 'bite-tribe-common/map/globe';
import { StoreLinksComponent } from 'bite-tribe/store-links';
import { getIonicConfig } from 'utils';
import { AboutPage } from '../about.page';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

// The real globe draws on a canvas jsdom does not have; only its inputs matter.
@Component({ selector: 'bt-globe', template: '' })
class GlobeStub {
  countryCodes = input<string[] | null | undefined>([]);
  autoSpin = input(true);
}

@Component({ selector: 'bt-store-links', template: '' })
class StoreLinksStub {
  surface = input<string>();
}

describe(AboutPage.name, () => {
  let fixture: ComponentFixture<AboutPage>;

  const globe = (): GlobeStub | undefined =>
    fixture.debugElement.query((el) => el.name === 'bt-globe')
      ?.componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // The header bar inside ta-page labels itself through Transloco.
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideIonicAngular(getIonicConfig())],
    })
      .overrideComponent(AboutPage, {
        remove: {
          imports: [TranslocoPipe, GlobeComponent, StoreLinksComponent],
        },
        add: { imports: [MockTranslocoPipe, GlobeStub, StoreLinksStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AboutPage);
  });

  it('shows the globe with every country that has a Bite', () => {
    fixture.componentRef.setInput('biteCountryCodes', ['DE', 'TR']);
    fixture.detectChanges();

    expect(globe()?.countryCodes()).toEqual(['DE', 'TR']);
  });

  it.each([
    ['while the countries load or failed to', undefined],
    ['when no country has a Bite yet', []],
  ])('shows no globe %s', (_case, countryCodes) => {
    fixture.componentRef.setInput('biteCountryCodes', countryCodes);
    fixture.detectChanges();

    expect(globe()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain(
      'total-number-of-bites-on-bite-tribe',
    );
  });

  // GitHub issue #2072: the counts used to be blank while they loaded, and the
  // layout jumped when they arrived.
  describe('loading the counts', () => {
    const byTestId = (id: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

    it('holds a skeleton for each count while it loads', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(byTestId('about-bites-count-skeleton')).not.toBeNull();
      expect(byTestId('about-users-count-skeleton')).not.toBeNull();
      expect(byTestId('about-bites-count')).toBeNull();
    });

    it('runs the header bar while the counts load', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(byTestId('page-loading-bar')).not.toBeNull();
    });

    it('keeps a count it already has on screen while it refreshes', () => {
      fixture.componentRef.setInput('totalNumberUsers', 312);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(byTestId('about-users-count')?.textContent?.trim()).toBe('312');
      expect(byTestId('about-users-count-skeleton')).toBeNull();
      expect(byTestId('about-bites-count-skeleton')).not.toBeNull();
    });

    it('shows the counts once they are read', () => {
      fixture.componentRef.setInput('totalNumberBites', 1284);
      fixture.componentRef.setInput('totalNumberUsers', 312);
      fixture.detectChanges();

      expect(byTestId('about-bites-count')?.textContent?.trim()).toBe('1284');
      expect(byTestId('about-users-count')?.textContent?.trim()).toBe('312');
      expect(byTestId('page-loading-bar')).toBeNull();
    });
  });
});
