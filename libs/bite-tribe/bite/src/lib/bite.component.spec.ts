import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeBiteComponent } from './bite.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { provideRouter } from '@angular/router';

describe('BiteTribeBiteComponent', () => {
  let component: BiteTribeBiteComponent;
  let fixture: ComponentFixture<BiteTribeBiteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig()), provideRouter([])],
    });
    fixture = TestBed.createComponent(BiteTribeBiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
