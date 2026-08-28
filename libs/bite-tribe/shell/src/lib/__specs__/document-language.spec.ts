import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { provideDocumentLanguage } from '../document-language';

describe(provideDocumentLanguage.name, () => {
  let langChanges$: BehaviorSubject<string>;

  const initialize = async (initialLang: string): Promise<void> => {
    langChanges$ = new BehaviorSubject(initialLang);

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: { langChanges$ } },
        provideDocumentLanguage(),
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
  };

  beforeEach(() => {
    document.documentElement.lang = 'en';
  });

  describe('given the app starts up', () => {
    it('should tag the document with the active language', async () => {
      await initialize('tr');

      expect(document.documentElement.lang).toBe('tr');
    });
  });

  describe('given the language is switched', () => {
    it('should follow the switch', async () => {
      await initialize('en');

      langChanges$.next('tr');

      expect(document.documentElement.lang).toBe('tr');
    });
  });
});
