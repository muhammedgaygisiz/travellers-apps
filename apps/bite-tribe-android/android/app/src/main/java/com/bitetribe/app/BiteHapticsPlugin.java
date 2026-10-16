package com.bitetribe.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.HapticFeedbackConstants;
import android.view.View;

import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plays each intent of `HapticsService` through a platform haptic constant.
 *
 * `@capacitor/haptics` plays a raw `VibrationEffect.createWaveform` for every
 * call, and its Light impact - 50 ms at amplitude 110 - reads as a soft buzz
 * on most hardware. `View.performHapticFeedback` instead lets the OEM's tuned
 * effect for each constant play, at the intensity the user picked for touch
 * feedback (issue #1743).
 *
 * Constants that arrived after the app's minimum API level fall back to the
 * waveform the intent played before, so an older device feels no change.
 */
@CapacitorPlugin(name = "BiteHaptics")
public class BiteHapticsPlugin extends Plugin {

    // The waveforms `@capacitor/haptics` 8.0.2 plays, kept for the fallbacks.
    private static final long[] LIGHT_TIMINGS = { 0, 50 };
    private static final int[] LIGHT_AMPLITUDES = { 0, 110 };
    private static final long[] MEDIUM_TIMINGS = { 0, 43 };
    private static final int[] MEDIUM_AMPLITUDES = { 0, 180 };
    private static final long[] SUCCESS_TIMINGS = { 0, 35, 65, 21 };
    private static final int[] SUCCESS_AMPLITUDES = { 0, 250, 0, 180 };
    private static final long[] ERROR_TIMINGS = { 0, 27, 45, 50 };
    private static final int[] ERROR_AMPLITUDES = { 0, 120, 0, 250 };

    @PluginMethod
    public void press(PluginCall call) {
        play(call, HapticFeedbackConstants.VIRTUAL_KEY);
    }

    @PluginMethod
    public void release(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            play(call, HapticFeedbackConstants.VIRTUAL_KEY_RELEASE);
        } else {
            vibrate(call, LIGHT_TIMINGS, LIGHT_AMPLITUDES);
        }
    }

    @PluginMethod
    public void tick(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            play(call, HapticFeedbackConstants.SEGMENT_TICK);
        } else {
            play(call, HapticFeedbackConstants.CLOCK_TICK);
        }
    }

    @PluginMethod
    public void selection(PluginCall call) {
        play(call, HapticFeedbackConstants.KEYBOARD_TAP);
    }

    @PluginMethod
    public void confirm(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            play(call, HapticFeedbackConstants.CONFIRM);
        } else {
            vibrate(call, MEDIUM_TIMINGS, MEDIUM_AMPLITUDES);
        }
    }

    @PluginMethod
    public void warning(PluginCall call) {
        play(call, HapticFeedbackConstants.LONG_PRESS);
    }

    @PluginMethod
    public void success(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            play(call, HapticFeedbackConstants.CONFIRM);
        } else {
            vibrate(call, SUCCESS_TIMINGS, SUCCESS_AMPLITUDES);
        }
    }

    @PluginMethod
    public void error(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            play(call, HapticFeedbackConstants.REJECT);
        } else {
            vibrate(call, ERROR_TIMINGS, ERROR_AMPLITUDES);
        }
    }

    /**
     * Plays a haptic constant on the WebView, the view the touch landed on.
     *
     * Plugin methods run off the main thread, and a view is only touched on
     * it. The call resolves straight away: the caller fires and forgets, and
     * waiting for the main thread would only delay it.
     */
    private void play(PluginCall call, int feedbackConstant) {
        bridge.executeOnMainThread(() -> {
            View webView = bridge.getWebView();

            if (webView != null) {
                webView.performHapticFeedback(feedbackConstant);
            }
        });

        call.resolve();
    }

    /** The pre-#1743 waveform, for an API level that lacks the constant. */
    private void vibrate(PluginCall call, long[] timings, int[] amplitudes) {
        try {
            Vibrator vibrator = getVibrator();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
            } else {
                vibratePre26(vibrator, timings);
            }
        } catch (Exception error) {
            Logger.error(getLogTag(), "Could not play the haptic fallback", error);
        }

        call.resolve();
    }

    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);

            return manager.getDefaultVibrator();
        }

        return getDeprecatedVibrator();
    }

    @SuppressWarnings("deprecation")
    private Vibrator getDeprecatedVibrator() {
        return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    @SuppressWarnings("deprecation")
    private void vibratePre26(Vibrator vibrator, long[] pattern) {
        vibrator.vibrate(pattern, -1);
    }
}
