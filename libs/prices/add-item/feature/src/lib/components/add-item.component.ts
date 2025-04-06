import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AddItem } from '../api/add-item';
import { ImageUrlValidator } from '../async-validators/image-url.validator';
import { AsyncPipe } from '@angular/common';
import { CardComponent } from 'common/ui/card';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonInput,
  IonItem,
  IonText,
} from '@ionic/angular/standalone';
import { SupportedLang, TranslatePipe } from 'localization';
import { Price } from '../api/price.model';
import { fromEvent, tap } from 'rxjs';

@Component({
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
    IonInput,
    IonButton,
    IonText,
    TranslatePipe,
  ],
  providers: [ImageUrlValidator],
})
export class AddItemComponent implements OnChanges {
  @ViewChild('fileUploader', { static: true })
  fileUploader?: ElementRef<HTMLElement>;

  @Input()
  public location: string | null = '';

  @Output()
  public save: EventEmitter<Price> = new EventEmitter();

  @Output()
  languageChangeClick = new EventEmitter<SupportedLang>();

  imagePreview?: string | ArrayBuffer | null;
  reader = new FileReader();
  onload$ = fromEvent(this.reader, 'load').pipe(
    tap(() => {
      const imageBlob = this.reader.result;

      this.priceFormGroup.patchValue({ image: imageBlob });
      this.priceFormGroup.get('image')?.updateValueAndValidity();

      this.imagePreview = imageBlob;
    })
  );

  public priceFormGroup: FormGroup = new FormGroup<AddItem>({
    productName: new FormControl<string>('', [Validators.required]),
    price: new FormControl<number>(0, [Validators.required]),
    location: new FormControl<string>('', [Validators.required]),
    image: new FormControl<string | ArrayBuffer | null>('', [
      Validators.required,
    ]),
  });

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['location']) {
      this.priceFormGroup.controls['location'].patchValue(this.location);
    }
  }

  onSelect({ target }: Event) {
    const file = (target as HTMLInputElement).files?.[0];

    if (file) {
      this.reader.readAsDataURL(file);
    }
  }

  triggerImageUpload() {
    this.fileUploader?.nativeElement.click();
  }
}
