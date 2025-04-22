import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import * as d3 from 'd3';
import { ChartData } from './api/chart-data';
import { prepareData } from './utils/prepare-data';

const COLORS = {
  success: '#2dd36f', // Ionic default success color
  primary: '#3880ff', // Ionic default primary color
};

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
      this.createChart(chartElement.nativeElement, chartData);
    }
  });

  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }

  createChartEffect = effect(() => {
    const chartElement = this.chart();
    const payments = this.data();

    if (chartElement && payments) {
      const container = chartElement.nativeElement.parentElement;
      this.resizeObserver.observe(container);
      this.createChart(chartElement.nativeElement, payments);
    }
  });

  private createChart(chartElement: HTMLElement, currentData: ChartData[]) {
    const preparedData = prepareData(currentData);

    const container = chartElement.parentElement;

    if (!container) return;

    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    d3.select(chartElement).selectAll('*').remove();

    const svg = d3
      .select(chartElement)
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(preparedData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d: any) => d3.timeFormat('%d.%m.%Y')(d));

    const y = d3
      .scaleLinear()
      .domain([
        Math.min(0, d3.min(preparedData, (d) => d.balance) || 0),
        Math.max(0, d3.max(preparedData, (d) => d.balance) || 0),
      ])
      .range([height, 0]);

    const yAxis = d3.axisLeft(y).ticks(5);

    // Draw balance line
    const line = d3
      .line<ChartData>()
      .x((d) => x(d.date))
      .y((d) => y(d.balance!))
      .curve(d3.curveStepAfter);

    // Inside createChart method
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

    // Filter data correctly
    const actualData = preparedData.filter((d) => {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      return date <= today;
    });

    const futureData = preparedData.filter((d) => {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      return date >= today; // Changed from > to >= to include today's point
    });

    svg
      .append('path')
      .datum(actualData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', COLORS.success)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Draw future data line (dashed)
    svg
      .append('path')
      .datum(futureData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', COLORS.primary)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.3)
      .attr('d', line);

    // Add data points
    svg
      .selectAll('circle')
      .data(preparedData)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.balance!))
      .attr('r', 4)
      .attr('fill', COLORS.primary);

    svg.append('g').attr('transform', `translate(0,${height})`).call(xAxis);
    svg.append('g').call(yAxis);
  }
}
