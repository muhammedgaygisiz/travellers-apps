import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Injectable } from '@angular/core';
import {
  provideTransloco,
  TranslocoLoader,
  TranslocoService,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { GLOBE_OUTLINE_LOADER } from 'bite-tribe-common/map/globe';
import { WorldComponent } from '../world.component';

/** Copied from `en.json`. */
@Injectable()
class WorldTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of({
      'your-world': 'Your Bite World',
      'users-world': "{{name}}'s Bite World",
      countries: 'Countries',
      continents: 'Continents',
    });
  }
}

/** GitHub issue #1787. */
describe(WorldComponent.name, () => {
  let fixture: ComponentFixture<WorldComponent>;

  const text = (testId: string): string | undefined =>
    (fixture.nativeElement as HTMLElement)
      .querySelector(`[data-testid="${testId}"]`)
      ?.textContent?.trim();

  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: { availableLangs: ['en', 'de'], defaultLang: 'en' },
          loader: WorldTranslocoLoader,
        }),
        // The outlines never arrive: this page is about what surrounds them.
        {
          provide: GLOBE_OUTLINE_LOADER,
          useValue: (): Promise<never> => new Promise(() => undefined),
        },
      ],
    });
    fixture = TestBed.createComponent(WorldComponent);
    fixture.componentRef.setInput('autoSpin', false);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call the own globe "Your Bite World"', () => {
    fixture.componentRef.setInput('isOwnProfile', true);
    fixture.detectChanges();

    expect(text('world-title')).toBe('Your Bite World');
  });

  it("should name somebody else's globe after them", () => {
    fixture.componentRef.setInput('isOwnProfile', false);
    fixture.componentRef.setInput('displayName', 'Leela');
    fixture.detectChanges();

    expect(text('world-title')).toBe("Leela's Bite World");
  });

  it('should count the distinct countries and the continents they lie on', () => {
    fixture.componentRef.setInput('countryCodes', [
      'AT',
      'de',
      'DE',
      'TH',
      'US',
    ]);
    fixture.detectChanges();

    expect(text('world-country-count')).toBe('4');
    expect(text('world-continent-count')).toBe('3');
  });

  it('should name the tapped country in the app language', () => {
    TestBed.inject(TranslocoService).setActiveLang('de');
    fixture.componentInstance.selectedCountryCode.set('CH');
    fixture.detectChanges();

    expect(text('world-country-name')).toBe('Schweiz');
  });

  it('should name no country before one is tapped', () => {
    fixture.detectChanges();

    expect(text('world-country-name')).toBe('');
  });

  it('should show a spinner instead of the globe while the profile loads', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('ion-spinner')).not.toBeNull();
    expect(element.querySelector('bt-globe')).toBeNull();
  });
  describe('the country list', () => {
    const rows = (): string[] =>
      [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-testid="world-country-row"]',
        ),
      ].map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim());

    it('should list the countries with the most Bites first', () => {
      fixture.componentRef.setInput('countryCodes', ['AT', 'TH', 'JP']);
      fixture.componentRef.setInput('biteCounts', { AT: 1, TH: 5, JP: 2 });
      fixture.detectChanges();

      expect(rows()).toEqual(['Thailand 5', 'Japan 2', 'Austria 1']);
    });

    it('should list the countries by name while the Bites are counted', () => {
      fixture.componentRef.setInput('countryCodes', ['TH', 'AT', 'JP']);
      fixture.detectChanges();

      expect(rows()).toEqual(['Austria', 'Japan', 'Thailand']);
    });

    it('should count a flagged country without counted Bites as 0', () => {
      fixture.componentRef.setInput('countryCodes', ['AT', 'TH']);
      fixture.componentRef.setInput('biteCounts', { AT: 2 });
      fixture.detectChanges();

      expect(rows()).toEqual(['Austria 2', 'Thailand 0']);
    });

    it('should select the country of a tapped row and report the tap', () => {
      const taps: unknown[] = [];

      fixture.componentInstance.countryTap.subscribe((tap) => taps.push(tap));
      fixture.componentRef.setInput('countryCodes', ['AT', 'TH']);
      fixture.componentRef.setInput('biteCounts', { AT: 1, TH: 5 });
      fixture.detectChanges();

      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="world-country-row"]',
        ) as HTMLElement
      ).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedCountryCode()).toBe('TH');
      expect(taps).toEqual([
        { countryCode: 'TH', visited: true, source: 'list' },
      ]);
    });

    it('should report a tap on the globe as one', () => {
      const taps: unknown[] = [];

      fixture.componentInstance.countryTap.subscribe((tap) => taps.push(tap));
      fixture.componentInstance.onGlobeTap({
        countryCode: 'NO',
        visited: false,
      });

      expect(taps).toEqual([
        { countryCode: 'NO', visited: false, source: 'globe' },
      ]);
    });

    it('should list nothing for a profile without countries', () => {
      fixture.componentRef.setInput('countryCodes', []);
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="world-countries"]',
        ),
      ).toBeNull();
    });
  });
});
