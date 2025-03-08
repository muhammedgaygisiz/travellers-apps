import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DurationPipe } from './duration.pipe';
import { Project } from './project';

const AUGUST_2005 = new Date(2005, 7);
const JUNE_2008 = new Date(2008, 5);

const OKTOBER_2010 = new Date(2010, 9);
const FEBRUARY_2013 = new Date(2013, 1);

const JANUAR_2013 = new Date(2013, 0);
const FEBRUAR_2015 = new Date(2015, 1);

const MAERZ_2015 = new Date(2015, 2);
const DEZEMBER_2016 = new Date(2016, 11);

const FEBRUAR_2017 = new Date(2017, 1);
const DEZEMBER_2019 = new Date(2019, 11);

const FEBRUAR_2020 = new Date(2020, 1);
const DEZEMBER_2021 = new Date(2021, 11);

const JANUAR_2022 = new Date(2022, 0);

const JUNI_2022 = new Date(2022, 5);
const SEPTEMBER_2022 = new Date(2022, 8);

const OKTOBER_2022 = new Date(2022, 9);
const NOW = new Date();

@Component({
  standalone: true,
  imports: [RouterModule, DatePipe, DurationPipe, DecimalPipe],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  projects: Project[] = [
    {
      id: 1,
      from: OKTOBER_2022,
      to: NOW,
      description: '',
      company: 'akros AG',
      role: 'Frontend-Entwickler',
    },
    {
      id: 1,
      from: JUNI_2022,
      to: SEPTEMBER_2022,
      description: '',
      company: 'perfood GmbH',
      role: 'Frontend-Entwickler',
    },
    {
      id: 1,
      from: JANUAR_2022,
      to: JUNI_2022,
      description: '',
      company: '',
      role: '',
    },
    {
      id: 1,
      from: FEBRUAR_2020,
      to: DEZEMBER_2021,
      description: '',
      company: 'akros AG',
      role: 'Frontend-Entwickler und UX-Designer',
    },
    {
      id: 1,
      from: FEBRUAR_2017,
      to: DEZEMBER_2019,
      description: '',
      company: 'Axa Konzern AG',
      role: 'Softwareentwickler',
    },
    {
      id: 1,
      from: MAERZ_2015,
      to: DEZEMBER_2016,
      description: '',
      company: 'Next Level Integration GmbH',
      role: 'Berater, Entwickler und Projektleiter',
    },
    {
      id: 1,
      from: JANUAR_2013,
      to: FEBRUAR_2015,
      description: '',
      company: 'Next Level Integration GmbH',
      role: 'Berater, Entwickler und Projektleiter',
    },
    {
      id: 1,
      from: OKTOBER_2010,
      to: FEBRUARY_2013,
      description: '',
      company: 'Fachhochschule Köln',
      role: 'Studentische/Wissenschaftliche Aushilfskraft',
    },
    {
      id: 1,
      from: AUGUST_2005,
      to: JUNE_2008,
      description: '',
      company: 'IGMG e.V.',
      role: 'Auszubildender in der Software-Entwicklung',
    },
  ];
}
