import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { changeLanguage } from './actions';
import { tap } from 'rxjs';
import { TranslateService } from '@travellers-apps/prices/localization';

@Injectable()
export class LocalizationEffects {
  private readonly actions$ = inject(Actions);
  private readonly translateService = inject(TranslateService);

  changeLocalizationEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(changeLanguage),
        tap(({ lang }) => this.translateService.setActiveLang(lang))
      ),
    { dispatch: false }
  );
}
