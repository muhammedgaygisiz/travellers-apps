import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { Bite, Link, Menu, MenuItem, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { BiteComponent } from 'bite-tribe-common/bite';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TitleCasePipe } from '@angular/common';
import { EnsureProtocolPipe } from '../../pipes/ensure-protocol.pipe';
import { MenuItemComponent } from '../menu-item/menu-item.component';
import { RestaurantImageComponent } from '../restaurant-image/restaurant-image.component';
import { getPosition } from '../../utils/get-position';
import { getDistance } from '../../utils/get-distance';
import { DistanceComponent } from 'common/distance';

@Component({
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    MapComponent,
    BiteComponent,
    IonList,
    ReactiveFormsModule,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonText,
    IonLabel,
    TitleCasePipe,
    EnsureProtocolPipe,
    IonSegment,
    IonSegmentButton,
    MenuItemComponent,
    RestaurantImageComponent,
    DistanceComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  private readonly formBuilder = inject(FormBuilder);

  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();
  editMode = input(false, { transform: booleanAttribute });

  readonly createBiteClick = output<MenuItem>();
  readonly showMenuClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();
  readonly submitSocialMediaLinks = output<Partial<{ links: Link[] }>>();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly selectedSegment = signal<'bites' | 'menu'>('bites');

  readonly socialMediaForm = this.formBuilder.group({
    links: this.formBuilder.array([]),
  });

  get links(): FormArray {
    return this.socialMediaForm.get('links') as FormArray;
  }

  initSocialMediaLinks = effect(() => {
    const restaurant = this.restaurant();
    const socialMediaLinks = restaurant?.socialMediaLinks;
    if (!socialMediaLinks?.length) {
      return;
    }

    this.links.clear();
    socialMediaLinks.forEach((socialMediaLink) => {
      this.links.push(
        this.formBuilder.group({
          network: [socialMediaLink.network, Validators.required],
          url: [socialMediaLink.url, Validators.required],
        })
      );
    });
  });

  isInvalid = toSignal(
    this.socialMediaForm.valueChanges.pipe(
      map(() => {
        if (this.socialMediaForm.controls.links.length === 0) {
          return true;
        }

        return !this.socialMediaForm.valid;
      })
    ),
    { initialValue: !this.socialMediaForm.valid }
  );

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return restaurant?.name || bite?.place;
  });

  placeDistance = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return getDistance(restaurant, bite);
  });

  position = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return getPosition(restaurant, bite);
  });

  addSocialMedia(): void {
    this.links.push(
      this.formBuilder.group({
        network: ['', Validators.required],
        url: ['', Validators.required],
      })
    );
  }

  saveSocialMediaLinks(): void {
    if (this.socialMediaForm.valid) {
      const socialMediaLinks = this.socialMediaForm.value;
      this.submitSocialMediaLinks.emit(socialMediaLinks as { links: Link[] });
    }
  }

  setSelectedSegment(selectedSegment: any): void {
    if (selectedSegment != 'bites' && selectedSegment !== 'menu') {
      return;
    }
    this.selectedSegment.set(selectedSegment);
  }
}
