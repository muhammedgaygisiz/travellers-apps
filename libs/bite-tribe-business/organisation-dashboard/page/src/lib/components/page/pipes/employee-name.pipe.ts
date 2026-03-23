import { Pipe, PipeTransform } from '@angular/core';
import { PublicUser } from 'model';

@Pipe({ name: 'employeeName' })
export class EmployeeNamePipe implements PipeTransform {
  transform(
    userId: string | undefined,
    employees: PublicUser[] | undefined,
  ): string {
    if (!userId || !employees) {
      return '';
    }
    return employees.find((e) => e.userId === userId)?.displayName ?? '';
  }
}
