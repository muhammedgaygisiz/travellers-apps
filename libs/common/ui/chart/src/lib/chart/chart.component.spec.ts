import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartComponent } from './chart.component';
import { Timestamp } from '@angular/fire/firestore';
import { ComponentRef } from '@angular/core';
import { ChartData } from './api/chart-data';

describe('ChartComponent', () => {
  let component: ChartComponent;
  let fixture: ComponentFixture<ChartComponent>;
  let componentRef: ComponentRef<ChartComponent>;
  // eslint-disable-next-line no-unused-vars
  let resizeObserverCallback: (entries: ResizeObserverEntry[]) => void;

  beforeEach(() => {
    // Mock ResizeObserver with callback capture
    global.ResizeObserver = class MockResizeObserver {
      // eslint-disable-next-line no-unused-vars
      constructor(callback: (entries: ResizeObserverEntry[]) => void) {
        resizeObserverCallback = callback;
      }
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      observe() {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      unobserve() {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      disconnect() {}
    } as any;

    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort and process data with balances', () => {
    const mockData = [
      { date: Timestamp.fromDate(new Date('2024-03-02')), amount: 100 },
      { date: Timestamp.fromDate(new Date('2024-03-01')), amount: 50 },
    ];

    componentRef.setInput('data', mockData);
    fixture.detectChanges();

    const chartElement = fixture.nativeElement.querySelector('svg');
    expect(chartElement).toBeTruthy();
  });

  it('should handle empty data array', () => {
    componentRef.setInput('data', []);
    fixture.detectChanges();

    const chartElement = fixture.nativeElement.querySelector('svg');
    expect(chartElement).toBeNull();
  });

  it('should create chart with padded data and correct domains', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mockData = [
      {
        date: Timestamp.fromDate(today),
        amount: 100,
      },
      {
        date: Timestamp.fromDate(tomorrow),
        amount: 50,
      },
    ];

    componentRef.setInput('data', mockData);
    fixture.detectChanges();

    const paths = fixture.nativeElement.querySelectorAll('path');
    expect(paths.length).toBe(4);
  });

  it('should handle negative balances', () => {
    const mockData = [
      { date: Timestamp.fromDate(new Date()), amount: -100 },
      { date: Timestamp.fromDate(new Date()), amount: -50 },
    ];

    componentRef.setInput('data', mockData);
    fixture.detectChanges();

    const circles = fixture.nativeElement.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('should handle resize observer callback without data', () => {
    const mockData: ChartData[] = [];
    componentRef.setInput('data', mockData);
    fixture.detectChanges();

    resizeObserverCallback([]);
    expect(component).toBeTruthy();
  });

  it('should handle resize observer callback with data', () => {
    const mockData = [{ date: Timestamp.fromDate(new Date()), amount: 100 }];
    componentRef.setInput('data', mockData);
    fixture.detectChanges();

    resizeObserverCallback([]);
    const chartElement = fixture.nativeElement.querySelector('svg');
    expect(chartElement).toBeTruthy();
  });

  it('should disconnect resize observer on destroy', () => {
    const disconnectSpy = jest.spyOn(
      global.ResizeObserver.prototype,
      'disconnect'
    );
    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
