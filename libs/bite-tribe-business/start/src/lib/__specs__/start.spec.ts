import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Start } from '../start';
import { provideRouter } from '@angular/router';

describe('Start', () => {
  let component: Start;
  let fixture: ComponentFixture<Start>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Start);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
