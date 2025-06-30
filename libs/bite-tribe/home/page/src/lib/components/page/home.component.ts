import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonSpinner,
  IonText,
  IonIcon,
  PopoverController,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { NgTemplateOutlet } from '@angular/common';
import { CustomFilterModalComponent } from '../custom-filter-modal/custom-filter-modal.component';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    BiteComponent,
    IonCard,
    IonCardContent,
    IonText,
    IonSpinner,
    NgTemplateOutlet,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  bites = input<any[]>();
  allTags = input<string[]>([]);
  selectedFilters = input<string[]>([]);
  enableBackButton = input<boolean>(false);
  userId = input<string>();
  title = input('Bites');
  editableBites = input(false, { transform: booleanAttribute });
  showFooter = input(true);
  isAuthenticated = input(false);
  showAddButton = input(true);
  showHeaderMenu = input(true);
  showSpinner = input<boolean>(false);
  isBitesLoading = input<boolean | undefined>();

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBites = output();
  readonly gotoMyBucketlists = output();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly gotoEdit = output<Bite>();
  readonly deleteBite = output<Bite>();
  readonly openMapView = output();
  readonly filtersApplied = output<string[]>();
  readonly filtersCleared = output<void>();
  readonly filterRemoved = output<string>();

  private readonly popoverController = inject(PopoverController);

  // Bites are already filtered by the store, just pass through
  filteredBites = computed(() => this.bites() || []);

  async openCustomFilterModal($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: CustomFilterModalComponent,
      event: $event,
      dismissOnSelect: false,
      cssClass: 'custom-filter-popover',
      alignment: 'center',
      componentProps: {
        existingTags: this.allTags,
        selectedFilters: this.selectedFilters,
        filtersApplied: (filters: string[]) => {
          this.filtersApplied.emit(filters);
          popover.dismiss();
        },
        filtersCleared: () => {
          this.filtersCleared.emit();
          popover.dismiss();
        },
      },
    });

    await popover.present();
  }

  removeFilter(filter: string) {
    this.filterRemoved.emit(filter);
  }
}
