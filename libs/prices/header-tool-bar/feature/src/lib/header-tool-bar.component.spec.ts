import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderToolBarComponent } from './header-tool-bar.component';

describe('HeaderToolBarComponent', () => {
  let component: HeaderToolBarComponent;
  let fixture: ComponentFixture<HeaderToolBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderToolBarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderToolBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
