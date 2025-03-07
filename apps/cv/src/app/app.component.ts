import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

const calculateYearsFrom2005ToToday = () => {
  const fromYear = 2005;

  const currentYear = new Date().getFullYear();

  const result = [];
  for (let i = fromYear; i < currentYear; i++) {
    result.push(i);
  }

  return result;
};

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  years = calculateYearsFrom2005ToToday();
}
