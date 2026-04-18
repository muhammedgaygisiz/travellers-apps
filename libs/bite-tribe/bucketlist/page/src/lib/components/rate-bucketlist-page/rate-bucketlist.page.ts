import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bucketlist } from 'model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StarRatingComponent } from 'common/ui/star-rating';
import {
  IonButton,
  IonContent,
  IonTextarea,
  IonText,
} from '@ionic/angular/standalone';

interface BiteTrailRatingFormValue {
  rating: number;
  review: string;
}

@Component({
  selector: 'rate-bucketlist-page',
  templateUrl: 'rate-bucketlist.page.html',
  styleUrl: 'rate-bucketlist.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonTextarea,
    IonText,
    ReactiveFormsModule,
    StarRatingComponent,
  ],
})
export class RateBucketlistPage {
  private readonly formBuilder = inject(FormBuilder);

  bucketlist = input<Bucketlist | undefined>(undefined);
  existingRating = input<BiteTrailRatingFormValue | undefined>(undefined);
  isSubmitting = input(false);

  readonly submitRating = output<BiteTrailRatingFormValue>();

  readonly ratingFormGroup = this.formBuilder.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1)]],
    review: ['', Validators.required],
  });

  readonly syncExistingRating = effect(() => {
    const existingRating = this.existingRating();
    if (existingRating) {
      this.ratingFormGroup.patchValue(existingRating);
      this.ratingFormGroup.disable({ emitEvent: false });
      return;
    }

    this.ratingFormGroup.enable({ emitEvent: false });
  });

  onSubmit(): void {
    if (!this.ratingFormGroup.valid || this.existingRating()) {
      return;
    }

    this.submitRating.emit({
      rating: this.ratingFormGroup.value.rating ?? 0,
      review: this.ratingFormGroup.value.review ?? '',
    });
  }
}
