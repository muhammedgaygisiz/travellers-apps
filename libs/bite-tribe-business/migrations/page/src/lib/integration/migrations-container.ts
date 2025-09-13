import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Migrations } from '../migrations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Migrations],
  template: ` <btb-migrations /> `,
})
export class MigrationsContainer {}
