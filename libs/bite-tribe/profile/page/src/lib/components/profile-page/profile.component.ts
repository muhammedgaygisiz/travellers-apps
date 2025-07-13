import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { NgIf } from '@angular/common';
import { BiteComponent } from 'bite-tribe-common/bite';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonAvatar,
    IonButton,
    NgIf,
    BiteComponent,
    IonBadge,
    IonIcon,
  ],
})
export class ProfileComponent {
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();
  bites = input<any[]>();

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();

  biteCount = computed(() => {
    const bites = this.bites();

    return bites ? bites.length : 0;
  });
}
