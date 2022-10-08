import { Component, Input } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import {
  digit,
  lowerCase,
  minLength,
  upperCase,
} from '@travellers-apps/utils-common';

@Component({
  selector: 'ta-password-validator',
  templateUrl: './password-validator.component.html',
  styleUrls: ['./password-validator.component.scss'],
})
export class PasswordValidatorComponent {
  @Input()
  private password$: Observable<string | null> = of(null);

  private hasUpperCaseLetter$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(upperCase))
  );

  private hasLowerCaseLetter$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(lowerCase))
  );

  private hasNumber$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(digit))
  );

  private hasLength8$ = this.password$.pipe(
    map((password) => this.test(password).forLength(minLength))
  );

  public hasLowerCaseLetterColor$ = this.hasLowerCaseLetter$.pipe(
    map((hasLowerCaseLetter) => this.calculateColor(hasLowerCaseLetter))
  );

  public hasLowerCaseLetterIcon$ = this.hasLowerCaseLetter$.pipe(
    map((hasLowerCaseLetter) => this.calculateIcon(hasLowerCaseLetter))
  );

  public hasUpperCaseLetterColor$ = this.hasUpperCaseLetter$.pipe(
    map((hasUpperCaseLetter) => this.calculateColor(hasUpperCaseLetter))
  );

  public hasUpperCaseLetterIcon$ = this.hasUpperCaseLetter$.pipe(
    map((hasUpperCaseLetter) => this.calculateIcon(hasUpperCaseLetter))
  );

  public hasNumberColor$ = this.hasNumber$.pipe(
    map((hasNumber) => this.calculateColor(hasNumber))
  );

  public hasNumberIcon$ = this.hasNumber$.pipe(
    map((hasNumber) => this.calculateIcon(hasNumber))
  );

  public hasLength8Color$ = this.hasLength8$.pipe(
    map((hasLength8) => this.calculateColor(hasLength8))
  );

  public hasLength8Icon$ = this.hasLength8$.pipe(
    map((hasLength8) => this.calculateIcon(hasLength8))
  );

  private calculateColor(hasLowerCaseLetter: boolean | null) {
    if (hasLowerCaseLetter === null) {
      return '';
    }

    return hasLowerCaseLetter ? 'success' : 'danger';
  }

  private test(password: string | null) {
    return {
      forPattern: (pattern: RegExp): boolean | null => {
        if (!password) {
          return null;
        }

        return this.isFulfilled(password, () => pattern.test(password));
      },
      forLength: (length: number): boolean | null => {
        if (!password) {
          return null;
        }

        return this.isFulfilled(password, () => password.length >= length);
      },
    };
  }

  private isFulfilled(password: string, condition: () => boolean) {
    if (!password) {
      return null;
    }

    return condition();
  }

  private calculateIcon(conditionFulfilled: null | boolean) {
    return conditionFulfilled ? 'checkmark-outline' : 'close-outline';
  }
}
