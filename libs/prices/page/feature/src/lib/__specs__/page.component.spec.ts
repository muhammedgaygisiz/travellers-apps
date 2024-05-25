import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponent } from '../page.component';
import { addNecessaryIcons } from '@travellers-apps/utils-common';

addNecessaryIcons();

jest.mock('@travellers-apps/prices/localization');

describe('PageComponent', () => {
  let component: PageComponent;
  let fixture: ComponentFixture<PageComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
