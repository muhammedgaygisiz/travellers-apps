import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: 'ta-add-item',
  templateUrl: './add-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddItemComponent {}
