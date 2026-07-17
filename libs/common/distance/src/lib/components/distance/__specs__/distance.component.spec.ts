import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { DistanceComponent } from '../distance.component';

const toMetricMock = jest.fn();
jest.mock('../../../utils/to-metric', () => ({
  toMetric: (...args: unknown[]): void => toMetricMock(...args),
}));

const roundDistanceMock = jest.fn();
jest.mock('../../../utils/round-distance', () => ({
  roundDistance: (...args: unknown[]): void => roundDistanceMock(...args),
}));

describe('DistanceComponent', () => {
  let component: DistanceComponent;
  let fixture: ComponentFixture<DistanceComponent>;
  let componentRef: ComponentRef<DistanceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(DistanceComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('roundedMetricDistance', () => {
    beforeEach(() => {
      toMetricMock.mockReturnValue('5 km');
      roundDistanceMock.mockReturnValue('5');
    });

    it('should return the rounded metric distance', () => {
      componentRef.setInput('distance', '3.4567');
      expect(component.roundedMetricDistance()).toBe('5 km');
      expect(roundDistanceMock).toHaveBeenCalledWith('3.4567');
      expect(toMetricMock).toHaveBeenCalledWith('5');
    });
  });
});
