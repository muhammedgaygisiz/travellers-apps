import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Migrations } from '../migrations';

describe('Migrations', () => {
  let component: Migrations;
  let fixture: ComponentFixture<Migrations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Migrations],
    }).compileComponents();

    fixture = TestBed.createComponent(Migrations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
