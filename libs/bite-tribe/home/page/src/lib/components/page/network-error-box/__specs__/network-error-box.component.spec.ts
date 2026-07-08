import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { NetworkErrorBoxComponent } from '../network-error-box.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('NetworkErrorBoxComponent', () => {
  let component: NetworkErrorBoxComponent;
  let fixture: ComponentFixture<NetworkErrorBoxComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(NetworkErrorBoxComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the offline message', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-text')).toBeTruthy();
  });
});
