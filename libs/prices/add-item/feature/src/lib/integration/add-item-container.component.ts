import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  private readonly addItemService = inject(AddItemService);

  public location$ = this.addItemService.location$;

  public saveItem(price: Price) {
    this.addItemService.saveItem(price);
  }
}
