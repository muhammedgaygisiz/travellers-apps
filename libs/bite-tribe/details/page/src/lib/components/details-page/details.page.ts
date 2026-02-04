import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  Bite,
  Bucketlist,
  Like,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  Review,
} from 'model';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTextarea,
  PopoverController,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { RoundDistancePipe, ToMetricPipe } from 'common/distance';
import { MapComponent } from 'bite-tribe-common/map';
import { BucketListSelectionComponent } from '../bucket-list-selection/bucket-list-selection.component';
import { IsInPipe } from '../../pipes/is-in-any.pipe';
import { LikesComponent } from 'bite-tribe-common/bite';
import { Platform } from '@ionic/angular';
import { AppLauncher } from '@capacitor/app-launcher';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from 'common/ui/tags';

@Component({
  selector: 'details-page',
  templateUrl: 'details.page.html',
  styleUrl: 'details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    CurrencyPipe,
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonNote,
    IonTextarea,
    IonButton,
    ReactiveFormsModule,
    TimeAgoPipe,
    IonText,
    ToMetricPipe,
    MapComponent,
    IonIcon,
    IsInPipe,
    LikesComponent,
    StarRatingComponent,
    TagsInputComponent,
    RoundDistancePipe,
  ],
})
export class DetailsPage {
  bite = input<Bite>();
  reviews = input<Review[]>([]);
  bucketlists = input<Bucketlist[]>([]);
  userId = input<string>();
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();

  selectList = output<Bucketlist>();
  removeBiteFromBucketlist = output<RemoveBiteFromBucketlistParams>();
  newList = output<string>();
  submitNewReview = output<{ review: string; biteId: string }>();
  likeButtonClick = output<Like>();
  readonly logoutClick = output();
  readonly restaurantClick = output<Bite>();
  readonly goToProfile = output<PublicUser>();
  readonly gotoEdit = output<Bite>();

  private readonly formBuilder = inject(FormBuilder);
  private popoverController = inject(PopoverController);
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);

  reviewFormGroup = this.formBuilder.nonNullable.group({
    review: ['', Validators.required],
  });

  isReviewFieldInvalid = toSignal(
    this.reviewFormGroup.valueChanges.pipe(
      map(() => {
        return !this.reviewFormGroup.valid;
      }),
    ),
    { initialValue: !this.reviewFormGroup.valid },
  );

  saveReview(): void {
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

  editBite(bite: Bite | undefined): void {
    if (!bite) {
      return;
    }

    this.gotoEdit.emit(bite);
  }

  onNewList(newListName: string): void {
    this.newList.emit(newListName);
  }

  async showBucketListsSelection($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: BucketListSelectionComponent,
      event: $event,
      dismissOnSelect: true,
      cssClass: 'bucket-list-popover',
      alignment: 'center',
      componentProps: {
        bucketLists: this.bucketlists,
        bite: this.bite,
        selectList: this.selectList,
        removeBiteFromBucketlist: this.removeBiteFromBucketlist,
        onNewList: this.onNewList.bind(this),
      },
    });

    await popover.present();
  }

  onRestaurantClick(biteData: Bite | undefined): void {
    if (biteData) {
      this.restaurantClick.emit(biteData);
    }
  }

  private async isGoogleMapsInstalled(): Promise<boolean> {
    const result = await AppLauncher.canOpenUrl({ url: 'comgooglemaps://' });
    return result.value;
  }

  async openNavigation(): Promise<void> {
    const biteData = this.bite();
    if (!biteData?.position) {
      return;
    }

    const { latitude, longitude } = biteData.position;
    const destination = `${latitude},${longitude}`;
    let url: string;
    let target = '_system';

    if (this.platform.is('ios')) {
      try {
        const appleMapsUrl = `maps://?daddr=${destination}`;
        const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
        url = appleMapsUrl;

        const isGoogleMapsInstalled = await this.isGoogleMapsInstalled();
        if (isGoogleMapsInstalled) {
          await this.letUserChooseWhichMapToOpen(
            appleMapsUrl,
            target,
            googleMapsUrl,
          );
          return;
        }
      } catch (e) {
        url = `maps://?daddr=${destination}`;
      }
    } else if (this.platform.is('android')) {
      url = this.buildUrlForAndroidChooser(biteData, destination);
    } else {
      url = this.buildUrlForBrowser(destination);
      target = '_blank';
    }

    window.open(url, target);
  }

  private buildUrlForBrowser(destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  private buildUrlForAndroidChooser(
    biteData: Bite,
    destination: string,
  ): string {
    const label = encodeURIComponent(biteData.name || 'Destination');
    return `geo:0,0?q=${destination}(${label})`;
  }

  private async letUserChooseWhichMapToOpen(
    appleMapsUrl: string,
    target: string,
    googleMapsUrl: string,
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Choose Navigation App',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Apple Maps',
          handler: (): void => {
            window.open(appleMapsUrl, target);
          },
        },
        {
          text: 'Google Maps',
          handler: (): void => {
            window.open(googleMapsUrl, target);
          },
        },
      ],
    });

    await alert.present();
  }
}
