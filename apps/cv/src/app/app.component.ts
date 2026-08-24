import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DurationPipe } from './duration.pipe';
import { Project } from './project';
import {
  APU,
  AUSBILDUNG,
  AXA,
  CORIX,
  FH,
  NLI,
  PERFOOD,
  TIMS,
  TRIP,
} from './projects';
import {
  JAVA,
  JAVASCRIPT,
  REST,
  SPRING,
  TYPESCRIPT,
  REACT,
  ANGULAR,
  HTML,
} from './technologies';
import { Technology } from '../technology/technology';
import { TechnologyPipe } from './technology.pipe';

interface Education {
  id: number;
  from: number;
  to: number;
  institution: string;
  program: string;
  degree: string;
}

const MASTER: Education = {
  id: 1,
  from: 2011,
  to: 2015,
  institution: 'Cologne University of Applied Sciences',
  program: 'Software Engineering',
  degree: 'Master of Science',
};
const BACHELOR: Education = {
  id: 2,
  from: 2008,
  to: 2011,
  institution: 'Cologne University of Applied Sciences',
  program: 'Business Informatics and General Informatics',
  degree: 'Bachelor of Science',
};
const APPRENTICE: Education = {
  id: 3,
  from: 2005,
  to: 2008,
  institution: 'IGMG e.V.',
  program: 'IT Specialist',
  degree: 'IT Specialist in the field of Software Development',
};

@Component({
  imports: [RouterModule, DatePipe, DurationPipe, Technology, TechnologyPipe],
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  projects: Project[] = [
    CORIX,
    APU,
    PERFOOD,
    TRIP,
    TIMS,
    AXA,
    NLI,
    FH,
    AUSBILDUNG,
  ];

  educations: Education[] = [MASTER, BACHELOR, APPRENTICE];
  protected readonly JAVA = JAVA;
  protected readonly JAVASCRIPT = JAVASCRIPT;
  protected readonly TYPESCRIPT = TYPESCRIPT;
  protected readonly REST = REST;
  protected readonly SPRING = SPRING;
  protected readonly REACT = REACT;
  protected readonly ANGULAR = ANGULAR;
  protected readonly HTML = HTML;
}
