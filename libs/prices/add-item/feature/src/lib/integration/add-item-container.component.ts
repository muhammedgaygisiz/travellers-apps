import {ChangeDetectionStrategy, Component} from "@angular/core";
import {Price} from "../api/price";

@Component({
  template: `
    <ta-add-item
      class="ion-page"
      (save)="log($event)"
    ></ta-add-item>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddItemContainerComponent {

  public log(event: Price) {
    console.log('#mo', event);
  }
}
