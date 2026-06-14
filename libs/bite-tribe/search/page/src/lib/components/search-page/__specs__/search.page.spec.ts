import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { SearchbarInputEventDetail } from '@ionic/core';
import type { PublicUser } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { SearchPage } from '../search.page';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(SearchPage.name, () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;
  let componentRef: ComponentRef<SearchPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create with default input values', () => {
    expect(component).toBeTruthy();
    expect(component.users()).toEqual([]);
    expect(component.isLoading()).toBe(false);
    expect(component.hasSearched()).toBe(false);
  });

  describe('sortedUsers', () => {
    it('should sort users by display name without mutating the input', () => {
      const users: PublicUser[] = [
        {
          userId: 'charlie',
          displayName: 'Charlie',
          email: 'charlie@example.com',
          photoUrl: '',
        },
        {
          userId: 'alice',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
        {
          userId: 'bob',
          displayName: 'Bob',
          email: 'bob@example.com',
          photoUrl: '',
        },
      ];
      componentRef.setInput('users', users);

      expect(component.sortedUsers().map((user) => user.displayName)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
      expect(component.users()).toBe(users);
      expect(users.map((user) => user.displayName)).toEqual([
        'Charlie',
        'Alice',
        'Bob',
      ]);
    });

    it('should treat a missing display name as an empty string', () => {
      componentRef.setInput('users', [
        {
          userId: 'named',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
        {
          userId: 'unnamed',
          email: 'unnamed@example.com',
          photoUrl: '',
        } as PublicUser,
      ]);

      expect(component.sortedUsers().map((user) => user.userId)).toEqual([
        'unnamed',
        'named',
      ]);
    });
  });

  describe('searchbarInput', () => {
    it('should emit the entered search text', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: 'Alice' },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('Alice');
    });

    it('should emit an empty string when the input has no value', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: null },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('onImageError', () => {
    it('should add the user id without mutating the previous set', () => {
      const previousIds = component.imageErroredUserIds();

      component.onImageError('user-1');

      expect(component.imageErroredUserIds()).not.toBe(previousIds);
      expect(previousIds.size).toBe(0);
      expect(component.imageErroredUserIds().has('user-1')).toBe(true);
    });

    it('should retain user ids from previous image errors', () => {
      component.onImageError('user-1');
      component.onImageError('user-2');

      expect([...component.imageErroredUserIds()]).toEqual([
        'user-1',
        'user-2',
      ]);
    });
  });
});
