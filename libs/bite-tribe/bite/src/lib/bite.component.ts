import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { BiteService } from './bite.service';

@Component({
  selector: 'bt-bite',
  imports: [
    PageComponent,
    IonCard,
    IonIcon,
    IonCardContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    RouterLink,
    IonContent,
  ],
  templateUrl: './bite.component.html',
  styleUrl: './bite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeBiteComponent {
  readonly service = inject(BiteService);
  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  isWeb = this.service.isWeb;
  showImage = computed(() => {
    const img = this.service.imageBase64();

    if (img === null) {
      return false;
    }

    return true;
  });

  onImageUploadClick() {
    if (!this.service.imageBase64()) {
      if (this.isWeb()) {
        const fileUpload = this.fileUpload();

        if (!fileUpload) {
          console.error('File upload element not found');
          return;
        }

        fileUpload.nativeElement.click();

        return;
      }

      this.service.takePhoto();
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.service.saveImageFromFileUpload(reader.result as string);
        // Handle the base64 image
      };
      reader.readAsDataURL(file);
    }
  }
}
