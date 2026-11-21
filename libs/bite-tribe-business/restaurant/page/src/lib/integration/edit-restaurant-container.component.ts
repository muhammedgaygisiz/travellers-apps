import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { isRestaurantSection, RestaurantSection } from 'model';
import { map } from 'rxjs';
import { EditRestaurantComponent } from '../components/page/edit-restaurant.component';
import { EditRestaurantService } from './edit-restaurant.service';

/**
 * One section of the restaurant, at
 * `restaurant/:restaurantId/edit/:section` (GitHub issue #2183).
 *
 * A section the app does not know shows the "About" section rather than an
 * empty page, so a mistyped link still lands somewhere the owner can use.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <edit-restaurant
      class="ion-page"
      [section]="section()"
      [restaurant]="service.restaurant()"
      [photoStatus]="service.photoStatus()"
      [pendingPhoto]="service.pendingPhoto()"
      [uploadedImagePath]="service.uploadedImagePath()"
      [canRetryPhoto]="service.canRetryPhoto()"
      [photoChecking]="service.photoChecking()"
      [photoRefusalCategory]="service.photoRefusalCategory()"
      (savePhoto)="service.savePhoto($event)"
      (retryPhoto)="service.retryPhoto()"
      (submitSocialMediaLinks)="service.submitSocialMediaLinks($event)"
      (submitDescription)="service.submitDescription($event)"
      (submitOpeningHours)="service.submitOpeningHours($event)"
      (submitTableOrderingSettings)="
        service.submitTableOrderingSettings($event)
      "
      (submitGenderNeutralRestroom)="
        service.submitGenderNeutralRestroom($event)
      "
      (submitCategories)="service.submitCategories($event)"
      (submitDietaryStatements)="service.submitDietaryStatements($event)"
      (submitAddress)="service.submitAddress($event)"
      (submitPosition)="service.submitPosition($event)"
    />
  `,
  imports: [EditRestaurantComponent],
})
export class EditRestaurantContainer {
  service = inject(EditRestaurantService);

  private readonly param = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('section')),
    ),
  );

  readonly section = computed<RestaurantSection>(() => {
    const section = this.param();

    return isRestaurantSection(section) ? section : 'about';
  });
}
