import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterToolBarComponent } from './footer-tool-bar.component';

describe('FooterToolBarComponent', () => {
  let component: FooterToolBarComponent;
  let fixture: ComponentFixture<FooterToolBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterToolBarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FooterToolBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
