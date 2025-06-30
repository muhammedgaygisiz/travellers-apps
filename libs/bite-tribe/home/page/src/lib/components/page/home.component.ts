import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
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

  private readonly popoverController = inject(PopoverController);

  selectedFilters = signal<string[]>([]);

  // Compute all unique tags from bites
  allTags = computed(() => {
    const bites = this.bites() || [];
    const tagsSet = new Set<string>();
    
    bites.forEach(bite => {
      if (bite.tags && Array.isArray(bite.tags)) {
        bite.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    
    return Array.from(tagsSet).sort();
  });

  // Filter bites based on selected filters
  filteredBites = computed(() => {
    const bites = this.bites() || [];
    const filters = this.selectedFilters();
    
    if (filters.length === 0) {
      return bites;
    }
    
    return bites.filter(bite => {
      if (!bite.tags || !Array.isArray(bite.tags)) {
        return false;
      }
      
      return filters.some(filter => bite.tags.includes(filter));
    });
  });

  async openCustomFilterModal($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: CustomFilterModalComponent,
      event: $event,
      dismissOnSelect: false,
      cssClass: 'custom-filter-popover',
      alignment: 'center',
      componentProps: {
        existingTags: this.allTags,
        filtersApplied: (filters: string[]) => {
          this.selectedFilters.set(filters);
          popover.dismiss();
        },
        filtersCleared: () => {
          this.selectedFilters.set([]);
          popover.dismiss();
        },
      },
    });

    await popover.present();
  }
}
