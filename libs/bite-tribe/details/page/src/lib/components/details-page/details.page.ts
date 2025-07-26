import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  Bite,
  Bucketlist,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  Review,
} from 'model';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTextarea,
  PopoverController,
  AlertController,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { ToMetricPipe } from 'distance-pipe';
import { MapComponent } from 'bite-tribe-common/map';
import { ToBlobUrlPipe } from 'image-compression';
import { TagsComponent } from '../tags/tags.component';
import { BucketListSelectionComponent } from '../bucket-list-selection/bucket-list-selection.component';
import { IsInPipe } from '../../pipes/is-in-any.pipe';
import { LikesComponent } from 'bite-tribe-common/bite';
import { Platform } from '@ionic/angular';
import { AppLauncher } from '@capacitor/app-launcher';
import { StarRatingComponent } from 'common/ui/star-rating';

@Component({
  selector: 'details-page',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
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
    IonInput,
    IonTextarea,
    IonButton,
    ReactiveFormsModule,
    TimeAgoPipe,
    IonText,
    ToMetricPipe,
    MapComponent,
    ToBlobUrlPipe,
    TagsComponent,
    IonIcon,
    IsInPipe,
    IsInPipe,
    LikesComponent,
    StarRatingComponent,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetailsPage {
  bite = input<Bite>();
  reviews = input<Review[]>([]);
  bucketlists = input<Bucketlist[]>([]);
  userId = input<string>();
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();

  submitNewTags = output<string>();
  selectList = output<Bucketlist>();
  removeBiteFromBucketlist = output<RemoveBiteFromBucketlistParams>();
  newList = output<string>();
  submitNewReview = output<{ review: string; biteId: string }>();
  likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBites = output();
  readonly gotoMyBucketlists = output();
  readonly restaurantClick = output<Bite>();
  readonly goToProfile = output<PublicUser>();

  private readonly formBuilder = inject(FormBuilder);
  popoverController = inject(PopoverController);
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);

  isWeb = signal(!this.platform.is('hybrid'));

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

  onNewList(newListName: string) {
    this.newList.emit(newListName);
  }

  async showBucketListsSelection($event: MouseEvent) {
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

  onRestaurantClick(biteData: Bite | undefined) {
    if (biteData) {
      this.restaurantClick.emit(biteData);
    }
  }

  private async isGoogleMapsInstalled(): Promise<boolean> {
    const result = await AppLauncher.canOpenUrl({ url: 'comgooglemaps://' });
    return result.value;
  }

  async openNavigation() {
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
            googleMapsUrl
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

  private buildUrlForBrowser(destination: string) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  private buildUrlForAndroidChooser(biteData: Bite, destination: string) {
    const label = encodeURIComponent(biteData.name || 'Destination');
    return `geo:0,0?q=${destination}(${label})`;
  }

  private async letUserChooseWhichMapToOpen(
    appleMapsUrl: string,
    target: string,
    googleMapsUrl: string
  ) {
    const alert = await this.alertController.create({
      header: 'Choose Navigation App',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Apple Maps',
          handler: () => {
            window.open(appleMapsUrl, target);
          },
        },
        {
          text: 'Google Maps',
          handler: () => {
            window.open(googleMapsUrl, target);
          },
        },
      ],
    });

    await alert.present();
  }
}
