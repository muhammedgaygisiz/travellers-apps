# media-location

Owns the Android `ACCESS_MEDIA_LOCATION` permission — the grant that decides
whether a photo picked from the gallery still carries its GPS position, or
whether Android strips it on the way out.

The permission is requested by the onboarding photos step and by the explicit
recovery actions in Settings and the Bite form. The gallery picker itself never
requests it; see the Media Permission Rule in `ssot/pages/Architecture -
Capacitor.md` and GitHub issue #1394.
