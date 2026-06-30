import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BiteSkeletonListComponent } from '../bite-skeleton-list.component';

describe('BiteSkeletonListComponent', () => {
  let fixture: ComponentFixture<BiteSkeletonListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BiteSkeletonListComponent],
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(BiteSkeletonListComponent);
    fixture.detectChanges();
  });

  it('should render three bite skeleton cards', () => {
    expect(
      fixture.nativeElement.querySelectorAll('[data-cy="bite-loading-card"]'),
    ).toHaveLength(3);
  });
});
