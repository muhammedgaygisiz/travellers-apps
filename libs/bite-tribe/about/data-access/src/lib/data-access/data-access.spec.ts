import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataAccess } from './data-access';

describe('DataAccess', () => {
  let component: DataAccess;
  let fixture: ComponentFixture<DataAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataAccess],
    }).compileComponents();

    fixture = TestBed.createComponent(DataAccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
