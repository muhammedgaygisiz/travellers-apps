import { Pipe, PipeTransform } from '@angular/core';
import { Project } from './project';

@Pipe({ name: 'technology' })
export class TechnologyPipe implements PipeTransform {
  transform(project: Project): string[] {
    const technologies = project.technologies || {};

    return Object.keys(technologies);
  }
}
