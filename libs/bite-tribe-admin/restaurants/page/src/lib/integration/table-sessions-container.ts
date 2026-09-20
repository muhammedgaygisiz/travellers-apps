import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TableSessions } from '../component/table-sessions/table-sessions';
import { RestaurantsService } from './restaurants.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableSessions],
  template: `
    <lib-table-sessions
      class="ion-page"
      [sessions]="service.tableSessions()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class TableSessionsContainer {
  readonly service = inject(RestaurantsService);
}
