import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AddItemService } from './add-item.service';
import { AsyncPipe } from '@angular/common';
import { AddItemComponent } from '../components/add-item.component';
import { Price } from '../api/price.model';
import { SupportedLang } from '@travellers-apps/prices/localization';

@Component({
  template: `
    <ta-add-item
      class="ion-page"
      [location]="location$ | async"
      (save)="saveItem($event)"
      (languageChangeClick)="changeLanguage($event)"
    />
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

  changeLanguage(event: SupportedLang) {
    this.addItemService.changeLanguage(event);
  }
}
