import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from '../components';
import { addNecessaryIcons } from '@travellers-apps/utils-common';

addNecessaryIcons();

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
