import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Migrations } from '../migrations';
import { provideIonicAngular } from '@ionic/angular/standalone';

jest.mock('localization');

describe('Migrations', () => {
  let component: Migrations;
  let fixture: ComponentFixture<Migrations>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(Migrations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
