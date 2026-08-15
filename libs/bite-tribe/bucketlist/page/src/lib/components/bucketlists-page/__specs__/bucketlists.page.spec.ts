import { BucketlistsPage } from '../bucketlists.page';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Bucketlist } from 'model';
import SpyInstance = jest.SpyInstance;
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BucketlistsPage', () => {
  let component: BucketlistsPage;
  let fixture: ComponentFixture<BucketlistsPage>;
  let componentRef: ComponentRef<BucketlistsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(BucketlistsPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleSearch', () => {
    it('should open the searchbar', () => {
      component.toggleSearch();
      expect(component.isSearchVisible()).toBe(true);
    });

    it('should drop the term when the searchbar is closed again', () => {
      component.toggleSearch();
      component.searchTerm.set('Malta');

      component.toggleSearch();

      expect(component.isSearchVisible()).toBe(false);
      expect(component.searchTerm()).toBe('');
    });
  });

  describe('clearSearch', () => {
    it('should drop the term but keep the searchbar open', () => {
      component.toggleSearch();
      component.searchTerm.set('Malta');

      component.clearSearch();

      expect(component.searchTerm()).toBe('');
      expect(component.isSearchVisible()).toBe(true);
    });
  });

  describe('onSearchInput', () => {
    it('should take the term from the input element', () => {
      const input = document.createElement('input');
      input.value = 'Malta';
      const event = { target: input } as unknown as Event;

      component.onSearchInput(event);

      expect(component.searchTerm()).toBe('Malta');
    });
  });

  describe('filteredBucketlists', () => {
    const BUCKETLISTS = [
      { id: '1', name: 'Malta' },
      { id: '2', name: 'Cologne' },
      { id: '3', name: 'Kosovo' },
    ] as Bucketlist[];

    beforeEach(() => {
      componentRef.setInput('bucketlists', BUCKETLISTS);
    });

    it('should return every bucketlist when no term is entered', () => {
      expect(component.filteredBucketlists()).toEqual(BUCKETLISTS);
    });

    it('should match a bucketlist name case insensitively', () => {
      component.searchTerm.set('malt');
      expect(component.filteredBucketlists()).toEqual([BUCKETLISTS[0]]);
    });

    it('should match a bucketlist name with a typo', () => {
      component.searchTerm.set('Cologn');
      expect(component.filteredBucketlists()).toEqual([BUCKETLISTS[1]]);
    });

    it('should return nothing when no bucketlist matches', () => {
      component.searchTerm.set('Reykjavik');
      expect(component.filteredBucketlists()).toEqual([]);
    });
  });

  describe('onCancel', () => {
    it('should set isAlertOpen to false', () => {
      component.isAlertOpen.set(true);
      component.onCancel();
      expect(component.isAlertOpen()).toBe(false);
    });
  });

  describe('onNewList', () => {
    let newListEmitSpy: SpyInstance;
    const alertResult = ['New Bucketlist'];

    beforeEach(() => {
      newListEmitSpy = jest.spyOn(component.newList, 'emit');
      component.isAlertOpen.set(true);
    });

    it('should not emit newList event if the name is empty', () => {
      component.onNewList(['   ']);
      expect(newListEmitSpy).not.toHaveBeenCalled();
    });

    it('should set isAlertOpen to false', () => {
      component.onNewList(alertResult);
      expect(component.isAlertOpen()).toBe(false);
    });

    it('should emit newList event with the correct value', () => {
      component.onNewList(alertResult);
      expect(newListEmitSpy).toHaveBeenCalledWith('New Bucketlist');
    });

    it('should not emit newList event if alertResult is empty', () => {
      component.onNewList([]);
      expect(newListEmitSpy).not.toHaveBeenCalled();
    });
  });

  describe('openAlert', () => {
    it('should set isAlertOpen to true', () => {
      component.isAlertOpen.set(false);
      component.openAlert();
      expect(component.isAlertOpen()).toBe(true);
    });
  });

  describe('openDeleteConfirmation', () => {
    it('should set bucketlistToDelete and isDeleteAlertOpen', () => {
      const bucketlistId = '123';
      const event = new Event('click');
      component.openDeleteConfirmation(bucketlistId, event);
      expect(component.bucketlistToDelete()).toBe(bucketlistId);
      expect(component.isDeleteAlertOpen()).toBe(true);
    });

    it('should stop event propagation', () => {
      const bucketlistId = '123';
      const event = new Event('click');
      jest.spyOn(event, 'stopPropagation');
      component.openDeleteConfirmation(bucketlistId, event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('handleDeleteConfirmationDismiss', () => {
    describe('given confirmation was not clicked', () => {
      it('should not emit deleteBucketlist event', () => {
        const event = new CustomEvent('dismiss', {
          detail: { role: 'cancel' },
        });
        jest.spyOn(component.deleteBucketlist, 'emit');
        component.handleDeleteConfirmationDismiss(event);
        expect(component.deleteBucketlist.emit).not.toHaveBeenCalled();
      });
    });

    describe('given confirmation was clicked', () => {
      it('should emit deleteBucketlist event with the correct id', () => {
        const bucketlistId = '123';
        component.bucketlistToDelete.set(bucketlistId);
        const event = new CustomEvent('dismiss', {
          detail: { role: 'delete' },
        });
        jest.spyOn(component.deleteBucketlist, 'emit');
        component.handleDeleteConfirmationDismiss(event);
        expect(component.deleteBucketlist.emit).toHaveBeenCalledWith(
          bucketlistId,
        );
      });
    });
  });

  describe('onEditBucketlist', () => {
    it('should stop event propagation', () => {
      const bucketlistId = '123';
      const event = new Event('click');
      jest.spyOn(event, 'stopPropagation');
      const editBucketlistEmitSpy = jest.spyOn(
        component.editBucketlist,
        'emit',
      );
      component.onEditBucketlist(bucketlistId, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(editBucketlistEmitSpy).toHaveBeenCalledWith(bucketlistId);
    });
  });

  describe('onRateBucketlist', () => {
    it('should stop event propagation and emit rateBucketlist', () => {
      const bucketlistId = '123';
      const event = new Event('click');
      jest.spyOn(event, 'stopPropagation');
      const rateBucketlistEmitSpy = jest.spyOn(
        component.rateBucketlist,
        'emit',
      );

      component.onRateBucketlist(bucketlistId, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(rateBucketlistEmitSpy).toHaveBeenCalledWith(bucketlistId);
    });
  });
});
