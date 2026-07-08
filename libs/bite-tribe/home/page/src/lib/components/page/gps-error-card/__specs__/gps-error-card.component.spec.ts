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

  it('should emit retryClick when the retry button is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.retryClick, 'emit');

    const buttons = fixture.nativeElement.querySelectorAll('ion-button');
    buttons[0].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit closeClick when the close button is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.closeClick, 'emit');

    const buttons = fixture.nativeElement.querySelectorAll('ion-button');
    buttons[1].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
