import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  it('should not block the App Check gate by default', () => {
    expect(component.appCheckReadiness.isBlocked()).toBe(false);
  });

  it('should reflect the blocked state from the readiness service', () => {
    component.appCheckReadiness.markBlocked();

    expect(component.appCheckReadiness.isBlocked()).toBe(true);
  });
});
