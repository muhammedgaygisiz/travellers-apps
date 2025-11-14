import { BucketlistsPage } from '../bucketlists.page';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import SpyInstance = jest.SpyInstance;

jest.mock('localization');
addNecessaryIcons();

describe('BucketlistsPage', () => {
  let component: BucketlistsPage;
  let fixture: ComponentFixture<BucketlistsPage>;
  let componentRef: ComponentRef<BucketlistsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
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
      expect(component.sortingLabel()).toBe('Name');
    });

    it('should return "Date" when sorting is "createdAt"', () => {
      componentRef.setInput('sorting', 'createdAt');
      expect(component.sortingLabel()).toBe('Date');
    });

    it('should return "Name" for any other sorting value', () => {
      componentRef.setInput('sorting', 'otherValue');
      expect(component.sortingLabel()).toBe('Name');
    });
  });

  describe('emitSortingChange', () => {
    it('should emit sortingChange event with the correct value', () => {
      jest.spyOn(component.sortingChange, 'emit');
      const event = { detail: { value: 'createdAt' } };
      component.emitSortingChange(event);
      expect(component.sortingChange.emit).toHaveBeenCalledWith('createdAt');
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

    it('should set isAlertOpen to false', () => {
      component.onNewList(alertResult);
      expect(component.isAlertOpen()).toBe(false);
    });

    it('should emit newList event with the correct value', () => {
      component.onNewList(alertResult);
      expect(newListEmitSpy).toHaveBeenCalledWith('New Bucketlist');
    });
  });

  describe('openAlert', () => {
    it('should set isAlertOpen to true', () => {
      component.isAlertOpen.set(false);
      component.openAlert();
      expect(component.isAlertOpen()).toBe(true);
    });
  });
});
