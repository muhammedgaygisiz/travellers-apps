import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addNecessaryIcons } from 'utils';
import { of } from 'rxjs';
import type { Menu, Restaurant } from 'model';
import { MenuPage } from '../menu-page.component';
import { MenuComponent } from '../../menu/menu.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn((): string => 'en'),
  load: jest.fn(() => of({})),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const RESTAURANT = {
  name: 'China Wok',
  image: 'restaurant.jpg',
} as Restaurant;

const MENU = { id: 'menu-1', categories: [] } as unknown as Menu;

/**
 * Lets the page's failure report run to completion. Reporting waits for the
 * active language before it writes the alert, so a single microtask tick is not
 * enough to reach the presented overlay.
 */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Ionic mounts alerts on the app root, so the page only ever holds a handle to
 * one. The handle is what the page presents and, on teardown, dismisses.
 */
const alertStub = (): { present: jest.Mock; dismiss: jest.Mock } => ({
  present: jest.fn(),
  dismiss: jest.fn().mockResolvedValue(true),
});

describe(MenuPage.name, () => {
  let fixture: ComponentFixture<MenuPage>;
  let component: MenuPage;
  let componentRef: ComponentRef<MenuPage>;
  let alertController: AlertController;

  const query = (selector: string): Element | null =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(MenuComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MenuPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    alertController = TestBed.inject(AlertController);
    componentRef.setInput('restaurant', RESTAURANT);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('given a menu that is still loading', () => {
    beforeEach(() => {
      componentRef.setInput('isMenuLoading', true);
      fixture.detectChanges();
    });

    it('should show the skeleton state', () => {
      expect(query('[data-testid="menu-loading-skeleton"]')).toBeTruthy();
    });

    it('should not show the empty state, which would claim there is no menu', () => {
      expect(query('bt-menu')).toBeNull();
    });
  });

  describe('given a menu that could not be resolved', () => {
    it('should block the page with a dismissal-proof alert offering the way back and the read again', async () => {
      const alert = alertStub();
      let created: Parameters<AlertController['create']>[0] | undefined;
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async (options) => {
          created = options;
          return alert as never;
        });
      jest.spyOn(component.goBack, 'emit');
      jest.spyOn(component.retryLoad, 'emit');

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(alert.present).toHaveBeenCalled();
      expect(created?.backdropDismiss).toBe(false);

      const buttons = created?.buttons as {
        handler?: () => void;
      }[];
      expect(buttons).toHaveLength(2);

      buttons[0].handler?.();
      expect(component.goBack.emit).toHaveBeenCalled();

      buttons[1].handler?.();
      expect(component.retryLoad.emit).toHaveBeenCalled();
    });

    it('should not show the empty state underneath, which would claim there is no menu', async () => {
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alertStub() as never);

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(query('bt-menu')).toBeNull();
      expect(query('[data-testid="menu-loading-skeleton"]')).toBeTruthy();
    });

    it('should report the failure once, not on every check', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alertStub() as never);

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('should report the failure again once the retry fails again', async () => {
      const create = jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alertStub() as never);

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      // The retry puts the read back in flight before it fails again.
      componentRef.setInput('isMenuUnavailable', false);
      componentRef.changeDetectorRef.detectChanges();
      await settle();
      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(create).toHaveBeenCalledTimes(2);
    });

    it('should still reach the screen when the failure returns mid-report', async () => {
      // A cold start onto a menu route asks for the read twice, so the page can
      // give up, recover and give up again while one report is still running.
      // The second failure used to find the single-flight guard closed and the
      // page then said nothing at all. See GitHub issue #1382.
      let finishDismiss!: () => void;
      const abandoned = {
        present: jest.fn(),
        dismiss: jest.fn(
          () =>
            new Promise<boolean>((resolve) => {
              finishDismiss = (): void => resolve(true);
            }),
        ),
      };
      const presented = alertStub();
      jest
        .spyOn(alertController, 'create')
        .mockImplementationOnce(async () => abandoned as never)
        .mockImplementation(async () => presented as never);

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();

      // The read is in flight again before the first report has an alert to
      // show, so that report is abandoned while it takes its alert down.
      componentRef.setInput('isMenuUnavailable', false);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      expect(abandoned.dismiss).toHaveBeenCalled();

      // It fails again while that teardown is still running.
      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      finishDismiss();
      await settle();

      expect(presented.present).toHaveBeenCalled();
    });

    it('should take its alert down with the page', async () => {
      const alert = alertStub();
      jest
        .spyOn(alertController, 'create')
        .mockImplementation(async () => alert as never);

      componentRef.setInput('isMenuUnavailable', true);
      componentRef.changeDetectorRef.detectChanges();
      await settle();

      // Ionic mounts the alert on the app root, so an alert left behind sits
      // over whatever the user navigated back to - and its backdrop refuses
      // dismissal, swallowing every tap underneath. See issue #1304.
      fixture.destroy();
      await settle();

      expect(alert.dismiss).toHaveBeenCalled();
    });
  });

  describe('given a loaded menu with no items', () => {
    beforeEach(() => {
      componentRef.setInput('menu', MENU);
      fixture.detectChanges();
    });

    it('should keep the empty state it has always had', () => {
      expect(query('bt-menu')).toBeTruthy();
      expect(query('[data-testid="menu-loading-skeleton"]')).toBeNull();
    });

    it('should show the restaurant photo', () => {
      expect(query('ion-img')).toBeTruthy();
    });
  });

  describe('given a restaurant with no photo', () => {
    it('should render no image header at all rather than an empty one', () => {
      // The header used to reserve 300px for an `ion-img` with no source, which
      // read as a broken page. See GitHub issue #1382.
      componentRef.setInput('restaurant', { name: 'China Wok' } as Restaurant);
      componentRef.setInput('menu', MENU);
      fixture.detectChanges();

      expect(query('ion-img')).toBeNull();
    });
  });
});
