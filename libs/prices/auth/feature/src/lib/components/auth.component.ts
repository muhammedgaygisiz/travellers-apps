import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthCredentials } from '../api/auth-credentials';
import { tap } from 'rxjs';

@Component({
  selector: 'ta-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit {
  @Output()
  public submitAuth: EventEmitter<AuthCredentials> = new EventEmitter();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentials>({
    username: new FormControl<string>('', [Validators.required]),
    password: new FormControl<string>('', [Validators.required]),
  });

  public hasALowerCaseLetter = false;
  public hasAnUpperCaseLetter = false;
  public hasANumber = false;
  public is8CaracterLong = false;

  ngOnInit(): void {
    this.authFormGroup.controls['password'].valueChanges
      .pipe(
        tap((password) => {
          this.hasALowerCaseLetter = true;
          this.hasAnUpperCaseLetter = true;
          this.hasANumber = true;
          this.is8CaracterLong = password.length() > 8;
          console.log(password);
        })
      )
      .subscribe();
  }
}
