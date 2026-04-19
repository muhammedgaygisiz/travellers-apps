import { BucketlistsPage } from '../bucketlists.page';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
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

  describe('sortingLabel', () => {
    it('should return "Name" when sorting is "name"', () => {
      componentRef.setInput('sorting', 'name');
      expect(component.sortingLabel()).toBe('name');
    });

    it('should return "Date" when sorting is "createdAt"', () => {
      componentRef.setInput('sorting', 'createdAt');
      expect(component.sortingLabel()).toBe('date');
    });

    it('should return "Name" for any other sorting value', () => {
      componentRef.setInput('sorting', 'otherValue');
      expect(component.sortingLabel()).toBe('name');
    });
  });

  describe('emitSortingChange', () => {
    it('should emit sortingChange event with the correct value', () => {
      jest.spyOn(component.sortingChange, 'emit');
      const event = { detail: { value: 'createdAt' } };
      component.emitSortingChange(event);
      expect(component.sortingChange.emit).toHaveBeenCalledWith('createdAt');
    });

    it('should not emit sortingChange event if detail is missing', () => {
      jest.spyOn(component.sortingChange, 'emit');
      const event = { detail: null } as any;
      component.emitSortingChange(event);
      expect(component.sortingChange.emit).not.toHaveBeenCalled();
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
