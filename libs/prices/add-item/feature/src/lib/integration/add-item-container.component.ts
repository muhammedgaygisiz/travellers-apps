import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  template: `
    <ta-add-item
      class="ion-page"
    ></ta-add-item>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddItemContainerComponent {}
