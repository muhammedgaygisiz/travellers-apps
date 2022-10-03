import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthCredentials } from '../api/auth-credentials';
import { map, shareReplay } from 'rxjs';

const lowerCase = /[a-z]/;
const upperCase = /[A-Z]/;
const digit = /[0-9]/;
const minLength = 8;

@Component({
  selector: 'ta-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  @Output()
  public submitAuth: EventEmitter<AuthCredentials> = new EventEmitter();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentials>({
    username: new FormControl<string>('', [Validators.required]),
    password: new FormControl<string>('', this.getPasswordValidator()),
  });

  private password$ = this.authFormGroup.controls['password'].valueChanges.pipe(
    shareReplay()
  );

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

  private calculateColor(hasLowerCaseLetter: null | boolean) {
    if (hasLowerCaseLetter === null) {
      return '';
    }

    return hasLowerCaseLetter ? 'success' : 'danger';
  }

  private test(password: string) {
    return {
      forPattern: (pattern: RegExp) => {
        return this.isFulfilled(password, () => pattern.test(password));
      },
      forLength: (length: number) => {
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

  private getPasswordValidator() {
    return Validators.compose([
      Validators.required,
      Validators.pattern(lowerCase),
      Validators.pattern(upperCase),
      Validators.pattern(digit),
      Validators.minLength(minLength),
    ]);
  }

  private calculateIcon(conditionFulfilled: null | boolean) {
    return conditionFulfilled ? 'checkmark-outline' : 'close-outline';
  }
}
