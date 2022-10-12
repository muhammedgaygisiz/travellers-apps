import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AddItem } from '../api/add-item';
import { Price } from '@travellers-apps/utils-common';
import { ImageUrlValidator } from '../async-validators/image-url.validator';

@Component({
  selector: 'ta-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItemComponent implements OnChanges {
  @Input()
  public location: string | null = '';

  @Output()
  public save: EventEmitter<Price> = new EventEmitter();

  public priceFormGroup: FormGroup = new FormGroup<AddItem>({
    productName: new FormControl<string>('', [Validators.required]),
    price: new FormControl<number>(0, [Validators.required]),
    src: new FormControl<string>('', {
      validators: [Validators.required],
      asyncValidators: this.imageUrlValidator.validate.bind(
        this.imageUrlValidator
      ),
      updateOn: 'blur',
    }),
    location: new FormControl<string>('', [Validators.required]),
  });

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly imageUrlValidator: ImageUrlValidator
  ) {}

  public ngOnChanges() {
    this.priceFormGroup.controls['location'].patchValue(this.location);
  }
}
