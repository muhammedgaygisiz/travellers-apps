import {
  inject,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  IonButton,
  IonCheckbox,
  IonRadio,
  IonRadioGroup,
} from '@ionic/angular/standalone';
import {
  dietaryLabelClass,
  hasMenuItemSignal,
  isMenuVariantAvailable,
  menuItemAverageRating,
  menuItemDietaryOf,
  missingRequiredOptions,
} from 'model';
import type {
  DietaryLabel,
  ExtraItem,
  MenuItem,
  MenuItemStats,
  MenuOptionGroup,
  MenuOptionSelection,
} from 'model';
import type { DietaryLabelTallies, DietaryOwnVotes } from 'model';
import { DietaryLabelVotesComponent } from 'bite-tribe/dietary-vote';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { formatMoney } from 'utils';

/**
 * A dish a guest picked, with the size where they picked one
 * (GitHub issue #1103).
 *
 * Structural rather than a class, so the cart of
 * `bite-tribe/table-order-data-access` takes it without this library and that
 * one depending on each other - which the Nx boundary rules would refuse in one
 * direction and which nothing needs in the other.
 */
/**
 * What diners said about the dishes' dietary labels (GitHub issue #2197),
 * threaded from the page to every row as one value: the counts and the
 * member's own votes by menu item id, and whether the reader is offered a
 * vote at all. Off on every surface but the member's menu.
 */
export interface MenuDietaryVotes {
  tallies: Record<string, DietaryLabelTallies>;
  own: Record<string, DietaryOwnVotes>;
  canVote: boolean;
}

export const NO_MENU_DIETARY_VOTES: MenuDietaryVotes = {
  tallies: {},
  own: {},
  canVote: false,
};

/** A reader taps a dish's label to confirm or dispute it (issue #2197). */
export interface MenuDietaryVoteClick {
  item: MenuItem;
  label: DietaryLabel;
}

export interface MenuItemSelection {
  item: MenuItem;
  variant?: MenuItem;
  /**
   * The extras the guest ticked on this row (GitHub issue #1598).
   *
   * Absent on every surface that is not ordering, and on an orderable row
   * whose category offers none.
   */
  extras?: ExtraItem[];
  /**
   * The options the guest chose on the dish (GitHub issue #2254). Absent where
   * none were, and on every surface that is not ordering.
   */
  options?: MenuOptionSelection[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [
    IonButton,
    IonCheckbox,
    IonRadio,
    IonRadioGroup,
    NgTemplateOutlet,
    TranslocoPipe,
    DietaryLabelVotesComponent,
  ],
})
export class MenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  /**
   * The dish this is a variant of, where it is one.
   *
   * A variant rendered on its own flag alone contradicted the menu above it: an
   * owner who takes a dish off the menu has said the dish is off, and its sizes
   * are sizes of that dish, so offering the large one because nobody toggled it
   * separately puts an unorderable item in front of the guest (issue #1099).
   */
  parentItem = input<MenuItem>();

  /**
   * The currency this menu's prices are stated in, as an ISO 4217 code
   * (GitHub issue #1102).
   *
   * Absent renders a bare number. The price used to carry a hardcoded euro
   * sign, which was wrong for every restaurant outside the euro zone and wrong
   * silently - a guest reading `1200 €` at a Tokyo counter has no way to know
   * the symbol was a placeholder. A number with no symbol is something they can
   * ask about; a wrong symbol is something they believe.
   */
  currency = input<string>();

  /**
   * What people thought of this dish (GitHub issue #1113).
   *
   * Absent until somebody has written a Bite about it, which for most dishes
   * is always - so the row renders exactly as it did and the signal appears
   * where there is one. An average of `undefined` is not zero: a dish nobody
   * rated and a dish everybody hated are not the same dish, and a row printing
   * `0` for the first would libel a kitchen.
   */
  stats = input<MenuItemStats | undefined>(undefined);

  /**
   * What this row fits, as the restaurant declares it (GitHub issue #2194):
   * its labels and the labels it can be made to fit. A value the vocabulary
   * does not know is not shown, and every label names its source (`RD-DC-1`).
   */
  protected readonly dietary = computed(() => menuItemDietaryOf(this.item()));

  protected readonly hasDietary = computed(() => {
    const { labels, options } = this.dietary();

    return labels.length > 0 || options.length > 0;
  });

  /** The dishes' dietary votes (issue #2197); see {@link MenuDietaryVotes}. */
  dietaryVotes = input<MenuDietaryVotes>(NO_MENU_DIETARY_VOTES);

  /** The reader taps one of this row's labels to vote on it. */
  readonly dietaryVoteClick = output<MenuDietaryVoteClick>();

  /** The counts for this row's own labels. */
  protected readonly dietaryTallies = computed<DietaryLabelTallies>(
    () => this.dietaryVotes().tallies[this.item()?.id ?? ''] ?? {},
  );

  /** The reader's own votes on them. */
  protected readonly dietaryOwnVotes = computed<DietaryOwnVotes>(
    () => this.dietaryVotes().own[this.item()?.id ?? ''] ?? {},
  );

  /** Only a row with an id can be voted on: the vote names it. */
  protected readonly canVoteDietary = computed(
    () => this.dietaryVotes().canVote && !!this.item()?.id,
  );

  protected onDietaryVoteClick(label: DietaryLabel): void {
    const item = this.item();

    if (item?.id) {
      this.dietaryVoteClick.emit({ item, label });
    }
  }

  protected isHighRisk(label: DietaryLabel): boolean {
    return dietaryLabelClass(label) === 'high-risk';
  }

  /** Somebody wants to read what people said about this dish. */
  readonly biteSignalClick = output<MenuItem>();

  /** The average, to one decimal, or nothing where nobody has rated it. */
  protected readonly averageRating = computed(() => {
    const average = menuItemAverageRating(this.stats());

    return average === undefined ? '' : average.toFixed(1);
  });

  /** Whether this dish has anything worth a line under its name. */
  protected readonly hasSignal = computed(() =>
    hasMenuItemSignal(this.stats()),
  );

  protected openBiteSignal(): void {
    const dish = this.item();

    if (dish) {
      this.biteSignalClick.emit(dish);
    }
  }

  /**
   * Whether to offer turning this dish into a Bite.
   *
   * False on the public menu of issue #1102, where the reader may have no
   * BiteTribe account at all - the button would open a flow that asks them to
   * sign up for a product they came to read a menu of. Defaults to true so the
   * authenticated menu is unchanged.
   */
  canCreateBite = input(true, { transform: booleanAttribute });

  /**
   * The language prices are written in (GitHub issue #2261): a German guest
   * reads "5,90 €" where an English one reads "€5.90".
   */
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  /**
   * The price as it is read, with the symbol only where there is one.
   *
   * Built here rather than as `{{ price }} {{ symbol }}` in the template,
   * because that interpolation always emits the separator: a menu that states
   * no currency rendered `"1200 "`, with a space nothing follows. Harmless
   * where the block ends there and not where it does not - a right-aligned or
   * width-measured cell keeps it, and so does anything reading `textContent`.
   *
   * A price that is absent renders as nothing at all, rather than as the lone
   * symbol the old interpolation produced for it.
   */
  readonly priceLabel = computed(() => {
    const price = this.item()?.price;

    if (price === undefined || price === null) {
      return '';
    }

    return formatMoney(price, this.currency(), this.lang());
  });

  /**
   * Whether to offer adding this dish to a table cart (GitHub issue #1103).
   *
   * False everywhere but the ordering screen, so the authenticated menu and the
   * public one are unchanged: a reader who is not at a table has nothing to add
   * a dish to, and a button that opens a cart nobody can send is worse than no
   * button.
   *
   * Deliberately independent of {@link canCreateBite}. The ordering screen
   * offers one and not the other - the guest may have no account - and a single
   * "is this interactive" flag would have made those two decisions one.
   */
  canAddToCart = input(false, { transform: booleanAttribute });

  /**
   * The extras this dish may be ordered with (GitHub issue #1598).
   *
   * Passed in rather than read off a category, because this component is given
   * one dish and has never been given the menu around it. The category above
   * decides - a dish's extras are its category's, `menuExtrasForItem` - and
   * threads the answer down, including into the variant rows below: a large
   * Margherita is a Margherita, and takes the extras of the section it is
   * printed in.
   *
   * Drawn only in ordering mode. The two reading surfaces render the
   * category's extras block once, under the dishes, which is where a menu
   * prints it; ticking one of them is only meaningful where there is a cart.
   */
  extras = input<readonly ExtraItem[]>([]);

  /**
   * Which extras are ticked right now, by id.
   *
   * Local to the row and reset the moment it is added, because a tick is part
   * of building *one* line rather than a preference about the dish. A guest
   * who adds a pizza with extra cheese and then taps add again means a second
   * plain pizza unless they say otherwise - and a picker that stayed ticked
   * would quietly charge them for cheese they never asked for a second time.
   */
  private readonly ticked = signal<readonly string[]>([]);

  /** Whether the picker has anything to draw on this row. */
  readonly hasExtras = computed(() => this.extras().length > 0);

  /**
   * Whether a parent dish has a required option still unanswered, which
   * blocks this variant row's add button (GitHub issue #2254). The dish row
   * owns the choice; a variant only shows whether it can be added.
   */
  optionsBlocked = input(false, { transform: booleanAttribute });

  /**
   * The dish's options (GitHub issue #2254), on the dish row only: a variant
   * is a version of the dish, and the dish's options apply to whichever one
   * is ordered.
   */
  readonly optionGroups = computed<readonly MenuOptionGroup[]>(() =>
    this.isVariant() ? [] : (this.item()?.optionGroups ?? []),
  );

  /** One reading line per option, "Spice level: mild · hot". */
  readonly optionLines = computed(() =>
    this.optionGroups().map(
      (group) =>
        `${group.name}: ${group.choices.map(({ name }) => name).join(' · ')}`,
    ),
  );

  /**
   * The choice made in each option, by group id. Local to the row and reset
   * once the dish is added, like the extras ticks: a choice belongs to the one
   * line being built.
   */
  private readonly chosen = signal<Readonly<Record<string, string>>>({});

  /** Whether the ordering screen draws the option choices on this row. */
  readonly showOptionsPicker = computed(
    () =>
      this.canAddToCart() &&
      this.optionGroups().length > 0 &&
      !this.isUnavailable(this.item()),
  );

  /** The required options still unanswered, which block adding the dish. */
  readonly missingOptions = computed(() =>
    missingRequiredOptions(
      { optionGroups: [...this.optionGroups()] },
      Object.keys(this.chosen()),
    ),
  );

  chosenChoice(groupId: string): string | undefined {
    return this.chosen()[groupId];
  }

  choose(groupId: string, choiceId: string | null | undefined): void {
    this.chosen.update((chosen) => {
      const others = Object.fromEntries(
        Object.entries(chosen).filter(([id]) => id !== groupId),
      );

      return choiceId ? { ...others, [groupId]: choiceId } : others;
    });
  }

  /** The chosen options in the dish's order, as the cart takes them. */
  private selectedOptions(): MenuOptionSelection[] {
    return this.optionGroups().flatMap((group) => {
      const choice = group.choices.find(
        ({ id }) => id === this.chosen()[group.id],
      );

      return choice ? [{ group, choice }] : [];
    });
  }

  /**
   * A variant row below was added: the dish adds its own options to the
   * selection, because it is the row that holds them.
   */
  onVariantAdded(selection: MenuItemSelection): void {
    if (this.missingOptions().length) {
      return;
    }

    const options = this.selectedOptions();

    this.addToCartClick.emit({
      ...selection,
      ...(options.length ? { options } : {}),
    });
    this.chosen.set({});
  }

  /**
   * Whether this row draws the extras picker.
   *
   * Also decides where the add button goes: a row with a picker puts it under
   * the boxes, because a button above them is one the guest taps before
   * reading them. Nothing is offered on an unavailable dish - extras on
   * something the kitchen will not serve is a control that leads nowhere.
   */
  /**
   * Whether this row can be ordered as it stands (GitHub issue #2182).
   *
   * A dish whose variants are every version of it - Pad Thai vegetarian, with
   * chicken - has no price of its own, so it is ordered through one of them
   * and never plain. A dish written before that keeps its own price, and its
   * plain line, until its owner saves it again.
   */
  readonly orderable = computed(() => {
    const item = this.item();

    return (
      this.isVariant() || !item?.variants?.length || (item?.price ?? 0) > 0
    );
  });

  readonly showExtrasPicker = computed(
    () =>
      this.canAddToCart() &&
      this.orderable() &&
      this.hasExtras() &&
      !this.isUnavailable(this.item()),
  );

  isTicked(extraId: string): boolean {
    return this.ticked().includes(extraId);
  }

  /** What one extra adds, rendered beside its name. */
  extraPriceLabel(extra: ExtraItem): string {
    return `+${formatMoney(extra.price, this.currency(), this.lang())}`;
  }

  toggleExtra(extraId: string, checked: boolean): void {
    this.ticked.update((ids) =>
      checked
        ? ids.includes(extraId)
          ? ids
          : [...ids, extraId]
        : ids.filter((id) => id !== extraId),
    );
  }

  createBiteClick = output<MenuItem>();

  /**
   * The dish, and the variant where the row is one.
   *
   * Both, rather than the row's own item, because a cart line is a dish *and* a
   * size: "large Margherita" is one thing to order and two things on the menu,
   * and a row that emitted only itself would make the cart guess which dish the
   * large belongs to.
   */
  addToCartClick = output<MenuItemSelection>();

  onAddToCartClick(itemData: MenuItem | undefined): void {
    const parent = this.parentItem();

    if (
      !itemData ||
      this.isUnavailable(itemData) ||
      this.optionsBlocked() ||
      this.missingOptions().length
    ) {
      return;
    }

    const options = this.selectedOptions();

    // Taken in the menu's order rather than in the order they were tapped, so
    // a line reads the way the section it came from is printed. The cart's key
    // sorts the ids anyway, so this is about what the guest sees rather than
    // about which row they land on.
    const ticked = this.extras().filter((extra) => this.isTicked(extra.id));

    this.addToCartClick.emit({
      ...(parent ? { item: parent, variant: itemData } : { item: itemData }),
      ...(ticked.length ? { extras: [...ticked] } : {}),
      ...(options.length ? { options } : {}),
    });

    this.ticked.set([]);
    this.chosen.set({});
  }

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData && !this.isUnavailable(itemData)) {
      this.createBiteClick.emit(itemData);
    }
  }

  isUnavailable(itemData: MenuItem | undefined): boolean {
    return !isMenuVariantAvailable(this.parentItem(), itemData);
  }
}
