import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpeningHoursComponent } from '../opening-hours.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { DaySchedule } from 'model';
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

describe('OpeningHoursComponent', () => {
  let component: OpeningHoursComponent;
  let fixture: ComponentFixture<OpeningHoursComponent>;
  let componentRef: ComponentRef<OpeningHoursComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(OpeningHoursComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('schedule', () => {
    it('should initialize with all 7 days', () => {
      expect(component.schedule.length).toBe(7);
    });

    it('should default all days to closed', () => {
      component.schedule.controls.forEach((ctrl) => {
        expect(ctrl.get('isOpen')?.value).toBe(false);
      });
    });
  });

  describe('initOpeningHours', () => {
    it('should populate schedule from input', () => {
      const hours: DaySchedule[] = [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '10:00', to: '12:00' }],
        },
        { day: 'tuesday', isOpen: false, timeRanges: [] },
      ];

      componentRef.setInput('openingHours', hours);
      componentRef.changeDetectorRef.detectChanges();

      const mondayGroup = component.schedule.at(0);
      expect(mondayGroup.get('isOpen')?.value).toBe(true);
      expect(component.getTimeRanges(0).length).toBe(1);
      expect(component.getTimeRanges(0).at(0).get('from')?.value).toBe(
        '10:00',
      );
    });

    it('should keep days not in input as closed', () => {
      componentRef.setInput('openingHours', []);
      componentRef.changeDetectorRef.detectChanges();

      component.schedule.controls.forEach((ctrl) => {
        expect(ctrl.get('isOpen')?.value).toBe(false);
      });
    });
  });

  describe('addTimeRange', () => {
    it('should add a time range to the given day', () => {
      expect(component.getTimeRanges(0).length).toBe(0);
      component.addTimeRange(0);
      expect(component.getTimeRanges(0).length).toBe(1);
    });
  });

  describe('removeTimeRange', () => {
    it('should remove a time range from the given day', () => {
      component.addTimeRange(0);
      component.addTimeRange(0);
      expect(component.getTimeRanges(0).length).toBe(2);
      component.removeTimeRange(0, 0);
      expect(component.getTimeRanges(0).length).toBe(1);
    });
  });

  describe('save', () => {
    it('should emit submitOpeningHours with the current schedule', () => {
      const emitSpy = jest.spyOn(component.submitOpeningHours, 'emit');
      component.save();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ day: 'monday', isOpen: false }),
        ]),
      );
    });

    it('should emit correct data after changes', () => {
      const emitSpy = jest.spyOn(component.submitOpeningHours, 'emit');

      const mondayGroup = component.schedule.at(0);
      mondayGroup.patchValue({ isOpen: true });
      component.addTimeRange(0);
      component.getTimeRanges(0).at(0).patchValue({ from: '09:00', to: '17:00' });

      component.save();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            day: 'monday',
            isOpen: true,
            timeRanges: [{ from: '09:00', to: '17:00' }],
          }),
        ]),
      );
    });
  });
});
