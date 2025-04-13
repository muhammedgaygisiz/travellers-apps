import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AppComponent } from '../app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent, RouterModule.forRoot([])],
    });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });
});
