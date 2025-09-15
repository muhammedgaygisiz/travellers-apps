import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { ChartData } from './api/chart-data';
import { createChart } from './utils/create-chart';

@Component({
  selector: 'ta-chart',
  template: ` <div class="chart-container">
    @if (data().length) {
    <svg #chart></svg>
    } @else {
    <div class="no-payments">No payments</div>
    }
  </div>`,
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnDestroy {
  private readonly chart = viewChild<ElementRef>('chart');
  data = input<ChartData[]>([]);

  private readonly resizeObserver = new ResizeObserver(() => {
    const chartElement = this.chart();
    const chartData = this.data();

    if (chartElement?.nativeElement && chartData.length) {
      createChart(chartElement.nativeElement, chartData);
    }
  });

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  createChartEffect = effect(() => {
    const chartElement = this.chart();
    const payments = this.data();

    if (chartElement && payments) {
      const container = chartElement.nativeElement.parentElement;
      this.resizeObserver.observe(container);
      createChart(chartElement.nativeElement, payments);
    }
  });
}
