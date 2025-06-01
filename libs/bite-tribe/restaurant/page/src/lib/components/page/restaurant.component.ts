import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { Bite, Link, Menu, MenuItem, Restaurant } from 'model';
import { ToMetricPipe } from 'distance-pipe';
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

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    ToMetricPipe,
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

  readonly socialMediaForm = this.formBuilder.group({
    links: this.formBuilder.array([]),
  });

  get links() {
    return this.socialMediaForm.get('links') as FormArray;
  }

  initSocialMediaLinks = effect(() => {
    const restaurant = this.restaurant();
    const socialMediaLinks = restaurant?.socialMediaLinks;
    if (socialMediaLinks) {
      this.links.clear();

      for (const socialMediaLink of socialMediaLinks) {
        this.links.push(
          this.formBuilder.group({
            network: [socialMediaLink.network, Validators.required],
            url: [socialMediaLink.url, Validators.required],
          })
        );
      }
    }
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

    const restaurantDistance = restaurant?.distance;
    if (restaurantDistance && restaurantDistance !== 'NaN') {
      return restaurantDistance;
    }

    return bite?.distance;
  });

  position = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.position || bite?.position || null;
  });

  addSocialMedia() {
    this.links.push(
      this.formBuilder.group({
        network: ['', Validators.required],
        url: ['', Validators.required],
      })
    );
  }

  saveSocialMediaLinks() {
    if (this.socialMediaForm.valid) {
      const socialMediaLinks = this.socialMediaForm.value;
      this.submitSocialMediaLinks.emit(socialMediaLinks as { links: Link[] });
    }
  }
}
