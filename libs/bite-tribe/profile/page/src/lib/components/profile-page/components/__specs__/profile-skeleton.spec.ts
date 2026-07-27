import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ProfileSkeleton } from '../profile-skeleton';

describe(ProfileSkeleton.name, () => {
  let component: ProfileSkeleton;
  let fixture: ComponentFixture<ProfileSkeleton>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(ProfileSkeleton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mirrors the profile header with an avatar and three stat columns', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.avatar-skeleton')).toBeTruthy();
    expect(nativeElement.querySelectorAll('.header-column').length).toBe(3);
  });

  it('mirrors the name, meta, action and about fields', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.name-skeleton')).toBeTruthy();
    expect(nativeElement.querySelector('.meta-skeleton')).toBeTruthy();
    expect(nativeElement.querySelector('.action-skeleton')).toBeTruthy();
    expect(nativeElement.querySelector('.about-skeleton')).toBeTruthy();
  });

  it('mirrors the bites section with a bite skeleton list', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.section-title-skeleton')).toBeTruthy();
    expect(nativeElement.querySelector('bt-bite-skeleton-list')).toBeTruthy();
  });
});
