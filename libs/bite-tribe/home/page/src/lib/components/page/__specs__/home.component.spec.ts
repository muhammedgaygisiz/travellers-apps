import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTribeHomeComponent } from './home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

describe('BiteTribeHomeComponent', () => {
  let component: BiteTribeHomeComponent;
  let fixture: ComponentFixture<BiteTribeHomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(BiteTribeHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
