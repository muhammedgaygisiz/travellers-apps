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
import { AuthStorageGateComponent } from '../auth-storage-gate.component';

const TRANSLATIONS: Translation = {
  'auth-storage-stuck-title': "Your browser's storage isn't responding",
  'auth-storage-stuck-message':
    'Another BiteTribe tab may be holding it. Close your other BiteTribe tabs and reload.',
  'auth-storage-stuck-reload': 'Reload',
};

@Injectable()
class TestTranslocoLoader implements TranslocoLoader {
  getTranslation(): ReturnType<TranslocoLoader['getTranslation']> {
    return of(TRANSLATIONS);
  }
}

describe(AuthStorageGateComponent.name, () => {
  let fixture: ComponentFixture<AuthStorageGateComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AuthStorageGateComponent],
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

    fixture = TestBed.createComponent(AuthStorageGateComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should say what is wrong and what to do, as an alert', () => {
    const alert: HTMLElement =
      fixture.nativeElement.querySelector('[role="alert"]');

    expect(alert.textContent).toContain(
      TRANSLATIONS['auth-storage-stuck-title'],
    );
    expect(alert.textContent).toContain(
      TRANSLATIONS['auth-storage-stuck-message'],
    );
  });

  it('should reload the page from its button', () => {
    const reload = jest
      .spyOn(fixture.componentInstance, 'reload')
      .mockImplementation(() => undefined);

    fixture.nativeElement.querySelector('.auth-storage-gate__reload').click();

    expect(reload).toHaveBeenCalled();
  });
});
