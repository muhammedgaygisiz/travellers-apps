import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import {
  drawShareImage,
  SHARE_IMAGE_FONT_FAMILY,
  type ShareImageAssets,
} from '../draw-share-image';
import {
  SHARE_IMAGE_SIZE,
  type ShareImageContent,
  type ShareImageFormat,
} from '../share-image-content';
import {
  DEFAULT_SHARE_IMAGE_STYLE,
  type ShareImageStyle,
} from '../share-image-style';

/** JPEG at this quality is what Instagram and Facebook re-encode to anyway. */
const EXPORT_TYPE = 'image/jpeg';
const EXPORT_QUALITY = 0.92;

/**
 * The share image, drawn at its full size and scaled down on screen by CSS.
 *
 * The canvas is both the preview and the source of the exported file, so what
 * the user sees is exactly what is shared (`UC-SBS` `R-10`).
 */
@Component({
  selector: 'bt-share-image-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      [width]="size().width"
      [height]="size().height"
      [attr.aria-label]="label()"
      role="img"
      data-testid="share-image-preview"
    ></canvas>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* The canvas keeps its 9:16 ratio and shrinks to whichever of the host's
       width or height runs out first, so the whole image is always in view. */
    canvas {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
    }
  `,
})
export class ShareImagePreviewComponent {
  readonly content = input.required<ShareImageContent>();
  readonly photo = input<ShareImageAssets['photo']>();
  readonly logo = input<ShareImageAssets['logo']>();
  readonly format = input<ShareImageFormat>('story');
  readonly fontFamily = input(SHARE_IMAGE_FONT_FAMILY);
  /** The layout and colours to draw in. */
  readonly imageStyle = input<ShareImageStyle>(DEFAULT_SHARE_IMAGE_STYLE);
  /** What a screen reader announces for the image. */
  readonly label = input('');

  protected readonly size = computed(() => SHARE_IMAGE_SIZE[this.format()]);

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    // After render, so the canvas has taken the size bound above before it is
    // drawn on: resizing a canvas clears it.
    afterRenderEffect(() => {
      const ctx = this.canvas().nativeElement.getContext('2d');

      if (ctx) {
        drawShareImage(
          ctx,
          this.content(),
          { photo: this.photo(), logo: this.logo() },
          this.format(),
          this.fontFamily(),
          this.imageStyle(),
        );
      }
    });
  }

  /** The image as shown, re-encoded as a JPEG. */
  toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas().nativeElement.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('The share image could not be encoded.')),
        EXPORT_TYPE,
        EXPORT_QUALITY,
      );
    });
  }
}
