import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { getIonicConfig } from 'utils';
import { RetryUploadButtonComponent } from '../retry-upload-button.component';

/** GitHub issue #1953. */
describe(RetryUploadButtonComponent.name, () => {
  let fixture: ComponentFixture<RetryUploadButtonComponent>;

  const button = (): HTMLElement =>
    fixture.nativeElement.querySelector('ion-button');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RetryUploadButtonComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'retry-upload': 'Retry upload',
              'retry-upload-short': 'Retry',
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(RetryUploadButtonComponent);
  });

  it('says "Retry upload" by default', () => {
    fixture.detectChanges();

    expect(button().textContent?.trim()).toBe('Retry upload');
  });

  it('says the short label where there is no room, and the full one to a screen reader', () => {
    fixture.componentRef.setInput('short', true);
    fixture.detectChanges();

    expect(button().textContent?.trim()).toBe('Retry');
    expect(button().getAttribute('aria-label')).toBe('Retry upload');
  });

  it('asks for a retry without the tap reaching the surface behind it', () => {
    fixture.detectChanges();
    const retry = jest.fn();
    const behind = jest.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.nativeElement.addEventListener('click', behind);

    button().click();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(behind).not.toHaveBeenCalled();
  });
});
