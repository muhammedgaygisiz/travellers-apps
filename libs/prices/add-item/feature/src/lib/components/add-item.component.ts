import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AddItem } from '../api/add-item';
import { Price } from '@travellers-apps/utils-common';
import { ImageUrlValidator } from '../async-validators/image-url.validator';
import { AsyncPipe } from '@angular/common';
import { CardComponent } from '@travellers-apps/prices/card/feature';
import { PageComponent } from '@travellers-apps/prices/page/feature';
import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  standalone: true,
  selector: 'ta-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncPipe,
    CardComponent,
    PageComponent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
  ],
  providers: [ImageUrlValidator],
})
export class AddItemComponent implements OnChanges {
  @Input()
  public location: string | null = '';

  @Output()
  public save: EventEmitter<Price> = new EventEmitter();

  private readonly imageUrlValidator = inject(ImageUrlValidator);

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

  public ngOnChanges() {
    this.priceFormGroup.controls['location'].patchValue(this.location);
  }
}
