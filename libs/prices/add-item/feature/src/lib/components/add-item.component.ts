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
  public save: EventEmitter<AddItem> = new EventEmitter();

  public priceFormGroup: FormGroup = new FormGroup<AddItem>({
    productName: new FormControl<string>('', [Validators.required]),
    price: new FormControl<number>(0, [Validators.required]),
    src: new FormControl<string>('', [Validators.required]),
    location: new FormControl<string>('', [Validators.required]),
  });

  public ngOnChanges() {
    this.priceFormGroup.controls['location'].patchValue(this.location);
  }
}
