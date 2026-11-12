import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import {
  AlertButton,
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { SearchBite } from 'model';
import {
  LandingPage,
  LandingPageDraft,
} from 'bite-tribe-admin/landing-pages-data-access';
import { LandingPagesComponent } from '../landing-pages.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const draft: LandingPageDraft = {
  city: 'berlin',
  cityName: 'Berlin',
  countryCode: 'DE',
  locale: 'en',
  title: 'The best sushi in Berlin',
  metaDescription: 'Five dishes.',
  intro: 'Why these.',
  biteIds: ['b1'],
};

const published: LandingPage = {
  ...draft,
  status: 'published',
  items: [
    {
      biteId: 'b1',
      name: 'Nigiri',
      imageUrl: 'https://example.test/1.jpg',
      place: 'Sushi Ya',
    },
  ],
};

const result = (over: Partial<SearchBite> = {}): SearchBite => ({
  id: 'b2',
  name: 'Maki',
  place: 'Kuchi',
  imagePath: 'https://example.test/2.jpg',
  ...over,
});

describe(LandingPagesComponent.name, () => {
  let component: LandingPagesComponent;
  let fixture: ComponentFixture<LandingPagesComponent>;
  let ref: ComponentRef<LandingPagesComponent>;
  let alertController: AlertController;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const element = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(LandingPagesComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LandingPagesComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    alertController = TestBed.inject(AlertController);
    ref.setInput('draft', draft);
    fixture.detectChanges();
  });

  describe('the page list', () => {
    it('lists each page under its URL', () => {
      setInputs({ pages: [published] });

      expect(element('admin-landing-list')?.textContent).toContain(
        '/eat/berlin',
      );
    });

    it('says when the pages could not be loaded', () => {
      setInputs({ loadFailed: true });

      expect(element('admin-landing-load-failed')).not.toBeNull();
      expect(element('admin-landing-list')).toBeNull();
    });

    it('shows nothing of the editor until a page is open', () => {
      expect(element('admin-landing-editor')).toBeNull();

      setInputs({ editing: true });

      expect(element('admin-landing-editor')).not.toBeNull();
    });
  });

  describe('the editor', () => {
    it('locks the city once the page exists, since it is the URL', () => {
      setInputs({ editing: true });
      expect(component.cityLocked()).toBe(false);

      setInputs({ current: published });
      expect(component.cityLocked()).toBe(true);
    });

    it('shows the public URL once a city is entered', () => {
      expect(component.publicUrl()).toBe('https://bitetribe.app/eat/berlin');

      setInputs({ draft: { ...draft, city: '' } });

      expect(component.publicUrl()).toBeUndefined();
    });

    it('emits a field change with an empty string for a cleared field', () => {
      const emitted: unknown[] = [];
      component.fieldChange.subscribe((change) => emitted.push(change));

      component.onField('title', 'New');
      component.onField('intro', null);

      expect(emitted).toEqual([
        { field: 'title', value: 'New' },
        { field: 'intro', value: '' },
      ]);
    });

    it('searches only once the term is long enough', () => {
      const emitted: string[] = [];
      component.searchSubmit.subscribe((term) => emitted.push(term));

      component.onTermChange('a');
      component.onSearch();
      component.onTermChange('  maki ');
      component.onSearch();

      expect(emitted).toEqual(['maki']);
    });

    it('cannot add a Bite already chosen or one without a photo', () => {
      setInputs({
        editing: true,
        entries: [
          { biteId: 'b1', name: 'Nigiri', place: 'Sushi Ya', imageUrl: '' },
        ],
        results: [
          result({ id: 'b1' }),
          result({ id: 'b3', imagePath: undefined }),
          result({ id: 'b4' }),
        ],
      });

      const buttons = Array.from(
        element('admin-landing-results')?.querySelectorAll('ion-button') ?? [],
      ).map((button) => button.disabled);

      expect(buttons).toEqual([true, true, false]);
    });

    it('replaces the search with the limit once the page is full', () => {
      setInputs({ editing: true, full: true });

      expect(element('admin-landing-search')).toBeNull();
    });

    it('explains Publish while the page is not publishable', () => {
      setInputs({ editing: true, publishable: false });
      expect(element('admin-landing-publish-hint')).not.toBeNull();

      setInputs({ publishable: true });
      expect(element('admin-landing-publish-hint')).toBeNull();
    });

    it('renders the preview only when there is one', () => {
      setInputs({ editing: true });
      expect(component.previewDoc()).toBeUndefined();
      expect(element('admin-landing-preview-frame')).toBeNull();

      setInputs({ previewHtml: '<!doctype html><title>x</title>' });

      expect(component.previewDoc()).toBeDefined();
      expect(
        element('admin-landing-preview-frame')?.getAttribute('sandbox'),
      ).toBe('');
    });
  });

  describe('withdrawing', () => {
    it('offers Withdraw on a published page only', () => {
      setInputs({ editing: true, current: { ...published, status: 'draft' } });
      expect(element('admin-landing-withdraw')).toBeNull();

      setInputs({ current: published });
      expect(element('admin-landing-withdraw')).not.toBeNull();
    });

    it('withdraws only once the confirmation is accepted', async () => {
      let buttons: AlertButton[] = [];
      const alert = document.createElement('ion-alert');
      jest.spyOn(alert, 'present').mockResolvedValue();
      jest.spyOn(alertController, 'create').mockImplementation((options) => {
        buttons = (options?.buttons ?? []).filter(
          (button): button is AlertButton => typeof button !== 'string',
        );
        return Promise.resolve(alert);
      });
      const withdraw = jest.fn();
      component.withdraw.subscribe(withdraw);

      await component.onWithdraw();

      expect(withdraw).not.toHaveBeenCalled();
      const confirm = buttons.find((button) => button.role === 'destructive');
      (confirm?.handler as () => void)();
      expect(withdraw).toHaveBeenCalledTimes(1);
    });
  });
});
