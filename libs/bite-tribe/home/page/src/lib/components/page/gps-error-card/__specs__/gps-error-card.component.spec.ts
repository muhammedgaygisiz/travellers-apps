import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { GpsErrorCardComponent } from '../gps-error-card.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('GpsErrorCardComponent', () => {
  let component: GpsErrorCardComponent;
  let fixture: ComponentFixture<GpsErrorCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
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
});
