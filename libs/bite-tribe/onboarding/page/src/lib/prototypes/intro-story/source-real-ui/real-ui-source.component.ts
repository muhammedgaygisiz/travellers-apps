import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
// Storybook prototype embeds page components that are not part of public lib APIs.
/* eslint-disable @nx/enforce-module-boundaries */
import { BiteTribeHomeComponent } from '../../../../../../../home/page/src/lib/components/page/home.component';
import { DetailsPage } from '../../../../../../../details/page/src/lib/components/details-page/details.page';
import { BitePage } from '../../../../../../../bite/page/src/lib/components/page/bite.page';
import { MapPageComponent } from '../../../../../../../map/page/src/lib/components/map-page/map-page.component';
import { ProfileComponent } from '../../../../../../../profile/page/src/lib/components/profile-page/profile.component';
/* eslint-enable @nx/enforce-module-boundaries */
import {
  INTRO_DEMO_BITES,
  INTRO_DEMO_CREATOR,
  INTRO_DEMO_CREATOR_2,
  INTRO_DEMO_GPS,
  INTRO_DEMO_POSITION,
  INTRO_DEMO_TAGS,
  DISCOVER_TARGET_BITE_ID,
} from './intro-demo-fixtures';
import type { IntroCoachState } from './intro-coach-state';
import {
  INTRO_STORY_SCENES,
  INTRO_UI_NATIVE,
  INTRO_PHONE_SHELL,
  type IntroStorySceneId,
  type IntroUiCamera,
} from '../intro-story.model';
import {
  fitPhoneStageTransform,
  IntroIphoneShellComponent,
  type GestureScriptStep,
  type IntroStageScreen,
} from '../gesture';
import { STORY_FLOW_BY_ID } from '../flows';
import {
  IntroGestureLayerComponent,
  type IntroStageAction,
} from './intro-gesture-layer.component';
import type { Bite, Like, ProfileMetaData, PublicUser } from 'model';

export type { IntroCoachState } from './intro-coach-state';

const FIT_CAMERA: IntroUiCamera = { zoom: 1, focusX: 50, focusY: 50 };
/** Dual-layer crossfade — sweet layout window. */
const TRANSITION_MS = 560;

const BEAT_START_SCREEN: Record<IntroStorySceneId, IntroStageScreen> = {
  discover: 'home',
  share: 'home',
  tribe: 'details',
  go: 'map',
};

const STAGE_SCREENS = new Set<string>([
  'home',
  'create',
  'details',
  'profile',
  'map',
  'leaderboard',
]);

const PICKER_PHOTOS = [
  'assets/demo/bite-botanic-breeze.png',
  'assets/demo/bite-brewery-platter.png',
  'assets/demo/bite-street-bao.png',
] as const;

@Component({
  selector: 'intro-real-ui-source',
  templateUrl: './real-ui-source.component.html',
  styleUrl: './real-ui-source.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BiteTribeHomeComponent,
    DetailsPage,
    BitePage,
    MapPageComponent,
    ProfileComponent,
    IntroGestureLayerComponent,
    IntroIphoneShellComponent,
  ],
})
export class RealUiSourceComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  beat = input.required<IntroStorySceneId>();
  framed = input(true);
  badge = input('');
  camera = input<IntroUiCamera | null>(null);
  simulate = input(true);
  /**
   * When set, drives the stage from a parent tip sequence (no gesture replay).
   * Parent should also set `simulate` to false.
   */
  coach = input<IntroCoachState | null>(null);
  /** Intentional flow variant id — overrides the canonical beat script. */
  flowId = input<string | null>(null);
  /** Short intention caption shown above the phone. */
  caption = input('');

  readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  readonly mapPages = viewChildren(MapPageComponent);
  readonly homePages = viewChildren(BiteTribeHomeComponent);

  readonly creator = INTRO_DEMO_CREATOR;
  readonly position = INTRO_DEMO_POSITION;
  readonly gps = INTRO_DEMO_GPS;
  readonly tags = INTRO_DEMO_TAGS;
  readonly pickerPhotos = PICKER_PHOTOS;
  readonly nativeW = INTRO_UI_NATIVE.width;
  readonly nativeH = INTRO_UI_NATIVE.height;
  readonly shellW = INTRO_PHONE_SHELL.width;
  readonly shellH = INTRO_PHONE_SHELL.height;
  readonly viewerUserId = 'viewer-1';
  readonly transitionMs = TRANSITION_MS;

  private readonly viewportSize = signal({ w: 390, h: 700 });
  private readonly liveCamera = signal<IntroUiCamera | null>(null);
  private transitionTimer: number | null = null;
  private nativeEl: HTMLElement | null = null;

  /** Dual-layer stage: outgoing stays painted until incoming finishes — no flash. */
  readonly incoming = signal<IntroStageScreen>('home');
  readonly outgoing = signal<IntroStageScreen | null>(null);
  readonly transitioning = signal(false);
  readonly layerEpoch = signal(0);

  readonly pickerOpen = signal(false);
  readonly pickerSelected = signal(false);
  readonly pickerSelectedIndex = signal(0);
  readonly createImagePath = signal('');
  readonly draftName = signal('Botanic Breeze');
  readonly draftTags = signal<string[]>(['alkoholfrei', 'bern', 'drink']);
  readonly locationGps = signal(false);
  readonly likeBurst = signal(0);
  readonly publishedLikes = signal(1);
  readonly followed = signal(false);
  readonly followerCount = signal(12);
  readonly directionsHighlight = signal(false);
  readonly shareSheetOpen = signal(false);
  readonly newFeedCard = signal(false);
  readonly selectedFilters = signal<string[]>([]);
  readonly sorting = signal('distance');
  /** Which bite details shows — must match the card Discover scrolled to / tapped. */
  readonly selectedBiteId = signal(DISCOVER_TARGET_BITE_ID);
  /** Stage-owned pin selection — guarantees a visible drawer even if map CD lags. */
  readonly mapPinBite = signal<Bite | null>(null);

  /** Join-the-tribe / Ready-to-taste stage overlays. */
  readonly activeCreatorId = signal<'lina' | 'marco'>('lina');
  readonly bucketSaved = signal(false);
  readonly tip = signal<{ title: string; body: string } | null>(null);
  readonly menuOpen = signal(false);
  readonly inlineFollow = signal(false);
  readonly unfollowConfirm = signal(false);
  readonly drawerExpanded = signal(false);
  readonly emphasizeFollowers = signal(false);
  readonly walkingSuccess = signal(false);
  readonly mapPan = signal({ x: 0, y: 0 });

  readonly activeFlow = computed(() => {
    const id = this.flowId();
    return id ? (STORY_FLOW_BY_ID[id] ?? null) : null;
  });

  readonly flowSteps = computed((): GestureScriptStep[] | null => {
    const flow = this.activeFlow();
    return flow?.steps ?? null;
  });

  readonly flowLoop = computed(() => this.activeFlow()?.loop ?? true);

  readonly displayCaption = computed(
    () => this.caption() || this.activeFlow()?.caption || '',
  );

  readonly feedBites = computed((): Bite[] => {
    let list = [...INTRO_DEMO_BITES];
    const filters = this.selectedFilters();
    if (filters.length) {
      list = list.filter((b) =>
        filters.some((tag) => (b.tags ?? []).includes(tag)),
      );
    }
    const sort = this.sorting();
    if (sort === 'distance') {
      list = [...list].sort(
        (a, b) =>
          parseFloat(a.distance || '99') - parseFloat(b.distance || '99'),
      );
    } else if (sort === 'rating') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'likes') {
      list = [...list].sort(
        (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0),
      );
    }
    if (this.newFeedCard()) {
      const published =
        list.find((b) => b.id === DISCOVER_TARGET_BITE_ID) ?? list[0];
      list = [
        {
          ...published,
          id: DISCOVER_TARGET_BITE_ID,
          name: this.draftName() || published.name,
          imagePath:
            this.createImagePath() ||
            published.imagePath ||
            'assets/demo/bite-botanic-breeze.png',
        },
        ...list.filter((b) => b.id !== DISCOVER_TARGET_BITE_ID),
      ];
    }
    return list;
  });

  readonly explorer = computed((): PublicUser => {
    const base =
      this.activeCreatorId() === 'marco'
        ? INTRO_DEMO_CREATOR_2
        : INTRO_DEMO_CREATOR;
    return {
      ...base,
      about:
        base.displayName === 'Marco'
          ? 'Brewery boards and market stalls.'
          : 'Chasing bites across Bern.',
      city: 'Bern',
      public: true,
      countryCodes: ['CH', 'IT', 'FR'],
      biteCount: base.displayName === 'Marco' ? 9 : 14,
    } as PublicUser;
  });

  readonly followToastName = computed(
    () => this.explorer().displayName || 'explorer',
  );

  readonly profileMeta = computed((): ProfileMetaData => ({
    followers: this.followerCount(),
    following: 7,
    isFollowedByMe: this.followed(),
  }));

  readonly detailsBite = computed((): Bite => {
    const id = this.selectedBiteId();
    const base =
      this.feedBites().find((b) => b.id === id) ??
      INTRO_DEMO_BITES.find((b) => b.id === id) ??
      INTRO_DEMO_BITES[0];
    const likes: Like[] = Array.from({ length: this.publishedLikes() }, () => ({
      likeType: 'thumbup',
    })) as Like[];
    // Share flow overlays the just-picked photo onto the published bite.
    const sharePhoto = this.createImagePath();
    return {
      ...base,
      name: this.draftName() || base.name,
      imagePath:
        (sharePhoto ? sharePhoto : undefined) ||
        base.imagePath ||
        'assets/demo/bite-botanic-breeze.png',
      likes,
      tags: this.draftTags().length ? this.draftTags() : base.tags,
    };
  });

  readonly createDraft = computed((): Bite | undefined => {
    const path = this.createImagePath();
    const name = this.draftName();
    if (!path && !name) {
      return undefined;
    }
    return {
      id: 'draft',
      name: name || 'Botanic Breeze',
      image: '',
      imagePath: path || '',
      place: 'Einstein au Jardin',
      price: 9,
      currency: 'CHF',
      position: { ...INTRO_DEMO_GPS },
      tags: this.draftTags(),
    } as unknown as Bite;
  });

  readonly activeCamera = computed<IntroUiCamera>(() => {
    const beat = this.beat();
    // Discover + Share: stable full-phone fit — no restless zoom.
    if (beat === 'discover' || beat === 'share') {
      return FIT_CAMERA;
    }
    return (
      this.camera() ??
      this.liveCamera() ??
      INTRO_STORY_SCENES.find((s) => s.id === beat)?.camera ??
      FIT_CAMERA
    );
  });

  readonly stageTransform = computed(() => {
    const { w, h } = this.viewportSize();
    const cam = this.activeCamera();
    const zoom = Math.min(1.02, Math.max(1, cam.zoom || 1));
    // Fit the full iPhone chrome (bezel + screen) so filters aren't clipped.
    return fitPhoneStageTransform({
      frameW: w,
      frameH: h,
      nativeW: this.shellW,
      nativeH: this.shellH,
      padding: 8,
      zoom,
      focusX: cam.focusX,
      focusY: cam.focusY,
    });
  });

  constructor() {
    effect(() => {
      // Track ONLY coach / beat / flowId. resetBeatState → syncHomeSearch reads
      // homePages(); without untracked, navigating home→details destroys bt-home,
      // retriggers this effect, and snaps Discover back to home (~1 frame).
      const coach = this.coach();
      const beat = this.beat();
      const flowId = this.flowId();
      void flowId;
      untracked(() => {
        if (coach) {
          this.applyCoachState(coach);
          return;
        }
        this.resetBeatState(beat);
      });
    });

    afterNextRender(() => {
      const el = this.viewport()?.nativeElement;
      if (!el) {
        return;
      }
      const measure = (): void => {
        const rect = el.getBoundingClientRect();
        const w = Math.max(rect.width, el.clientWidth, 1);
        const h = Math.max(rect.height, el.clientHeight, 1);
        const prev = this.viewportSize();
        // Ignore collapsed flex frames until layout settles (avoids 0.18 min-scale).
        if ((w < 120 || h < 200) && prev.w >= 120 && prev.h >= 200) {
          return;
        }
        this.viewportSize.set({
          w: Math.max(w, 120),
          h: Math.max(h, 280),
        });
        this.nativeEl =
          (el.querySelector('.source__native') as HTMLElement | null) ??
          this.nativeEl;
      };
      measure();
      requestAnimationFrame(measure);
      window.setTimeout(measure, 80);
      window.setTimeout(measure, 320);
      const ro = new ResizeObserver(() => measure());
      ro.observe(el);
      this.destroyRef.onDestroy(() => {
        ro.disconnect();
        if (this.transitionTimer) {
          window.clearTimeout(this.transitionTimer);
        }
      });
    });
  }

  onAction(action: IntroStageAction): void {
    this.zone.run(() => this.handleAction(action));
  }

  private handleAction(action: IntroStageAction): void {
    switch (action.type) {
      case 'navigate': {
        const screen = typeof action.screen === 'string' ? action.screen : '';
        const biteId =
          typeof (action as { biteId?: unknown }).biteId === 'string'
            ? (action as { biteId: string }).biteId
            : '';
        if (biteId) {
          this.selectedBiteId.set(biteId);
        }
        if (STAGE_SCREENS.has(screen)) {
          this.transitionTo(screen as IntroStageScreen);
          if (screen === 'home') {
            queueMicrotask(() => this.resetScroller());
          }
        }
        return;
      }
      case 'openPicker':
        this.pickerOpen.set(true);
        this.pickerSelected.set(false);
        this.pickerSelectedIndex.set(0);
        return;
      case 'selectPickerPhoto':
        this.pickerSelected.set(true);
        return;
      case 'selectPickerPhotoIndex': {
        const idx = Math.max(
          0,
          Math.min(PICKER_PHOTOS.length - 1, action.index),
        );
        this.pickerSelectedIndex.set(idx);
        this.pickerSelected.set(true);
        return;
      }
      case 'closePicker':
        this.pickerOpen.set(false);
        return;
      case 'applyPhoto': {
        const idx = this.pickerSelectedIndex();
        this.createImagePath.set(PICKER_PHOTOS[idx] ?? PICKER_PHOTOS[0]);
        this.cdr.markForCheck();
        return;
      }
      case 'reactLikes':
        this.publishedLikes.update((n) => n + 1);
        this.likeBurst.update((n) => n + 1);
        // Staggered bursts — spaced so each thumbs-up is readable.
        window.setTimeout(() => {
          this.zone.run(() => {
            this.publishedLikes.update((n) => n + 1);
            this.likeBurst.update((n) => n + 1);
            this.cdr.markForCheck();
          });
        }, 900);
        window.setTimeout(() => {
          this.zone.run(() => {
            this.publishedLikes.update((n) => n + 1);
            this.likeBurst.update((n) => n + 1);
            this.cdr.markForCheck();
          });
        }, 1800);
        return;
      case 'follow':
        if (!this.followed()) {
          this.followed.set(true);
          this.followerCount.update((n) => n + 1);
        }
        this.cdr.detectChanges();
        return;
      case 'unfollow':
        if (this.followed()) {
          this.followed.set(false);
          this.followerCount.update((n) => Math.max(0, n - 1));
        }
        this.cdr.detectChanges();
        return;
      case 'resetFollow':
        this.followed.set(false);
        this.followerCount.set(12);
        return;
      case 'saveBucketlist':
        this.bucketSaved.set(true);
        this.cdr.markForCheck();
        return;
      case 'clearBucketlist':
        this.bucketSaved.set(false);
        return;
      case 'showTip':
        this.tip.set({ title: action.title, body: action.body });
        this.cdr.markForCheck();
        return;
      case 'hideTip':
        this.tip.set(null);
        return;
      case 'showMenu':
        this.menuOpen.set(true);
        this.cdr.markForCheck();
        return;
      case 'hideMenu':
        this.menuOpen.set(false);
        return;
      case 'showInlineFollow':
        this.inlineFollow.set(true);
        this.cdr.markForCheck();
        return;
      case 'hideInlineFollow':
        this.inlineFollow.set(false);
        return;
      case 'showUnfollowConfirm':
        this.unfollowConfirm.set(true);
        this.cdr.markForCheck();
        return;
      case 'hideUnfollowConfirm':
        this.unfollowConfirm.set(false);
        return;
      case 'expandDrawer':
        this.drawerExpanded.set(true);
        this.cdr.markForCheck();
        return;
      case 'collapseDrawer':
        this.drawerExpanded.set(false);
        return;
      case 'setCreator':
        this.activeCreatorId.set(action.creatorId);
        this.cdr.markForCheck();
        return;
      case 'emphasizeFollowers':
        this.emphasizeFollowers.set(true);
        this.cdr.markForCheck();
        return;
      case 'clearEmphasizeFollowers':
        this.emphasizeFollowers.set(false);
        return;
      case 'walkingSuccess':
        this.walkingSuccess.set(true);
        this.cdr.markForCheck();
        return;
      case 'clearWalkingSuccess':
        this.walkingSuccess.set(false);
        return;
      case 'panMap':
        this.mapPan.set({ x: action.dxPct, y: action.dyPct });
        this.cdr.markForCheck();
        return;
      case 'resetMapPan':
        this.mapPan.set({ x: 0, y: 0 });
        return;
      case 'selectPin': {
        const bite =
          INTRO_DEMO_BITES.find((b) => b.id === action.biteId) ?? null;
        this.mapPinBite.set(bite);
        const apply = (): void => {
          const map = this.activeMapPage();
          if (map && bite?.position) {
            map.onGeopointSelection({ ...bite.position, id: bite.id });
          }
          this.cdr.detectChanges();
        };
        apply();
        window.setTimeout(() => this.zone.run(apply), 60);
        window.setTimeout(() => this.zone.run(apply), 200);
        return;
      }
      case 'clearPin':
        this.mapPinBite.set(null);
        this.activeMapPage()?.onGeopointSelection(undefined);
        this.cdr.detectChanges();
        return;
      case 'highlightDirections':
        this.directionsHighlight.set(true);
        this.cdr.detectChanges();
        return;
      case 'clearHighlight':
        this.directionsHighlight.set(false);
        return;
      case 'openSearch':
        this.syncHomeSearch(true, '');
        return;
      case 'applySearch':
        this.syncHomeSearch(true, action.term);
        return;
      case 'closeSearch':
        this.syncHomeSearch(false, '');
        return;
      case 'applyFilter':
        this.selectedFilters.set([action.tag]);
        this.cdr.markForCheck();
        return;
      case 'clearFilter':
        this.selectedFilters.set([]);
        this.cdr.markForCheck();
        return;
      case 'applySort':
        this.sorting.set(action.sorting);
        this.cdr.markForCheck();
        return;
      case 'highlightShareSheet':
        this.shareSheetOpen.set(true);
        this.cdr.markForCheck();
        return;
      case 'clearShareSheet':
        this.shareSheetOpen.set(false);
        return;
      case 'showNewFeedCard':
        this.newFeedCard.set(true);
        this.cdr.markForCheck();
        return;
      case 'clearNewFeedCard':
        this.newFeedCard.set(false);
        return;
      case 'setDraftTags':
        this.draftTags.set([...action.tags]);
        this.cdr.markForCheck();
        return;
      case 'setLocationGps':
        this.locationGps.set(true);
        this.cdr.markForCheck();
        return;
      case 'setDraftName':
        this.draftName.set(action.name);
        this.cdr.markForCheck();
        return;
      default:
        return;
    }
  }

  /**
   * Crossfade dual-layer — park outgoing FIRST (painted), then swap incoming
   * on the next frame so we never flash a blank white layer.
   */
  private transitionTo(next: IntroStageScreen): void {
    const current = this.incoming();
    if (next === current && !this.outgoing()) {
      return;
    }
    if (this.transitionTimer) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Phase 1: keep current on both layers so the stack stays painted.
    this.outgoing.set(current);
    this.transitioning.set(false);
    this.cdr.detectChanges();

    // Phase 2: next frame — swap incoming + start sweet crossfade/scale.
    requestAnimationFrame(() => {
      this.zone.run(() => {
        this.incoming.set(next);
        this.transitioning.set(true);
        this.layerEpoch.update((n) => n + 1);
        this.cdr.detectChanges();

        this.transitionTimer = window.setTimeout(() => {
          this.outgoing.set(null);
          this.transitioning.set(false);
          this.transitionTimer = null;
          this.cdr.markForCheck();
        }, TRANSITION_MS);
      });
    });
  }

  private activeMapPage(): MapPageComponent | undefined {
    const maps = this.mapPages();
    return maps.length ? maps[maps.length - 1] : undefined;
  }

  private applyCoachState(coach: IntroCoachState): void {
    if (coach.selectedBiteId) {
      this.selectedBiteId.set(coach.selectedBiteId);
    }
    this.pickerOpen.set(!!coach.pickerOpen);
    this.pickerSelected.set(!!coach.pickerSelected);
    this.createImagePath.set(coach.createImagePath ?? '');
    this.followed.set(!!coach.followed);
    this.followerCount.set(coach.followed ? 13 : 12);
    this.directionsHighlight.set(!!coach.directionsHighlight);

    if (coach.mapPinId) {
      const bite =
        INTRO_DEMO_BITES.find((b) => b.id === coach.mapPinId) ?? null;
      this.mapPinBite.set(bite);
      queueMicrotask(() => {
        const map = this.activeMapPage();
        if (map && bite?.position) {
          map.onGeopointSelection({ ...bite.position, id: bite.id });
        }
        this.cdr.detectChanges();
      });
    } else if (coach.mapPinId === null) {
      this.mapPinBite.set(null);
      this.activeMapPage()?.onGeopointSelection(undefined);
    }

    const next = coach.screen;
    if (this.incoming() !== next || this.outgoing()) {
      // Direct set when coach mode — skip dual-layer flash for tip jumps.
      if (this.transitionTimer) {
        window.clearTimeout(this.transitionTimer);
        this.transitionTimer = null;
      }
      this.outgoing.set(null);
      this.transitioning.set(false);
      this.incoming.set(next);
      this.layerEpoch.update((n) => n + 1);
    }

    const scrollSel = coach.scrollSelector;
    if (scrollSel) {
      queueMicrotask(() => this.scrollToSelector(scrollSel));
      window.setTimeout(
        () => this.zone.run(() => this.scrollToSelector(scrollSel)),
        120,
      );
    }

    this.cdr.markForCheck();
  }

  private scrollToSelector(selector: string): void {
    const root = this.nativeEl;
    if (!root) {
      return;
    }
    const searchRoot =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    const target = searchRoot.querySelector(selector) as HTMLElement | null;
    if (!target) {
      return;
    }
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  private syncHomeSearch(visible: boolean, term: string): void {
    for (const home of this.homePages()) {
      home.isSearchVisible.set(visible);
      home.searchTerm.set(term);
    }
    this.cdr.markForCheck();
  }

  private resetBeatState(beat: IntroStorySceneId): void {
    if (this.transitionTimer) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    const flow = this.activeFlow();
    this.liveCamera.set(null);
    this.pickerOpen.set(false);
    this.pickerSelected.set(false);
    this.pickerSelectedIndex.set(0);
    this.createImagePath.set('');
    this.draftName.set('Botanic Breeze');
    this.draftTags.set(['alkoholfrei', 'bern', 'drink']);
    this.locationGps.set(false);
    this.likeBurst.set(0);
    this.publishedLikes.set(1);
    this.followed.set(!!flow?.initialFollowed);
    this.followerCount.set(
      flow?.initialFollowerCount ?? (flow?.initialFollowed ? 13 : 12),
    );
    this.directionsHighlight.set(false);
    this.shareSheetOpen.set(false);
    this.newFeedCard.set(false);
    this.selectedFilters.set([]);
    this.sorting.set('distance');
    this.mapPinBite.set(null);
    this.selectedBiteId.set(DISCOVER_TARGET_BITE_ID);
    this.activeCreatorId.set('lina');
    this.bucketSaved.set(false);
    this.tip.set(null);
    this.menuOpen.set(false);
    this.inlineFollow.set(false);
    this.unfollowConfirm.set(false);
    this.drawerExpanded.set(false);
    this.emphasizeFollowers.set(false);
    this.walkingSuccess.set(false);
    this.mapPan.set({ x: 0, y: 0 });
    this.outgoing.set(null);
    this.transitioning.set(false);
    this.incoming.set(flow?.startScreen ?? BEAT_START_SCREEN[beat]);
    this.layerEpoch.update((n) => n + 1);
    this.syncHomeSearch(false, '');
    queueMicrotask(() => this.resetScroller());
  }

  private resetScroller(): void {
    const root = this.nativeEl;
    if (!root) {
      return;
    }
    const searchRoot =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    const ions = Array.from(searchRoot.querySelectorAll('ion-content'));
    // Prefer innermost scrollable host (same rule as gesture layer).
    for (let i = ions.length - 1; i >= 0; i--) {
      const ion = ions[i] as HTMLElement;
      const host =
        (ion.shadowRoot?.querySelector(
          '.inner-scroll',
        ) as HTMLElement | null) ?? null;
      if (host && host.scrollHeight > host.clientHeight + 1) {
        host.scrollTop = 0;
        return;
      }
    }
    const fallback =
      (searchRoot.querySelector('.inner-scroll') as HTMLElement | null) ?? null;
    if (fallback) {
      fallback.scrollTop = 0;
    }
  }
}
