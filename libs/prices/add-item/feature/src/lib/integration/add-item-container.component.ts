import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Price } from '../api/price';
import { AddItemService } from './add-item.service';

@Component({
  template: `
    <ta-add-item
      class="ion-page"
      [location]="location$ | async"
      (save)="log($event)"
    ></ta-add-item>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItemContainerComponent {
  public location$ = this.addItemService.location$;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly addItemService: AddItemService
  ) {}

  public log(event: Price) {
    console.log('#mo', event);
  }
}
