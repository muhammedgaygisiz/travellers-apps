/**
 * Beat scripts — one sentence story each. Only gestures that serve the sentence.
 *
 * Discover: scroll to Botanic Breeze (3rd card) → open THAT same bite
 * Share:    home → Create Bite → photo → publish → Botanic reactions
 * Tribe:    details → creator → Follow
 * Go:       map pin → drawer → directions
 */
import {
  DISCOVER_TARGET_BITE_ID,
  type IntroStorySceneId,
} from '../intro-story.model';
import { G, script, type GestureScriptStep } from './gesture-script';
import { easeInOutCubic, easeOutCubic } from './easing';

export type IntroStageScreen =
  'home' | 'create' | 'details' | 'profile' | 'map' | 'leaderboard';

export interface IntroBeatScript {
  beat: IntroStorySceneId;
  loop: boolean;
  steps: GestureScriptStep[];
}

/** Same selector for scroll target AND tap — never scroll A / open B. */
const DISCOVER_CARD = `bt-bite[data-bite-id="${DISCOVER_TARGET_BITE_ID}"]`;

export const nav = (
  screen: IntroStageScreen,
  biteId?: string,
): GestureScriptStep =>
  G.emit(
    biteId
      ? { type: 'navigate', screen, biteId }
      : { type: 'navigate', screen },
  );

export const INTRO_BEAT_SCRIPTS: Record<IntroStorySceneId, IntroBeatScript> = {
  /**
   * Find the bite: land on feed → scroll Botanic Breeze into view → tap it → details.
   */
  discover: {
    beat: 'discover',
    loop: true,
    steps: script()
      .push(nav('home'))
      .wait(1100) // stable frame — read cards + filters
      .appear({ x: 74, y: 78 })
      .moveTo({ x: 52, y: 66 }, 720, easeOutCubic)
      .scrollToTarget(DISCOVER_CARD, 1450, {
        alignY: 46,
        pointerX: 52,
        easing: easeInOutCubic,
      })
      .wait(320)
      .tap(DISCOVER_CARD, { approachMs: 520 })
      .wait(100)
      .push(nav('details', DISCOVER_TARGET_BITE_ID))
      .wait(1800) // hold details of THAT bite
      .hide()
      .wait(360)
      .push(nav('home'))
      .wait(700)
      .build(),
  },

  /**
   * Share the find: home → Create Bite → capture photo → publish → reactions.
   */
  share: {
    beat: 'share',
    loop: true,
    steps: script()
      .push(nav('home'))
      .wait(900) // land on home feed — Create Bite visible in footer
      .appear({ x: 78, y: 88 })
      .moveTo({ x: 50, y: 91 }, 650, easeOutCubic)
      .tap('[data-testid="footer-add-button"]', { approachMs: 380 })
      .wait(140)
      .push(nav('create'))
      .wait(700) // sweet transition into create
      .appear({ x: 70, y: 80 })
      .moveTo({ x: 50, y: 26 }, 700, easeOutCubic)
      .tap({ x: 50, y: 26 }, { approachMs: 160 })
      .emit({ type: 'openPicker' })
      .wait(520)
      .tap({ x: 34, y: 58 }, { approachMs: 540 })
      .emit({ type: 'selectPickerPhoto' })
      .wait(280)
      .emit({ type: 'closePicker' })
      .wait(300)
      .emit({ type: 'applyPhoto' })
      .wait(720)
      .tap({ x: 50, y: 91 }, { approachMs: 680 })
      .wait(140)
      .push(nav('details', DISCOVER_TARGET_BITE_ID)) // published Botanic Breeze
      .wait(600)
      .emit({ type: 'reactLikes' })
      .wait(1400)
      .hide()
      .wait(420)
      .build(),
  },

  /**
   * Join the tribe: details → creator → profile → Follow → Following toast + count.
   */
  tribe: {
    beat: 'tribe',
    loop: true,
    steps: script()
      .emit({ type: 'resetFollow' })
      .push(nav('details', DISCOVER_TARGET_BITE_ID))
      .wait(1100) // read Botanic details + creator row
      .appear({ x: 70, y: 58 })
      .tap('.bite-creator-container', { approachMs: 750 })
      .wait(180)
      .push(nav('profile'))
      .wait(800) // read explorer profile
      .appear({ x: 78, y: 30 })
      .tap('.profile-actions ion-button', { approachMs: 650 })
      .emit({ type: 'follow' })
      .wait(2200) // hold Following state
      .hide()
      .wait(500)
      .build(),
  },

  /**
   * Ready to taste?: map → pin → drawer → details → directions.
   * One clear arc — every tap serves “pick nearby → go”.
   */
  go: {
    beat: 'go',
    loop: true,
    steps: script()
      .emit({ type: 'clearHighlight' })
      .emit({ type: 'clearPin' })
      .push(nav('map'))
      .wait(1100) // read the map
      .appear({ x: 72, y: 28 })
      .moveTo({ x: 48, y: 46 }, 700, easeOutCubic)
      .tap({ x: 48, y: 46 }, { approachMs: 200 })
      .emit({ type: 'selectPin', biteId: DISCOVER_TARGET_BITE_ID })
      .wait(1700) // drawer must be visibly up
      .tap('[data-intro="map-drawer"]', { approachMs: 560 })
      .wait(160)
      .push(nav('details', DISCOVER_TARGET_BITE_ID))
      .wait(700)
      .tap('[data-testid="bite-details-navigation"]', { approachMs: 650 })
      .emit({ type: 'highlightDirections' })
      .wait(1600)
      .hide()
      .wait(400)
      .build(),
  },
};
