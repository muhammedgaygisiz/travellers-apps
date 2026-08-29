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
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  AlertController,
} from '@ionic/angular/standalone';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { compressFile, compressPhoto } from 'image-compression';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { Placeholder } from './components/placeholder';
import { getExifDataFromPhoto } from './utils/get-exif-data-from-photo';
import { getExifDataFromFile } from './utils/get-exif-data-from-file';
import { FilePicker, PickedFile } from '@capawesome/capacitor-file-picker';
import { getExifDataFromFilePath } from './utils/get-exif-data-from-file-path';
import { TranslocoService } from '@jsverse/transloco';

const photoOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt,
};

const cameraOnlyOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Camera,
};

/**
 * Whether a gallery pick is one this app can actually read.
 *
 * A `file://` path is the OEM gallery symptom described on `pickGalleryFile`,
 * and empty data is how the plugin reports the read it could not perform: it
 * logs the `EACCES` natively and resolves with an empty string rather than
 * rejecting. Either one means the pick is unusable, and both are checked
 * because a device could produce a readable path and still fail the read.
 */
const isReadableGalleryFile = (file: PickedFile): boolean =>
  !file.path?.startsWith('file://') && !!file.data;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'image-upload',
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  imports: [
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonModal,
    IonSpinner,
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
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true,
    },
  ],
})
export class ImageUploadComponent implements ControlValueAccessor {
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  position = input<{
    latitude: number;
    longitude: number;
  }>();

  imageUrl = input<string>();

  positionFromImage = output<{
    latitude: number;
    longitude: number;
  }>();
  clearImagePath = output();

  /**
   * Where the photo now in the control came from.
   *
   * Only a gallery pick can lose its position to Android's redaction: a camera
   * capture is the app's own file and a web file input reads the bytes
   * directly. Callers that want to explain a missing photo position have to
   * know which of the two they are looking at, or they blame the permission for
   * a photo that simply has no GPS. See GitHub issue #1394.
   */
  imagePickedFrom = output<'camera' | 'gallery' | 'web'>();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  private readonly cropModal = viewChild<IonModal>('cropModal');

  isWeb = signal(!this.platform.is('hybrid'));
  value = signal<string | null>(null);
  disabled = signal<boolean | null>(null);
  croppedImage = signal<string | null | undefined>(null);
  canvasRotation = signal(0);
  isLoading = signal(false);
  failedImageSource = signal<string | null>(null);

  imageSource = computed(() => {
    return this.value() || this.imageUrl() || null;
  });

  /**
   * Image source that finished painting. Tracked by source rather than a boolean
   * so re-picking the same image, which never fires `load` again because `src`
   * does not change, does not leave the preview stuck behind the spinner.
   */
  loadedImageSource = signal<string | null>(null);

  showImage = computed(() => {
    const imageSource = this.imageSource();

    return !!imageSource && imageSource !== this.failedImageSource();
  });

  /**
   * True between the `img` being inserted and its `load` or `error` event. A
   * freshly inserted `img` paints nothing until it has decoded its source, and
   * a compressed photo is a multi-megabyte data URL, so without this the box
   * collapses to empty space the moment the processing state is cleared.
   */
  isImagePending = computed(
    () => this.showImage() && this.imageSource() !== this.loadedImageSource(),
  );

  imageFile?: File;

  /**
   * Filesystem path of the last gallery pick, kept so the position can be read
   * again after a late media location grant. The first read happens before the
   * user has any chance to grant, and Android hands back a stripped copy until
   * they do (issue #1394).
   */
  private readonly lastPickedPath = signal<string | undefined>(undefined);

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
    const isDisabled = this.disabled();

    if (isDisabled) {
      return;
    }

    const isWeb = this.isWeb();

    if (isWeb) {
      this.clickOnFileUploader();
      return;
    }

    // On Android, show a dialog to choose between camera and gallery
    if (this.platform.is('android')) {
      void this.showImageSourceDialog();
      return;
    }

    // On iOS and other platforms, use the default camera prompt
    void this.getImageFromNative();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.patchPositionFromFile(file);
      const compressedFile = await compressFile(file);

      await this.setValueAndTriggerChange(compressedFile);
      this.imageFile = compressedFile;
      this.lastPickedPath.set(undefined);
      this.imagePickedFrom.emit('web');
    } finally {
      this.isLoading.set(false);
    }
  }

  private clickOnFileUploader(): void {
    const fileUpload = this.fileUpload();

    if (!fileUpload) {
      console.error('File upload element not found');
      return;
    }

    fileUpload.nativeElement.click();
  }

  private async getImageFromNative(): Promise<void> {
    // Set before the picker rather than after it. `getPhoto` only resolves once
    // the plugin has base64-encoded the full-resolution photo and pushed it
    // across the bridge, and the web view is already visible again by then, so
    // setting this afterwards leaves the placeholder card on screen for the
    // whole transfer with no sign that anything is happening.
    this.isLoading.set(true);
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(photoOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.setValueAndTriggerChange(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async showImageSourceDialog(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('choose-image-source'),
      // Cancel goes last. Listing it first put it directly under the header,
      // where the first real choice is expected, so it read as one of the
      // sources rather than the way out. Ionic's `ios` mode - which this app
      // uses on every platform - then styles it as the dismissive option for
      // free: the last row is bold and every row carries a hairline divider.
      buttons: [
        {
          text: this.transloco.translate('take-photo'),
          role: 'camera',
        },
        {
          text: this.transloco.translate('choose-from-gallery'),
          role: 'gallery',
        },
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role === 'camera') {
      void this.takePhotoWithCamera();
    }

    if (role === 'gallery') {
      void this.pickImageFromGallery();
    }
  }

  private async takePhotoWithCamera(): Promise<void> {
    this.isLoading.set(true);
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(cameraOnlyOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.setValueAndTriggerChange(compressedPhoto);
      this.lastPickedPath.set(undefined);
      this.imagePickedFrom.emit('camera');
    } catch (e) {
      console.error('Error taking photo:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async pickImageFromGallery(): Promise<void> {
    // `readData: true` means the picker resolves only after the whole file has
    // been read into base64, so the loading state has to cover that wait too.
    this.isLoading.set(true);
    try {
      // No permission request precedes the picker. Asking for
      // `accessMediaLocation` here raised the "access photos and videos on this
      // device" prompt on the way to the photo, and under "Allow limited
      // access" cost a second selection on the OS grant screen. The onboarding
      // photos step owns that request now, with Settings and the position
      // modal as the recovery surfaces. See GitHub issue #1394.
      //
      // `@capawesome/capacitor-file-picker` is held at 8.0.2 on purpose, and
      // the pick below is why. 8.0.3 rewrote `pickImages` to fire the Photo
      // Picker, which redacts a photo's GPS unconditionally and ignores
      // `ACCESS_MEDIA_LOCATION` - so the position below silently read nothing
      // for five weeks. 8.0.2 still fires `ACTION_PICK`, whose MediaStore URI
      // carries the EXIF intact. Do not bump this dependency without reading
      // GitHub issue #1414; the upstream change is a real fix for OEM gallery
      // apps returning `file://` URIs, so replacing it needs a plugin of our
      // own rather than a version bump.
      const pickedFile = await this.pickGalleryFile();

      if (!pickedFile) {
        return;
      }

      // Read the GPS position out of the photo. The media location permission
      // the onboarding photos step asks for is necessary but not sufficient:
      // it governs whether Android hands over an unredacted photo, and which
      // intent the picker fired decides whether there is one to hand over at
      // all. Without either, the location section falls back to its other
      // sources and the position modal names the reason.
      this.lastPickedPath.set(pickedFile.path);
      if (pickedFile.path) {
        await this.patchPositionFromFilePath(pickedFile.path);
      }

      // Convert the file data to a File object
      if (pickedFile.data) {
        const base64Data = pickedFile.data;
        const blob = await fetch(
          `data:${pickedFile.mimeType};base64,${base64Data}`,
        ).then((res) => res.blob());
        const file = new File([blob], pickedFile.name, {
          type: pickedFile.mimeType,
        });

        const compressedFile = await compressFile(file);
        await this.setValueAndTriggerChange(compressedFile);
        this.imageFile = compressedFile;
      }

      this.imagePickedFrom.emit('gallery');
    } catch (e) {
      console.error('Error picking image from gallery:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Picks one gallery image, retrying through the document picker when the
   * gallery hands back something this app cannot read.
   *
   * `ACTION_PICK`, which the pinned picker fires, opens the OEM gallery app.
   * Gallery apps with an old `targetSdkVersion` predate Android 7's
   * `FileProvider` requirement and answer with a raw `file://` URI instead of a
   * `content://` one, which an app holding no storage permission cannot open -
   * the plugin swallows the resulting `EACCES` and returns empty data. That is
   * the defect the upstream Photo Picker change fixed, and pinning to 8.0.2
   * for the sake of EXIF brings it back for those devices (issue #1414).
   *
   * `pickFiles` fires `ACTION_GET_CONTENT`, which Android 13 and later route to
   * the Photo Picker, so the retry always yields a readable `content://` URI.
   * Its photo carries no position - the Photo Picker is what strips it - so
   * this trades the position for an image that actually loads, on the devices
   * that would otherwise get neither. It costs a second selection, which is
   * why it only runs once the first pick is already unusable.
   */
  private async pickGalleryFile(): Promise<PickedFile | undefined> {
    const picked = (
      await FilePicker.pickImages({
        // Single selection. At the default limit of 0 the plugin sets
        // `EXTRA_ALLOW_MULTIPLE`, so the gallery opened in multi-select mode -
        // checkboxes plus a confirming tap - while only the first file was ever
        // read below.
        limit: 1,
        readData: true,
      })
    ).files[0];

    if (!picked) {
      return undefined;
    }

    if (isReadableGalleryFile(picked)) {
      return picked;
    }

    console.warn(
      'Gallery returned an unreadable file, retrying through the document picker:',
      picked.path,
    );

    return (
      await FilePicker.pickFiles({
        types: ['image/*'],
        limit: 1,
        readData: true,
      })
    ).files[0];
  }

  /**
   * Reads the position out of the last gallery pick again.
   *
   * Called after a late media location grant: the photo was already read once,
   * with its location stripped, and nothing else would ever look at it again.
   * A pick that carried no path, and every camera or web photo, has nothing to
   * re-read and is a no-op. See GitHub issue #1394.
   */
  async rereadPositionFromLastPick(): Promise<void> {
    const path = this.lastPickedPath();

    if (!path) {
      return;
    }

    await this.patchPositionFromFilePath(path);
  }

  private async patchPositionFromFilePath(filePath: string): Promise<void> {
    try {
      const exifData = await getExifDataFromFilePath(filePath);

      if (!exifData) {
        return;
      }

      this.positionFromImage.emit(exifData);
    } catch (e) {
      console.warn('Error reading GPS position from file path:', e);
    }
  }

  readAndEmitPositionFrom(photo: Photo): void {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo);

        if (!exifData) {
          return;
        }
        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  private async patchPositionFromFile(file: File | undefined): Promise<void> {
    if (file) {
      try {
        const exifData = await getExifDataFromFile(file);

        if (!exifData) {
          return;
        }

        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from file:', e);
      }
    }
  }

  private setValueAndTriggerChange(compressedPhoto: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const result = reader.result as string;
        this.value.set(result);
        this._onChange(result);
        this._onTouch();
        resolve();
      };
      reader.onerror = (): void => reject(reader.error);
      reader.readAsDataURL(compressedPhoto);
    });
  }

  clearImage(): void {
    this.value.set(null);
    this.failedImageSource.set(null);
    this.lastPickedPath.set(undefined);
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

  // Drag&Drop prevention
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
    this.canvasRotation.set(0);
    this.cropModal()?.dismiss(null, 'cancel');
  }

  confirmCropping(): void {
    const croppedImage = this.croppedImage();

    if (croppedImage) {
      this.value.set(croppedImage);
      this._onChange(croppedImage);
      this._onTouch();

      this.cropModal()?.dismiss(null, 'confirmed');
      this.canvasRotation.set(0);
    }
  }

  rotateImage(): void {
    const currentRotation = this.canvasRotation();
    this.canvasRotation.set((currentRotation + 3) % 4);
  }

  onImageCrop($event: ImageCroppedEvent): void {
    this.croppedImage.set($event.base64);
  }

  onImageLoad(): void {
    this.loadedImageSource.set(this.imageSource());
    this.failedImageSource.set(null);
  }

  onImageError(): void {
    this.failedImageSource.set(this.imageSource());
  }
}
