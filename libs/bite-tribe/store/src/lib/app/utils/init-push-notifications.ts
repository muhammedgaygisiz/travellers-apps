import { Observable, pipe, tap, UnaryFunction } from 'rxjs';
import { initPushListeners } from 'push-notifications';
import { Platform } from '@ionic/angular';
import { PushNavigationService } from '../push-navigation.service';

/**
 * Wires push listeners after login. It deliberately does not ask for the OS
 * permission: the onboarding notification step owns that prompt so the user
 * hears why notifications matter first (epic #850, issue #1015).
 *
 * A tap that launched the app is delivered here, by the plugin, as soon as the
 * listener is registered — which is mid-startup. The target is therefore handed
 * to {@link PushNavigationService}, which holds it until startup navigation has
 * come to rest, rather than navigated straight away where the startup chain
 * would overwrite it with Home (issue #1244).
 */
export const initPushNotifications = (
  platform: Platform,
  pushNavigation: PushNavigationService,
): UnaryFunction<Observable<string>, Observable<string>> =>
  pipe(
    tap(
      async (uid: string) =>
        await initPushListeners(platform, uid, (target) =>
          pushNavigation.open(target),
        ),
    ),
  );
