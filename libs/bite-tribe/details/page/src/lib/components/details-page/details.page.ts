import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bite, Review } from 'model';
import {
  IonButton,
  IonChip,
  IonContent,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTextarea,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'details-page',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    CurrencyPipe,
    IonChip,
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonNote,
    IonInput,
    IonTextarea,
    IonButton,
    ReactiveFormsModule,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetailsPage {
  bite = input<Bite>();

  reviews = input<Review[]>([
    {
      id: '1',
      author: 'Jacob',
      comment: 'Really tasty and flavourful',
      date: '2 days', // '2025-04-21T00:00:00.000Z',
    },
  ]);

  submitNewTags = output<string>();

  private readonly formBuilder = inject(FormBuilder);

  newTagsFormGroup = this.formBuilder.nonNullable.group({
    tags: ['', Validators.required],
  });

  isTagsFieldInvalid = toSignal(
    this.newTagsFormGroup.valueChanges.pipe(
      map(() => {
        return !this.newTagsFormGroup.valid;
      })
    ),
    { initialValue: !this.newTagsFormGroup.valid }
  );

  saveTags() {
    if (!this.newTagsFormGroup.valid) {
      return;
    }

    const formValue = this.newTagsFormGroup.value;
    const newTags = formValue.tags;

    this.submitNewTags.emit(newTags!);

    this.newTagsFormGroup.reset();
  }
}
