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
      expect(component.getTimeRanges(0).at(0).get('from')?.value).toBe('10:00');
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
      component
        .getTimeRanges(0)
        .at(0)
        .patchValue({ from: '09:00', to: '17:00' });

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

  describe('getOpeningHours', () => {
    it('should return the current schedule without emitting', () => {
      const emitSpy = jest.spyOn(component.submitOpeningHours, 'emit');

      const mondayGroup = component.schedule.at(0);
      mondayGroup.patchValue({ isOpen: true });
      component.addTimeRange(0);
      component
        .getTimeRanges(0)
        .at(0)
        .patchValue({ from: '09:00', to: '17:00' });

      const result = component.getOpeningHours();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            day: 'monday',
            isOpen: true,
            timeRanges: [{ from: '09:00', to: '17:00' }],
          }),
        ]),
      );
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  /** GitHub issue #2222: no Save while the schedule is the stored one. */
  describe('Save without a change', () => {
    const saveButton = (): { disabled?: boolean } | null =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'ion-button[data-testid="save-opening-hours"]',
      );

    const STORED: DaySchedule[] = [
      {
        day: 'tuesday',
        isOpen: true,
        timeRanges: [{ from: '10:00', to: '22:00' }],
      },
    ];

    it('disables Save for the stored schedule, missing days read as closed', () => {
      componentRef.setInput('openingHours', STORED);
      fixture.detectChanges();

      expect(saveButton()?.disabled).toBe(true);
    });

    it('disables Save for a restaurant with no hours until a day opens with times', () => {
      fixture.detectChanges();
      expect(saveButton()?.disabled).toBe(true);

      component.schedule.at(0).patchValue({ isOpen: true });
      component.addTimeRange(0);
      component
        .getTimeRanges(0)
        .at(0)
        .patchValue({ from: '11:00', to: '22:00' });
      fixture.detectChanges();
      expect(saveButton()?.disabled).toBe(false);
    });

    it('enables Save once a time changes, and disables it when undone', () => {
      componentRef.setInput('openingHours', STORED);
      fixture.detectChanges();

      const range = component.getTimeRanges(1).at(0);
      range.patchValue({ to: '23:00' });
      fixture.detectChanges();
      expect(saveButton()?.disabled).toBe(false);

      range.patchValue({ to: '22:00' });
      fixture.detectChanges();
      expect(saveButton()?.disabled).toBe(true);
    });

    it('enables Save once a time range is added', () => {
      componentRef.setInput('openingHours', STORED);
      fixture.detectChanges();

      component.addTimeRange(1);
      component
        .getTimeRanges(1)
        .at(1)
        .patchValue({ from: '18:00', to: '23:00' });
      fixture.detectChanges();
      expect(saveButton()?.disabled).toBe(false);
    });
  });

  /**
   * An open day needs its times (GitHub issue #2227): guests are shown a day
   * without them as closed, so the editor asks for them before saving.
   */
  describe('open days without times', () => {
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const saveButton = (): { disabled?: boolean } | null =>
      el().querySelector('ion-button[data-testid="save-opening-hours"]');
    let emitted: jest.Mock;

    beforeEach(() => {
      emitted = jest.fn();
      component.submitOpeningHours.subscribe(emitted);
      fixture.detectChanges();
    });

    it('starts a day ticked open with an empty range to fill in', () => {
      component.schedule.at(2).patchValue({ isOpen: true });
      (component as unknown as { openChanged(i: number): void }).openChanged(2);

      expect(component.getTimeRanges(2).length).toBe(1);
    });

    it('asks for the times of an open day and will not save it', () => {
      component.schedule.at(2).patchValue({ isOpen: true });
      fixture.detectChanges();

      expect(
        el().querySelector('[data-testid="times-needed-wednesday"]'),
      ).toBeTruthy();
      expect(saveButton()?.disabled).toBe(true);
      component.save();
      expect(emitted).not.toHaveBeenCalled();
    });

    it('asks again for a range missing its end', () => {
      component.schedule.at(2).patchValue({ isOpen: true });
      component.addTimeRange(2);
      component.getTimeRanges(2).at(0).patchValue({ from: '11:00' });
      fixture.detectChanges();

      expect(component.complete()).toBe(false);
    });

    it('saves once the day has its times, a range across midnight included', () => {
      component.schedule.at(3).patchValue({ isOpen: true });
      component.addTimeRange(3);
      component
        .getTimeRanges(3)
        .at(0)
        .patchValue({ from: '22:00', to: '02:00' });
      fixture.detectChanges();

      expect(
        el().querySelector('[data-testid="times-needed-thursday"]'),
      ).toBeNull();
      component.save();
      expect(emitted).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            day: 'thursday',
            isOpen: true,
            timeRanges: [{ from: '22:00', to: '02:00' }],
          },
        ]),
      );
    });

    it('lets a day be unticked instead', () => {
      component.schedule.at(2).patchValue({ isOpen: true });
      component.schedule.at(2).patchValue({ isOpen: false });
      fixture.detectChanges();

      expect(component.complete()).toBe(true);
    });
  });

  describe('showSubmit', () => {
    // With every day closed by default, the save button is the only ion-button
    // rendered (add/remove-time-range buttons appear only for open days).
    it('should render the save button by default', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('ion-button').length).toBe(
        1,
      );
    });

    it('should hide the save button when showSubmit is false', () => {
      componentRef.setInput('showSubmit', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('ion-button').length).toBe(
        0,
      );
    });
  });
});
