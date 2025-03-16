import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DurationPipe } from './duration.pipe';
import { Project } from './project';
import { APU, AUSBILDUNG, AXA, FH, NLI, PERFOOD, TIMS, TRIP } from './projects';

interface Edution {
  id: number;
  from: number;
  to: number;
  institution: string;
  program: string;
  degree: string;
}

const MASTER: Edution = {
  id: 1,
  from: 2011,
  to: 2015,
  institution: 'Cologne University of Applied Sciences',
  program: 'Software Engineering',
  degree: 'Master of Science',
};
const BACHELOR: Edution = {
  id: 2,
  from: 2008,
  to: 2011,
  institution: 'Cologne University of Applied Sciences',
  program: 'Business Informatics and General Informatics',
  degree: 'Bachelor of Science',
};
const APPRENTICE: Edution = {
  id: 3,
  from: 2005,
  to: 2008,
  institution: 'IGMG e.V.',
  program: 'IT Specialist',
  degree: 'IT Specialist in the field of Software Development',
};

@Component({
  imports: [RouterModule, DatePipe, DurationPipe, DecimalPipe],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  projects: Project[] = [APU, PERFOOD, TRIP, TIMS, AXA, NLI, FH, AUSBILDUNG];

  educations: Edution[] = [MASTER, BACHELOR, APPRENTICE];
}
