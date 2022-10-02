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

  public hasLowerCaseLetter$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(lowerCase))
  );

  public hasUpperCaseLetter$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(upperCase))
  );

  public hasNumber$ = this.password$.pipe(
    map((password) => this.test(password).forPattern(digit))
  );

  public hasLength8 = this.password$.pipe(
    map((password) => this.test(password).forLength(minLength))
  );

  private test(password: string) {
    return {
      forPattern: (pattern: RegExp) => {
        return this.calculateColor(password, () => pattern.test(password));
      },
      forLength: (length: number) => {
        return this.calculateColor(password, () => password.length >= length);
      },
    };
  }

  calculateColor(password: string, condition: () => boolean) {
    if (!password) {
      return '';
    }

    const conditionFulfilled = condition();
    if (conditionFulfilled) {
      return 'success';
    }

    return 'danger';
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
}
