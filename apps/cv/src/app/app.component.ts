import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DurationPipe } from './duration.pipe';
import { Project } from './project';
import { APU, AUSBILDUNG, AXA, FH, NLI, PERFOOD, TIMS, TRIP } from './projects';

@Component({
  standalone: true,
  imports: [RouterModule, DatePipe, DurationPipe, DecimalPipe],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  projects: Project[] = [APU, PERFOOD, TRIP, TIMS, AXA, NLI, FH, AUSBILDUNG];
}
