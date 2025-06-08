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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { ToMetricPipe } from 'distance-pipe';
import { MapComponent } from 'bite-tribe-common/map';
import { ToBlobUrlPipe } from 'image-compression';

@Component({
  selector: 'details-page',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
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
    TimeAgoPipe,
    IonText,
    ToMetricPipe,
    MapComponent,
    ToBlobUrlPipe,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetailsPage {
  bite = input<Bite>();

  reviews = input<Review[]>([]);

  submitNewTags = output<string>();
  submitNewReview = output<{ review: string; biteId: string }>();

  private readonly formBuilder = inject(FormBuilder);

  newTagsFormGroup = this.formBuilder.nonNullable.group({
    tags: ['', Validators.required],
  });

  reviewFormGroup = this.formBuilder.nonNullable.group({
    review: ['', Validators.required],
  });

  isTagsFieldInvalid = toSignal(
    this.newTagsFormGroup.valueChanges.pipe(
      map(() => {
        return !this.newTagsFormGroup.valid;
      })
    ),
    { initialValue: !this.newTagsFormGroup.valid }
  );

  isReviewFieldInvalid = toSignal(
    this.reviewFormGroup.valueChanges.pipe(
      map(() => {
        return !this.reviewFormGroup.valid;
      })
    ),
    { initialValue: !this.reviewFormGroup.valid }
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

  saveReview() {
    if (!this.reviewFormGroup.valid) {
      return;
    }

    const formValue = this.reviewFormGroup.value;
    const newReview = formValue.review;

    const id = this.bite()?.id;

    if (!id) {
      return;
    }

    this.submitNewReview.emit({
      review: newReview || '',
      biteId: id,
    });

    this.reviewFormGroup.reset();
  }
}
