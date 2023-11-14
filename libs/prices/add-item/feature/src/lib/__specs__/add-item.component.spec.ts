import { AddItemComponent } from '../components/add-item.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addNecessaryIcons } from '@travellers-apps/utils-common';

addNecessaryIcons();

describe('AddItemComponent', () => {
  let component: AddItemComponent;
  let fixture: ComponentFixture<AddItemComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
