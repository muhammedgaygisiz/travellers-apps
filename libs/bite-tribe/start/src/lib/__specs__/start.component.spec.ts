import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartComponent } from '../start.component';
import { provideRouter } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BiteTribeStartComponent', () => {
  let component: StartComponent;
  let fixture: ComponentFixture<StartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(StartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call FirebaseAnalytics.setCurrentScreen on ionViewDidEnter', () => {
    const spy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    component.ionViewDidEnter();
    expect(spy).toHaveBeenCalledWith({
      screenName: 'Start',
    });
  });
});
