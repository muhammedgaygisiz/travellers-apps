import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ComponentRef } from '@angular/core';
import { BiteSkeletonListComponent } from '../bite-skeleton-list.component';

describe('BiteSkeletonListComponent', () => {
  let fixture: ComponentFixture<BiteSkeletonListComponent>;
  let componentRef: ComponentRef<BiteSkeletonListComponent>;

  const getCards = (): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="bite-loading-card"]',
      ),
    );

  const getSkeletons = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('bt-bite-skeleton'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BiteSkeletonListComponent],
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(BiteSkeletonListComponent);
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should render three bite skeleton cards', () => {
    expect(getCards()).toHaveLength(3);
  });

  /**
   * The extra skeletons are rendered at every width and hidden by a media
   * query, so the DOM holds the desktop count and CSS decides what is seen.
   * The marker class is that CSS hook.
   */
  it('renders the desktop count and marks the extras', async () => {
    componentRef.setInput('desktopCount', 6);
    await fixture.whenStable();

    const skeletons = getSkeletons();
    expect(skeletons).toHaveLength(6);
    expect(
      skeletons.filter((s) => s.classList.contains('desktop-only')),
    ).toHaveLength(3);
  });

  it('marks nothing desktop-only when both counts agree', async () => {
    componentRef.setInput('count', 4);
    componentRef.setInput('desktopCount', 4);
    await fixture.whenStable();

    expect(getSkeletons()).toHaveLength(4);
    expect(
      getSkeletons().filter((s) => s.classList.contains('desktop-only')),
    ).toHaveLength(0);
  });

  // A desktop count below the mobile one would otherwise drop skeletons that
  // the narrow layout still needs.
  it('never renders fewer than the mobile count', async () => {
    componentRef.setInput('count', 3);
    componentRef.setInput('desktopCount', 1);
    await fixture.whenStable();

    expect(getSkeletons()).toHaveLength(3);
  });
});
