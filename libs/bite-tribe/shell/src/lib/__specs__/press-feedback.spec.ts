import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HapticsService } from 'haptics';
import {
  DRAG_CANCEL_PX,
  PRESS_FEEDBACK_ROOT_CLASS,
  PRESSED_CLASS,
  providePressFeedback,
  RELEASED_CLASS,
  RELEASED_MS,
} from '../press-feedback';

type PointerType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'pointerleave';

interface PointerInit {
  pointerId?: number;
  isPrimary?: boolean;
  pointerType?: string;
  button?: number;
  clientX?: number;
  clientY?: number;
}

/** Every element sits at 0,0-100,100, so (50, 50) is inside and (500, 500) is not. */
const INSIDE = { clientX: 50, clientY: 50 };
const OUTSIDE = { clientX: 500, clientY: 500 };

// jsdom has no `PointerEvent`, so the fields the listener reads are set on a
// plain event. `pointerleave` does not bubble, as in a browser.
const dispatch = (
  target: Element,
  type: PointerType,
  init: PointerInit = {},
): void => {
  const event = new Event(type, {
    bubbles: type !== 'pointerleave',
    composed: true,
  });

  Object.assign(event, {
    pointerId: 1,
    isPrimary: true,
    pointerType: 'touch',
    button: 0,
    ...INSIDE,
    ...init,
  });
  target.dispatchEvent(event);
};

const tap = (target: Element, init: PointerInit = {}): void => {
  dispatch(target, 'pointerdown', init);
  dispatch(target, 'pointerup', init);
};

const render = (html: string): void => {
  document.body.innerHTML = html;
  document.body.querySelectorAll('*').forEach((element) => {
    element.getBoundingClientRect = (): DOMRect =>
      ({ left: 0, top: 0, right: 100, bottom: 100 }) as DOMRect;
  });
};

const query = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector) as T;

describe(providePressFeedback.name, () => {
  let haptics: Record<'press' | 'release', jest.Mock>;

  beforeEach(async () => {
    haptics = {
      press: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: HapticsService, useValue: haptics },
        providePressFeedback(),
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  describe.each([
    'ion-button',
    'ion-fab-button',
    'ion-chip',
    'ion-tab-button',
    'ion-back-button',
    'ion-menu-button',
  ])('given a %s', (tag) => {
    beforeEach(() => render(`<${tag} id="surface"><span>Go</span></${tag}>`));

    it('should add the pressed class and play press in the same pointerdown', () => {
      const surface = query('#surface');
      let pressedWhenHapticPlayed: boolean | undefined;
      haptics.press.mockImplementation(() => {
        pressedWhenHapticPlayed = surface.classList.contains(PRESSED_CLASS);

        return Promise.resolve();
      });

      dispatch(query('#surface span'), 'pointerdown');

      expect(surface.classList).toContain(PRESSED_CLASS);
      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(pressedWhenHapticPlayed).toBe(true);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it('should remove the class and play release once on pointerup inside', () => {
      tap(query('#surface span'));

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('given a card that opts in with btPressable', () => {
    beforeEach(() =>
      render('<ion-card btPressable id="card"><p>Bite</p></ion-card>'),
    );

    it('should play press and release', () => {
      dispatch(query('#card p'), 'pointerdown');

      expect(query('#card').classList).toContain(PRESSED_CLASS);

      dispatch(query('#card p'), 'pointerup');

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).toHaveBeenCalledTimes(1);
    });

    it('should leave the nearer button inside it to own the press', () => {
      render(
        '<ion-card btPressable id="card"><ion-button id="button">Go</ion-button></ion-card>',
      );

      dispatch(query('#button'), 'pointerdown');

      expect(query('#button').classList).toContain(PRESSED_CLASS);
      expect(query('#card').classList).not.toContain(PRESSED_CLASS);
    });
  });

  describe('given a list row', () => {
    it.each([
      [
        'the button attribute',
        '<ion-item button id="row"><ion-label>Row</ion-label></ion-item>',
      ],
      [
        'the routerLink attribute',
        '<ion-item routerLink="/x" id="row"><ion-label>Row</ion-label></ion-item>',
      ],
    ])('should play press but not release when tappable by %s', (_, html) => {
      render(html);

      dispatch(query('#row ion-label'), 'pointerdown');

      expect(query('#row').classList).toContain(PRESSED_CLASS);

      dispatch(query('#row ion-label'), 'pointerup');

      expect(query('#row').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it.each([
      ['a bound [button]', { button: true }],
      ['a bound [routerLink], which sets href', { href: '/bite/1' }],
    ])('should treat a row tappable through %s as a row', (_, properties) => {
      render('<ion-item id="row"><ion-label>Row</ion-label></ion-item>');
      Object.assign(query('#row'), properties);

      tap(query('#row ion-label'));

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it('should ignore a row that is not tappable', () => {
      render('<ion-item id="row"><ion-label>Row</ion-label></ion-item>');

      dispatch(query('#row ion-label'), 'pointerdown');

      expect(query('#row').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.press).not.toHaveBeenCalled();
    });

    it('should fall through a non-tappable row to the pressable card around it', () => {
      render(
        '<ion-card btPressable id="card"><ion-item id="row"><ion-label>Row</ion-label></ion-item></ion-card>',
      );

      tap(query('#row ion-label'));

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('given a press that is cancelled', () => {
    beforeEach(() => render('<ion-button id="surface">Go</ion-button>'));

    it('should remove the class and play nothing on pointercancel', () => {
      dispatch(query('#surface'), 'pointerdown');
      dispatch(query('#surface'), 'pointercancel');

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.release).not.toHaveBeenCalled();

      dispatch(query('#surface'), 'pointerup');

      expect(haptics.release).not.toHaveBeenCalled();
      expect(haptics.press).toHaveBeenCalledTimes(1);
    });

    it('should remove the class and play nothing on pointerleave', () => {
      dispatch(query('#surface'), 'pointerdown');
      dispatch(query('#surface'), 'pointerleave');

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);

      dispatch(query('#surface'), 'pointerup');

      expect(haptics.release).not.toHaveBeenCalled();
    });

    it('should not cancel when the pointer only leaves a child of the surface', () => {
      render('<ion-button id="surface"><ion-icon></ion-icon></ion-button>');

      dispatch(query('#surface ion-icon'), 'pointerdown');
      dispatch(query('#surface ion-icon'), 'pointerleave');

      expect(query('#surface').classList).toContain(PRESSED_CLASS);
    });

    it('should play nothing when the finger is lifted outside the surface', () => {
      dispatch(query('#surface'), 'pointerdown');
      dispatch(query('#surface'), 'pointerup', OUTSIDE);

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.release).not.toHaveBeenCalled();
    });
  });

  describe('given a disabled surface', () => {
    it.each([
      [
        'the disabled attribute',
        '<ion-button disabled id="surface">Go</ion-button>',
      ],
      [
        'aria-disabled',
        '<ion-button aria-disabled="true" id="surface">Go</ion-button>',
      ],
      [
        "Ionic's button-disabled class",
        '<ion-button class="button-disabled" id="surface">Go</ion-button>',
      ],
      [
        "Ionic's item-disabled class",
        '<ion-item button class="item-disabled" id="surface">Go</ion-item>',
      ],
    ])('should give no class and no haptic when disabled by %s', (_, html) => {
      render(html);

      tap(query('#surface'));

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.press).not.toHaveBeenCalled();
      expect(haptics.release).not.toHaveBeenCalled();
    });
  });

  describe('given a press that turns into a drag (issue #1765)', () => {
    beforeEach(() =>
      render('<ion-card btPressable id="card"><p>A Bite</p></ion-card>'),
    );

    it('keeps the press while the finger stays within the tap distance', () => {
      dispatch(query('#card p'), 'pointerdown', { clientX: 50, clientY: 50 });
      dispatch(query('#card p'), 'pointermove', {
        clientX: 50 + DRAG_CANCEL_PX - 2,
        clientY: 50,
      });

      expect(query('#card').classList).toContain(PRESSED_CLASS);

      dispatch(query('#card p'), 'pointerup', { clientX: 58, clientY: 50 });

      expect(haptics.release).toHaveBeenCalledTimes(1);
    });

    it('ends silently once the finger travels further, as a swipe does', () => {
      dispatch(query('#card p'), 'pointerdown', { clientX: 50, clientY: 50 });
      dispatch(query('#card p'), 'pointermove', {
        clientX: 50 - DRAG_CANCEL_PX - 5,
        clientY: 52,
      });

      expect(query('#card').classList).not.toContain(PRESSED_CLASS);

      dispatch(query('#card p'), 'pointerup', { clientX: 30, clientY: 52 });

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).not.toHaveBeenCalled();
      expect(query('#card').classList).not.toContain(RELEASED_CLASS);
    });

    it('ignores moves from another pointer', () => {
      dispatch(query('#card p'), 'pointerdown', { clientX: 50, clientY: 50 });
      dispatch(query('#card p'), 'pointermove', {
        pointerId: 2,
        clientX: 90,
        clientY: 90,
      });

      expect(query('#card').classList).toContain(PRESSED_CLASS);
    });
  });

  it('presses the reaction chip, not the pressable card around it', () => {
    render(
      '<ion-card btPressable id="card"><bt-likes><ion-chip id="chip"><ion-label>👍</ion-label></ion-chip></bt-likes></ion-card>',
    );

    tap(query('#chip ion-label'));

    expect(query('#card').classList).not.toContain(PRESSED_CLASS);
    expect(query('#chip').classList).toContain(RELEASED_CLASS);
    expect(haptics.press).toHaveBeenCalledTimes(1);
  });

  describe('given an alert button', () => {
    it('should play press and release on an ordinary alert', () => {
      render(
        '<ion-alert><div class="alert-button-group"><button class="alert-button" id="ok"><span>OK</span></button></div></ion-alert>',
      );

      tap(query('#ok span'));

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('given btPressable="release-off"', () => {
    it.each([
      ['confirming', '#confirm'],
      ['cancelling', '#cancel'],
    ])(
      'should play press but not release on the %s button of a destructive alert',
      (_, selector) => {
        render(`
          <ion-alert btPressable="release-off">
            <button class="alert-button" id="cancel">Cancel</button>
            <button class="alert-button" id="confirm">Delete</button>
          </ion-alert>
        `);

        dispatch(query(selector), 'pointerdown');

        expect(query(selector).classList).toContain(PRESSED_CLASS);

        dispatch(query(selector), 'pointerup');

        expect(haptics.press).toHaveBeenCalledTimes(1);
        expect(haptics.release).not.toHaveBeenCalled();
        // It still springs back: only the second tick is left out.
        expect(query(selector).classList).toContain(RELEASED_CLASS);
      },
    );

    it('should play press but not release on a reaction under it', () => {
      render(
        '<div btPressable="release-off" id="options"><ion-chip id="reaction">👍</ion-chip></div>',
      );

      tap(query('#reaction'));

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it('should apply to a surface that carries it itself', () => {
      render('<ion-chip btPressable="release-off" id="reaction">👍</ion-chip>');

      tap(query('#reaction'));

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it('should not make the element carrying it a surface of its own', () => {
      render(
        '<div btPressable="release-off" id="options"><ion-chip>👍</ion-chip></div>',
      );

      tap(query('#options'));

      expect(query('#options').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.press).not.toHaveBeenCalled();
    });
  });

  describe('given btPressable="off"', () => {
    it.each([
      [
        'on the surface',
        '<ion-button btPressable="off" id="surface">Go</ion-button>',
      ],
      [
        'on an ancestor',
        '<div btPressable="off"><ion-button id="surface">Go</ion-button></div>',
      ],
    ])('should suppress the class and the haptics %s', (_, html) => {
      render(html);

      dispatch(query('#surface'), 'pointerdown');

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);

      dispatch(query('#surface'), 'pointerup');

      expect(haptics.press).not.toHaveBeenCalled();
      expect(haptics.release).not.toHaveBeenCalled();
    });
  });

  describe('given pointers that are not a primary tap', () => {
    beforeEach(() => render('<ion-button id="surface">Go</ion-button>'));

    it('should ignore a second finger', () => {
      dispatch(query('#surface'), 'pointerdown', { isPrimary: false });

      expect(haptics.press).not.toHaveBeenCalled();
    });

    it('should ignore a secondary mouse button', () => {
      dispatch(query('#surface'), 'pointerdown', {
        pointerType: 'mouse',
        button: 2,
      });

      expect(haptics.press).not.toHaveBeenCalled();
    });

    it('should not release for a pointer other than the one that pressed', () => {
      dispatch(query('#surface'), 'pointerdown', { pointerId: 1 });
      dispatch(query('#surface'), 'pointerup', { pointerId: 2 });

      expect(query('#surface').classList).toContain(PRESSED_CLASS);
      expect(haptics.release).not.toHaveBeenCalled();
    });

    it.each(['pointercancel', 'pointerleave'] as const)(
      'should not cancel on a %s from another pointer',
      (type) => {
        dispatch(query('#surface'), 'pointerdown', { pointerId: 1 });
        dispatch(query('#surface'), type, { pointerId: 2 });

        expect(query('#surface').classList).toContain(PRESSED_CLASS);
      },
    );

    it('should press with the primary mouse button', () => {
      tap(query('#surface'), { pointerType: 'mouse', button: 0 });

      expect(haptics.press).toHaveBeenCalledTimes(1);
      expect(haptics.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('given a press whose end never arrived', () => {
    it('should drop it silently when the next press starts', () => {
      render(
        '<ion-button id="first">One</ion-button><ion-button id="second">Two</ion-button>',
      );

      dispatch(query('#first'), 'pointerdown');
      dispatch(query('#second'), 'pointerdown');

      expect(query('#first').classList).not.toContain(PRESSED_CLASS);
      expect(query('#second').classList).toContain(PRESSED_CLASS);
      expect(haptics.press).toHaveBeenCalledTimes(2);
      expect(haptics.release).not.toHaveBeenCalled();
    });
  });

  it.each(['pointerup', 'pointercancel', 'pointerleave'] as const)(
    'should do nothing on a %s with no press in progress',
    (type) => {
      render('<ion-button id="surface">Go</ion-button>');

      dispatch(query('#surface'), type);

      expect(query('#surface').classList).not.toContain(PRESSED_CLASS);
      expect(haptics.release).not.toHaveBeenCalled();
    },
  );

  it('should ignore a pointerdown that lands on no element', () => {
    const event = new Event('pointerdown');
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0 });

    document.dispatchEvent(event);

    expect(haptics.press).not.toHaveBeenCalled();
  });

  it('should never cancel the default action of a pointer event', () => {
    render('<ion-button id="surface">Go</ion-button>');
    const event = new Event('pointerdown', { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0 });

    query('#surface').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  describe('given the spring back after a press', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      render(
        '<ion-button id="surface">Go</ion-button><ion-item button id="row">Row</ion-item>',
      );
    });

    afterEach(() => jest.useRealTimers());

    it.each(['#surface', '#row'])(
      'should mark %s released after a release inside, for a moment',
      (selector) => {
        tap(query(selector));

        expect(query(selector).classList).toContain(RELEASED_CLASS);

        jest.advanceTimersByTime(RELEASED_MS);

        expect(query(selector).classList).not.toContain(RELEASED_CLASS);
      },
    );

    it.each([
      [
        'pointercancel',
        (): void => dispatch(query('#surface'), 'pointercancel'),
      ],
      [
        'a lift outside',
        (): void => dispatch(query('#surface'), 'pointerup', OUTSIDE),
      ],
    ])('should not mark a press ended by %s released', (_, endPress) => {
      dispatch(query('#surface'), 'pointerdown');
      endPress();

      expect(query('#surface').classList).not.toContain(RELEASED_CLASS);
    });

    it('should clear the released mark when the surface is pressed again', () => {
      tap(query('#surface'));
      dispatch(query('#surface'), 'pointerdown');

      expect(query('#surface').classList).not.toContain(RELEASED_CLASS);
      expect(query('#surface').classList).toContain(PRESSED_CLASS);

      // The first release's timer must not strip anything from the second.
      jest.advanceTimersByTime(RELEASED_MS);

      expect(query('#surface').classList).toContain(PRESSED_CLASS);
    });
  });

  it('should opt the document into the pressed-state styles', () => {
    expect(document.documentElement.classList).toContain(
      PRESS_FEEDBACK_ROOT_CLASS,
    );
  });

  it('should withdraw the opt-in and any released mark when the app is destroyed', () => {
    jest.useFakeTimers();
    render('<ion-button id="surface">Go</ion-button>');
    tap(query('#surface'));

    TestBed.resetTestingModule();

    expect(document.documentElement.classList).not.toContain(
      PRESS_FEEDBACK_ROOT_CLASS,
    );
    expect(query('#surface').classList).not.toContain(RELEASED_CLASS);
    jest.useRealTimers();
  });

  it('should stop listening when the app is destroyed', () => {
    render('<ion-button id="surface">Go</ion-button>');

    TestBed.resetTestingModule();
    tap(query('#surface'));

    expect(haptics.press).not.toHaveBeenCalled();
  });
});
