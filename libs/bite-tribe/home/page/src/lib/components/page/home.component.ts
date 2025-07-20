import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { NgTemplateOutlet } from '@angular/common';
import { CustomFilterModalComponent } from '../custom-filter-modal/custom-filter-modal.component';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    IonButton,
    IonList,
    IonItem,
    IonSelect,
    IonSelectOption,
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
  selectedSorting = input<string>('distance');

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
  readonly nearbyFilterToggled = output<void>();

  ionContent = viewChild(IonContent);

  dialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);

  // Bites are already filtered by the store, just pass through
  filteredBites = computed(() => this.bites() || []);

  moreThen5Bites = computed(() => {
    const bites = this.bites();
    return bites && bites?.length > 5;
  });

  isNearbyFilterActive = computed(() => {
    return this.selectedFilters().includes('nearby');
  });

  selectedSortingLabel = computed(() => {
    const selectedSorting = this.selectedSorting();
    switch (selectedSorting) {
      case 'distance':
        return 'Distance';
      case 'likes':
        return 'Likes';
      case 'date':
        return 'Creation date';
      default:
        return 'Distance';
    }
  });

  toggleNearbyFilter() {
    this.nearbyFilterToggled.emit();
  }

  async openCustomFilterModal() {
    const dialogRef = this.dialog.open(CustomFilterModalComponent, {
      data: {
        existingTags: this.allTags(),
        selectedFilters: this.selectedFilters(),
      },
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: any) => {
        if (result.clearFilters) {
          this.filtersCleared.emit();
        }

        if (result.selectedTags) {
          this.filtersApplied.emit(result.selectedTags);
        }
      });
  }

  removeFilter(filter: string) {
    this.filterRemoved.emit(filter);
  }

  scrollToTop() {
    const ionContent = this.ionContent();

    if (ionContent) {
      ionContent.scrollToTop(300);
    }
  }

  showSort() {
    // todo
  }
}
