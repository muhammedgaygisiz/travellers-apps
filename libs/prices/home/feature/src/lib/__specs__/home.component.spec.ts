import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from '../components';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { SimpleChange } from '@angular/core';

addNecessaryIcons();

jest.mock('localization');

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    describe('given changed location', () => {
      it('should have location filter', () => {
        component.location = 'Köln';
        component.ngOnChanges({
          location: { currentValue: 'Köln' } as SimpleChange,
        });

        expect(component.filters).toEqual([
          { type: 'location', value: 'Köln' },
        ]);
      });
    });
  });

  describe('onDeleteFilter', () => {
    describe('on delete location filter', () => {
      it('should not have location filter', () => {
        component.filters = [{ type: 'location', value: 'Köln' }];
        component.onDeleteFilter({ type: 'location', value: 'Köln' });

        expect(component.filters).toEqual([]);
      });
    });
  });
});
