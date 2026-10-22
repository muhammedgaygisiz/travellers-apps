import { isFromCardControl } from '../is-from-card-control';

describe(isFromCardControl.name, () => {
  const render = (html: string): HTMLElement => {
    document.body.innerHTML = html;
    return document.querySelector('ion-card') as HTMLElement;
  };

  const clickOn = (selector: string): Event => {
    const event = new Event('click', { bubbles: true });
    document.querySelector(selector)?.dispatchEvent(event);
    return event;
  };

  afterEach(() => (document.body.innerHTML = ''));

  it.each([
    [
      'an ion-button',
      '<ion-button id="t"><span id="inner">Rate</span></ion-button>',
    ],
    [
      'an ion-chip',
      '<ion-chip id="t"><ion-label id="inner">👍</ion-label></ion-chip>',
    ],
    ['a native button', '<button id="t"><span id="inner">Go</span></button>'],
    ['a link', '<a id="t" href="#"><span id="inner">Go</span></a>'],
    [
      'an element opted in with btPressable',
      '<ion-text btPressable id="t"><span id="inner">@owner</span></ion-text>',
    ],
  ])('is true for a click inside %s', (_, control) => {
    const card = render(`<ion-card btPressable>${control}</ion-card>`);

    expect(isFromCardControl(clickOn('#inner'), card)).toBe(true);
  });

  it('is false for a click on the card surface itself', () => {
    const card = render(
      '<ion-card btPressable><p id="name">Restaurant</p><ion-button>Rate</ion-button></ion-card>',
    );

    expect(isFromCardControl(clickOn('#name'), card)).toBe(false);
    expect(isFromCardControl(clickOn('ion-card'), card)).toBe(false);
  });

  it('ignores a control the card sits inside', () => {
    const card = render(
      '<button><ion-card btPressable><p id="name">Restaurant</p></ion-card></button>',
    );

    expect(isFromCardControl(clickOn('#name'), card)).toBe(false);
  });

  it('is false for an event with no element target', () => {
    const card = render('<ion-card btPressable></ion-card>');
    const event = new Event('click');
    document.dispatchEvent(event);

    expect(isFromCardControl(event, card)).toBe(false);
  });

  it('does not count a card that is itself a control-shaped element', () => {
    document.body.innerHTML =
      '<div btPressable id="card"><p id="name">Restaurant</p></div>';
    const card = document.querySelector('#card') as HTMLElement;

    expect(isFromCardControl(clickOn('#name'), card)).toBe(false);
  });
});
