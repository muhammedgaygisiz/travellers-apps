import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AddItemService } from './add-item.service';
import { AddItem } from '../api/add-item';

@Component({
  template: `
    <ta-add-item
      class="ion-page"
      [location]="location$ | async"
      (save)="saveItem($event)"
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

  public saveItem(addItem: AddItem) {
    this.addItemService.saveItem(addItem);
  }
}
