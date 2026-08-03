import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { GpsErrorCardComponent } from '../gps-error-card.component';

addNecessaryIcons();

/**
 * Echoes every key back, so an assertion names the key the card chose rather
 * than the copy of the day.
 */
@Injectable()
class EchoTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    const keys = [
      'we-could-not-access-your-location',
      'location-permission-denied',
      'enable-location',
      'open-location-settings',
      'retry',
      'close',
    ];

    return of(Object.fromEntries(keys.map((key) => [key, key])) as Translation);
  }
}

describe('GpsErrorCardComponent', () => {
  let component: GpsErrorCardComponent;
  let fixture: ComponentFixture<GpsErrorCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          loader: EchoTranslocoLoader,
        }),
      ],
    });

    fixture = TestBed.createComponent(GpsErrorCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** Selected by test id: the card's button order is not part of its contract. */
  const click = (testId: string): void =>
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>(`[data-testid="${testId}"]`)
      ?.click();

  const textOf = (testId: string): string =>
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>(`[data-testid="${testId}"]`)
      ?.textContent?.trim() ?? '';

  it('should emit retryClick when the retry button is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.retryClick, 'emit');

    click('gps-error-retry');

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit closeClick when the close button is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.closeClick, 'emit');

    click('gps-error-close');

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit enableLocationClick when the enable button is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.enableLocationClick, 'emit');

    // Retry cannot fix a missing permission, so this is the recovery route.
    click('gps-error-enable-location');

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  describe('permission state', () => {
    it('should name the settings handoff when the permission is denied', () => {
      // A denial cannot be re-asked, so the action has to say where it leads.
      fixture.componentRef.setInput('permissionState', 'denied');
      fixture.detectChanges();

      expect(textOf('gps-error-message')).toBe('location-permission-denied');
      expect(textOf('gps-error-enable-location')).toBe(
        'open-location-settings',
      );
    });

    it.each(['prompt', 'unsupported', undefined] as const)(
      'should keep the neutral enable wording for %s',
      (permissionState) => {
        fixture.componentRef.setInput('permissionState', permissionState);
        fixture.detectChanges();

        expect(textOf('gps-error-message')).toBe(
          'we-could-not-access-your-location',
        );
        expect(textOf('gps-error-enable-location')).toBe('enable-location');
      },
    );
  });
});
