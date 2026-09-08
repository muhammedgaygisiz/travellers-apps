import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteSearchComponent } from '../component/bite-search.component';
import { BiteSearchService } from './bite-search.service';

@Component({
  template: `<lib-bite-search
    class="ion-page"
    [results]="service.results()"
    [searching]="service.searching()"
    [searched]="service.searched()"
    [failed]="service.failed()"
    [selected]="service.selected()"
    [deleting]="service.deleting()"
    (searchSubmit)="service.search($event)"
    (selectBite)="service.select($event)"
    (deleteBite)="service.deleteBite($event.biteId, $event.reason)"
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteSearchComponent],
})
export class BiteSearchContainer {
  readonly service = inject(BiteSearchService);
}
