import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BiteSkeletonComponent } from '../bite-skeleton.component';

describe('BiteSkeletonComponent', () => {
  let fixture: ComponentFixture<BiteSkeletonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BiteSkeletonComponent],
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(BiteSkeletonComponent);
    fixture.detectChanges();
  });

  it('should render a bite shaped loading card', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="bite-loading-card"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelectorAll('ion-skeleton-text'),
    ).toHaveLength(5);
  });
});
