import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { Placeholder } from './components/placeholder';
import { ImageUploadService } from './service/image-upload.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'image-upload2',
  templateUrl: 'image-upload2.component.html',
  styleUrl: 'image-upload2.component.scss',
  imports: [
    IonCard,
    IonCardContent,
    IonButton,
    IonModal,
    ImageCropperComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    Placeholder,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUpload2Component),
      multi: true,
    },
  ],
})
export class ImageUpload2Component implements ControlValueAccessor {
  public readonly imageUploadService = inject(ImageUploadService);

  position = input<{
    latitude: number;
    longitude: number;
  }>();

  imageUrl = input<string>();

  collectionId = input.required<string>();

  positionFromImage = output<{
    latitude: number;
    longitude: number;
  }>();
  clearImagePath = output();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  private readonly cropModal = viewChild<IonModal>('cropModal');

  value = signal<string | null>(null);
  disabled = signal<boolean | null>(null);
  croppedImage = signal<string | null | undefined>(null);

  showImage = computed(() => {
    return !!this.value() || !!this.imageUrl();
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: string | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  writeValue(obj: string | null): void {
    this.value.set(obj);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onImageUploadClick(): void {
    const fileUploadElem = this.fileUpload();
    if (!fileUploadElem) {
      console.error('File upload element not found');
      return;
    }

    this.imageUploadService.handleImageUploadClick(fileUploadElem);
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
      console.error('No file selected');
      return;
    }

    const collectionId = this.collectionId();
    if (!collectionId) {
      console.error('Collection ID is required for image upload');
      return;
    }

    void this.imageUploadService.handleFileSelected(
      file,
      collectionId,
      this.handleFileUploadFinished.bind(this),
    );
  }

  handleFileUploadFinished(
    file: File | undefined,
    base64: string | undefined,
    downloadUrl: string | undefined,
    position: { latitude: number; longitude: number } | undefined,
  ): void {
    if (position) {
      this.positionFromImage.emit(position);
    }

    if (downloadUrl) {
      this.setValueAndNotify(downloadUrl);
      return;
    }
  }

  clearImage(): void {
    this.value.set(null);
    this._onChange(null);

    const fallbackPosition = this.position();
    if (fallbackPosition) {
      this.positionFromImage.emit(fallbackPosition);
    }
    const fileUpload = this.fileUpload();
    if (fileUpload) {
      fileUpload.nativeElement.value = '';
    }

    this.clearImagePath.emit();
  }

  // Drag & Drop prevention
  isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  cancelCropping(): void {
    this.cropModal()?.dismiss(null, 'cancel');
  }

  async confirmCropping(): Promise<void> {
    const croppedImage = this.croppedImage();

    if (croppedImage) {
      this.cropModal()?.dismiss(null, 'confirmed');
      // await this.imageUploadService.uploadBase64(croppedImage);
    }
  }

  onImageCrop($event: ImageCroppedEvent): void {
    this.croppedImage.set($event.base64);
  }

  private setValueAndNotify(value: string): void {
    this.value.set(value);
    this._onChange(value);
    this._onTouch();
  }
}
