import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { Project } from './project';
import { formatNumber } from '@angular/common';

const getDurationInMonth = (project: Project): number => {
  if (!project?.from) {
    return 0;
  }

  const { from, to } = project;
  const startYear = from.getFullYear();
  const startMonth = from.getMonth();
  const endYear = to.getFullYear();
  const endMonth = to.getMonth();

  const yearDifference = endYear - startYear;
  const monthDifference = endMonth - startMonth + 1;

  return yearDifference * 12 + monthDifference;
};

const getFormatedDuration = (
  durationInMonth: number,
  localeId: string,
): string => {
  if (durationInMonth > 12) {
    const withMonth = durationInMonth % 12 > 0;

    return `${formatNumber(
      durationInMonth / 12,
      localeId,
      withMonth ? '1.1-1' : '1.0',
    )} years`;
  }

  return `${formatNumber(durationInMonth, localeId, '1.0')} month`;
};

@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {
  localeId = inject(LOCALE_ID);

  transform(projects: Project[], technology?: string): string {
    if (technology) {
      const projectsWithTechnology = projects.filter(
        (project) => project.technologies && !!project.technologies[technology],
      );

      const expInYears = projectsWithTechnology
        .map((proj) => (proj.technologies ? proj.technologies[technology] : 0))
        .reduce((prev, curr) => prev + curr, 0);

      return `${expInYears} years`;
    }

    if (projects.length > 1) {
      const total = projects
        .filter((project) => !project.exclude)
        .map((project) => {
          const durationInMonthOfProject = getDurationInMonth(project);

          console.info(project.company, durationInMonthOfProject);
          return durationInMonthOfProject;
        })
        .reduce((prev, acc) => prev + acc, 0);

      console.info(`Total ${total} in month`);
      return getFormatedDuration(total, this.localeId);
    }

    const project = projects[0];
    const durationInMonth = getDurationInMonth(project);

    return getFormatedDuration(durationInMonth, this.localeId);
  }
}
