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
});
