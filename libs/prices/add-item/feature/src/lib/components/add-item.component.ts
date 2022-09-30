import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Price } from '../api/price';

@Component({
  selector: 'ta-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItemComponent {
  @Output()
  public save: EventEmitter<Price> = new EventEmitter<Price>();

  public priceFormGroup: FormGroup = new FormGroup<Price>({
    productName: new FormControl<string>('', [Validators.required]),
    price: new FormControl<number>(0, [Validators.required]),
    src: new FormControl<string>('', [Validators.required]),
    location: new FormControl<string>('', [Validators.required]),
  });
}
