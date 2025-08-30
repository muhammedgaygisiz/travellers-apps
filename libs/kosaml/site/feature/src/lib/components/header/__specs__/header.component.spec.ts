import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from '../header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onToggleProjectBar', () => {
    it('should emit toggle project bar', () => {
      const emitSpy = jest.spyOn(component.toggleProjectBar, 'emit');

      component.onToggleProjectBar();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
