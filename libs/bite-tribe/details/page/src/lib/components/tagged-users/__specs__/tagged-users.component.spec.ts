import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { PublicUser } from 'model';
import { TaggedUsersComponent } from '../tagged-users.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const user = (userId: string): PublicUser =>
  ({ userId, displayName: userId.toUpperCase(), public: true }) as PublicUser;

describe('TaggedUsersComponent', () => {
  let fixture: ComponentFixture<TaggedUsersComponent>;

  const names = (): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="tagged-user"]'),
    ).map((element) => (element as HTMLElement).textContent?.trim() ?? '');

  const render = (users: PublicUser[]): void => {
    fixture.componentRef.setInput('users', users);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(TaggedUsersComponent);
  });

  it('renders no row when nobody is visible', () => {
    render([]);

    expect(
      fixture.nativeElement.querySelector('[data-testid="tagged-users"]'),
    ).toBeNull();
  });

  it('shows the display names of the tagged users', () => {
    render([user('anna'), user('ben')]);

    expect(names()).toEqual(['ANNA', 'BEN']);
    expect(
      fixture.nativeElement.querySelector('[data-testid="tagged-users-more"]'),
    ).toBeNull();
  });

  it('opens the profile of the name that was tapped', () => {
    const opened: PublicUser[] = [];
    fixture.componentInstance.openProfile.subscribe((u) => opened.push(u));
    render([user('anna'), user('ben')]);

    (
      fixture.nativeElement.querySelectorAll(
        '[data-testid="tagged-user"]',
      )[1] as HTMLElement
    ).click();

    expect(opened.map((u) => u.userId)).toEqual(['ben']);
  });

  it('folds everybody past the second into "+N" and unfolds on tap', () => {
    render([user('anna'), user('ben'), user('cem'), user('dana')]);

    expect(names()).toEqual(['ANNA', 'BEN']);
    expect(fixture.componentInstance.hiddenCount()).toBe(2);

    (
      fixture.nativeElement.querySelector(
        '[data-testid="tagged-users-more"]',
      ) as HTMLElement
    ).click();
    fixture.detectChanges();

    expect(names()).toEqual(['ANNA', 'BEN', 'CEM', 'DANA']);
  });
});
