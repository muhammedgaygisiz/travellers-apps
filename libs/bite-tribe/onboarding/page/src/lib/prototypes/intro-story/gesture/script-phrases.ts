/**
 * Reusable synced gesture phrases — pointer lands on the control, then the
 * UI state change fires at press (emitOnPress), then we hold the result.
 */
import { easeOutCubic } from './easing';
import type { GestureEmit, GestureScriptBuilder } from './gesture-script';
import {
  APPROACH_MS,
  CREATE_PHOTO_SEL,
  MOVE_MS,
  PHOTO_APPEAR_HOLD_MS,
  PHOTO_SELECT_HOLD_MS,
  PICKER_OPEN_HOLD_MS,
  SETTLE_MS,
  TAP_PAUSE_MS,
  pickerPhotoSel,
} from './timing';

/**
 * Create form → open picker → pick a photo → apply on form.
 * Cursor is on `image-upload` when the picker opens; on the cell when selected.
 */
export function appendPickPhoto(
  builder: GestureScriptBuilder,
  opts?: { photoIndex?: number },
): GestureScriptBuilder {
  const index = opts?.photoIndex ?? 0;
  const selectEmit: GestureEmit =
    index === 0
      ? { type: 'selectPickerPhoto' }
      : { type: 'selectPickerPhotoIndex', index };

  return builder
    .moveTo(CREATE_PHOTO_SEL, MOVE_MS, easeOutCubic)
    .wait(SETTLE_MS)
    .tap(CREATE_PHOTO_SEL, {
      approachMs: 320,
      emitOnPress: { type: 'openPicker' },
    })
    .wait(PICKER_OPEN_HOLD_MS)
    .tap(pickerPhotoSel(index), {
      approachMs: APPROACH_MS,
      emitOnPress: selectEmit,
    })
    .wait(PHOTO_SELECT_HOLD_MS)
    .emit({ type: 'closePicker' })
    .wait(TAP_PAUSE_MS)
    .emit({ type: 'applyPhoto' })
    .wait(PHOTO_APPEAR_HOLD_MS);
}

/**
 * Browse several picker cells, then commit and apply.
 * Caller must already be on create; pointer should be free.
 */
export function appendBrowsePickerThenPick(
  builder: GestureScriptBuilder,
  indices: number[] = [0, 1, 2],
): GestureScriptBuilder {
  let b = builder
    .moveTo(CREATE_PHOTO_SEL, MOVE_MS, easeOutCubic)
    .wait(SETTLE_MS)
    .tap(CREATE_PHOTO_SEL, {
      approachMs: 320,
      emitOnPress: { type: 'openPicker' },
    })
    .wait(PICKER_OPEN_HOLD_MS);

  for (const index of indices) {
    b = b
      .tap(pickerPhotoSel(index), {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPickerPhotoIndex', index },
      })
      .wait(PHOTO_SELECT_HOLD_MS);
  }

  return b
    .emit({ type: 'selectPickerPhoto' })
    .wait(TAP_PAUSE_MS)
    .emit({ type: 'closePicker' })
    .wait(TAP_PAUSE_MS)
    .emit({ type: 'applyPhoto' })
    .wait(PHOTO_APPEAR_HOLD_MS);
}

/** Convenience — start from appear near the photo control. */
export function appendAppearAndPickPhoto(
  builder: GestureScriptBuilder,
  opts?: { photoIndex?: number },
): GestureScriptBuilder {
  return appendPickPhoto(builder.appear({ x: 70, y: 80 }), opts);
}
