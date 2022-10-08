import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
} from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  digit,
  lowerCase,
  minLength,
  upperCase,
} from '@travellers-apps/utils-common';
import calculateIcon, { IconName } from '../utils/calculate-icon';
import hasLength from '../utils/has-length';
import calculateColor, { ClassName } from '../utils/calculate-color';

@Component({
  selector: 'ta-password-validator',
  templateUrl: './password-validator.component.html',
  styleUrls: ['./password-validator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordValidatorComponent implements OnChanges {
  @Input()
  public password$?: Observable<string | null>;

  private hasUpperCaseLetter$?: Observable<boolean | null>;
  private hasLowerCaseLetter$?: Observable<boolean | null>;
  private hasNumber$?: Observable<boolean | null>;
  private hasLength8$?: Observable<boolean | null>;
  public hasLowerCaseLetterColor$?: Observable<ClassName | null>;
  public hasLowerCaseLetterIcon$?: Observable<IconName | null>;
  public hasUpperCaseLetterColor$?: Observable<ClassName | null>;
  public hasUpperCaseLetterIcon$?: Observable<IconName | null>;
  public hasNumberColor$?: Observable<ClassName | null>;
  public hasNumberIcon$?: Observable<IconName | null>;
  public hasLength8Color$?: Observable<ClassName | null>;
  public hasLength8Icon$?: Observable<IconName | null>;

  ngOnChanges(): void {
    this.initStreams();
  }

  private initStreams() {
    this.hasUpperCaseLetter$ = this.password$?.pipe(
      map((password) => this.test(password).forPattern(upperCase))
    );

    this.hasLowerCaseLetter$ = this.password$?.pipe(
      map((password) => {
        return this.test(password).forPattern(lowerCase);
      })
    );

    this.hasNumber$ = this.password$?.pipe(
      map((password) => this.test(password).forPattern(digit))
    );

    this.hasLength8$ = this.password$?.pipe(
      map((password) => this.test(password).forLength(minLength))
    );

    this.hasLowerCaseLetterColor$ = this.hasLowerCaseLetter$?.pipe(
      map((hasLowerCaseLetter) => calculateColor(hasLowerCaseLetter))
    );

    this.hasLowerCaseLetterIcon$ = this.hasLowerCaseLetter$?.pipe(
      map((hasLowerCaseLetter) => calculateIcon(hasLowerCaseLetter))
    );

    this.hasUpperCaseLetterColor$ = this.hasUpperCaseLetter$?.pipe(
      map((hasUpperCaseLetter) => calculateColor(hasUpperCaseLetter))
    );

    this.hasUpperCaseLetterIcon$ = this.hasUpperCaseLetter$?.pipe(
      map((hasUpperCaseLetter) => calculateIcon(hasUpperCaseLetter))
    );

    this.hasNumberColor$ = this.hasNumber$?.pipe(
      map((hasNumber) => calculateColor(hasNumber))
    );

    this.hasNumberIcon$ = this.hasNumber$?.pipe(
      map((hasNumber) => calculateIcon(hasNumber))
    );

    this.hasLength8Color$ = this.hasLength8$?.pipe(
      map((hasLength8) => calculateColor(hasLength8))
    );

    this.hasLength8Icon$ = this.hasLength8$?.pipe(
      map((hasLength8) => calculateIcon(hasLength8))
    );
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

        return this.isFulfilled(password, hasLength(password, length));
      },
    };
  }

  private isFulfilled(password: string, condition: () => boolean) {
    if (!password) {
      return null;
    }

    return condition();
  }
}
