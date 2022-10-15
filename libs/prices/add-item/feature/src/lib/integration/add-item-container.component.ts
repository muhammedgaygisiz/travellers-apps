import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AddItemService } from './add-item.service';
import { Price } from '@travellers-apps/utils-common';
import { AsyncPipe } from '@angular/common';
import { AddItemComponent } from '../components/add-item.component';

@Component({
  standalone: true,
  template: `
    <ta-add-item
      class="ion-page"
      [location]="location$ | async"
      (save)="saveItem($event)"
    ></ta-add-item>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, AddItemComponent],
})
export class AddItemContainerComponent {
  public location$ = this.addItemService.location$;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly addItemService: AddItemService
  ) {}

  public saveItem(price: Price) {
    this.addItemService.saveItem(price);
  }
}
