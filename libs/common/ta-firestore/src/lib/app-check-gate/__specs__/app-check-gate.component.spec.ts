import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { AppCheckGateComponent } from '../app-check-gate.component';
import { AppCheckReadinessService } from '../../app-check-readiness.service';

@Injectable()
class TestTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    const translations: Translation = {
      'app-check-blocked-title': "Couldn't load the app",
      'app-check-blocked-message': 'Check your connection and try again.',
      'app-check-retry': 'Try again',
      loading: 'Loading',
    };
    return of(translations);
  }
}

describe(AppCheckGateComponent.name, () => {
  let fixture: ComponentFixture<AppCheckGateComponent>;
  let component: AppCheckGateComponent;
  let readiness: AppCheckReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppCheckGateComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideTransloco({
          config: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          loader: TestTranslocoLoader,
        }),
      ],
    });

    readiness = TestBed.inject(AppCheckReadinessService);
    fixture = TestBed.createComponent(AppCheckGateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate retry to the readiness service', () => {
    const retrySpy = jest.spyOn(readiness, 'retry').mockResolvedValue();

    component.retry();

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const retryButton = (): HTMLElement | null =>
    element().querySelector('.app-check-gate__retry');
  const spinner = (): HTMLElement | null =>
    element().querySelector('.app-check-gate__spinner');

  // Issue #1465: while the app is still trying there is nothing to read and
  // nothing to tap.
  it('should show only the loading screen while the recovery is running', () => {
    readiness.markBlocked();
    fixture.detectChanges();

    expect(spinner()).not.toBeNull();
    expect(retryButton()).toBeNull();
    expect(element().querySelector('.app-check-gate__title')).toBeNull();
    expect(element().querySelector('.app-check-gate__message')).toBeNull();
  });

  it('should offer the message and the retry once the wait is over', () => {
    readiness.markUnavailable();
    fixture.detectChanges();

    expect(spinner()).toBeNull();
    expect(retryButton()).not.toBeNull();
    expect(
      element().querySelector('.app-check-gate__title')?.textContent,
    ).toContain("Couldn't load the app");
  });

  // A tap that changes nothing on screen reads as a button that did nothing.
  it('should go back to the loading screen while a tapped retry is running', () => {
    readiness.markUnavailable();
    readiness.registerRetryHandler(() => new Promise<void>(() => undefined));
    fixture.detectChanges();

    retryButton()?.click();
    fixture.detectChanges();

    expect(spinner()).not.toBeNull();
    expect(retryButton()).toBeNull();
  });
});
