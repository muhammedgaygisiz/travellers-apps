import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import * as d3 from 'd3';

interface ChartData {
  date: any;
  amount: number;
  balance?: number; // Cumulative balance
}

const COLORS = {
  success: '#2dd36f', // Ionic default success color
  primary: '#3880ff', // Ionic default primary color
};

@Component({
  selector: 'ta-chart',
  template: ` <div class="chart-container">
    <svg #chart></svg>
  </div>`,
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent {
  private readonly chart = viewChild<ElementRef>('chart');
  data = input<ChartData[]>([]);

  createChartEffect = effect(() => {
    const chartElement = this.chart();
    const payments = this.data();

    if (chartElement && payments) {
      const sortedData = payments
        .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
        .map((payment) => ({
          ...payment,
          date: payment.date.toDate(),
          balance: 0,
        }));

      let balance = 0;
      sortedData.forEach((item) => {
        balance += +item.amount;
        item.balance = balance;
      });

      this.createChart(chartElement.nativeElement, sortedData);
    }
  });

  private createChart(chartElement: HTMLElement, currentData: ChartData[]) {
    const paddedData = [...currentData];
    if (currentData.length > 0) {
      const firstDay = currentData[0];
      const lastDay = currentData[currentData.length - 1];

      // Add day before
      paddedData.unshift({
        date: new Date(firstDay.date.getTime() - 86400000), // subtract 1 day in milliseconds
        amount: 0,
        balance: 0,
      });

      // Add day after
      paddedData.push({
        date: new Date(lastDay.date.getTime() + 86400000), // add 1 day in milliseconds
        amount: 0,
        balance: lastDay.balance,
      });
    }

    d3.select(chartElement).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(chartElement)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(paddedData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d: any) => d3.timeFormat('%d.%m.%Y')(d));

    const y = d3
      .scaleLinear()
      .domain([
        Math.min(0, d3.min(paddedData, (d) => d.balance) || 0),
        Math.max(0, d3.max(paddedData, (d) => d.balance) || 0),
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
    const actualData = paddedData.filter((d) => {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      return date <= today;
    });

    const futureData = paddedData.filter((d) => {
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
      .data(paddedData)
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
