import { inject, Injectable } from '@angular/core';
import { Credentials } from '../../api/credentials.model';
import { STORE_SERVICE } from 'utils';
import { AuthService } from 'ta-firestore';
import { NavController, ToastController } from '@ionic/angular';
import { AuthErrorCodes } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private store = inject(STORE_SERVICE);
  private authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly navController = inject(NavController);

  public async register(registration: Credentials): Promise<void> {
    try {
      await this.authService.registerWithUsernameAndPassword({
        email: registration.email,
        password: registration.password,
      });

      this.navController.navigateBack(['/home']);
    } catch (error: any) {
      if (error?.code === AuthErrorCodes.EMAIL_EXISTS) {
        // Prevent user enumeration by showing a generic error message
        await this.showRegistrationErrorMessage(
          'A error occurred during registration. Please try again.',
        );

        return;
      }

      await this.showRegistrationErrorMessage(
        error?.errorMessage ||
          'An unknown error occurred during registration. Please try again.',
      );
    }
  }

  private async showRegistrationErrorMessage(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      position: 'bottom',
      buttons: [
        {
          text: 'OK',
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }

  confirmError(): void {
    this.store.confirmError();
  }
}
