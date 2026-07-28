import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LeaderboardUser } from 'bite-tribe/leaderboard-data-access';
import { LeaderboardListComponent } from '../leaderboard-list.component';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(LeaderboardListComponent.name, () => {
  let component: LeaderboardListComponent;
  let fixture: ComponentFixture<LeaderboardListComponent>;
  let componentRef: ComponentRef<LeaderboardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderboardListComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaderboardListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort users by biteCount descending', () => {
    const users: LeaderboardUser[] = [
      {
        userId: 'user-1',
        displayName: 'A',
        email: '',
        photoUrl: '',
        public: true,
        biteCount: 3,
      },
      {
        userId: 'user-2',
        displayName: 'B',
        email: '',
        photoUrl: '',
        public: true,
        biteCount: 10,
      },
    ];

    componentRef.setInput('users', users);

    expect(component.rankedUsers().map((user) => user.userId)).toEqual([
      'user-2',
      'user-1',
    ]);
  });

  it('should not mutate the original users input when sorting', () => {
    const users: LeaderboardUser[] = [
      {
        userId: 'user-1',
        displayName: 'A',
        email: '',
        photoUrl: '',
        public: true,
        biteCount: 3,
      },
      {
        userId: 'user-2',
        displayName: 'B',
        email: '',
        photoUrl: '',
        public: true,
        biteCount: 10,
      },
    ];

    componentRef.setInput('users', users);
    component.rankedUsers();

    expect(component.users().map((user) => user.userId)).toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('should run the header progress bar while the spinner shows', () => {
    componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();

    componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeFalsy();
  });

  it('should track image errors by user id', () => {
    component.onImageError('user-1');

    expect(component.imageErroredUserIds().has('user-1')).toBe(true);
  });

  it('should return false for hasImage after an image error', () => {
    const user = {
      userId: 'user-1',
      displayName: 'A',
      email: '',
      photoUrl: 'photo.jpg',
      public: true,
      biteCount: 3,
    };

    component.onImageError(user.userId);

    expect(component.hasImage(user)).toBe(false);
  });
});
