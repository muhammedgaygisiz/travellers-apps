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
      'app-check-blocked-title': 'Extra security check needed',
      'app-check-blocked-message': 'Check your connection and try again.',
      'app-check-retry': 'Try again',
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

  it('should reflect the retrying state from the readiness service', () => {
    expect(component.isRetrying()).toBe(false);

    // A handler that never resolves keeps the service in the retrying state.
    readiness.registerRetryHandler(() => new Promise<void>(() => undefined));
    void readiness.retry();

    expect(component.isRetrying()).toBe(true);
  });
});
