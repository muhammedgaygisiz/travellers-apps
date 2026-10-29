# social-share

Typed bridge to the `SocialShare` Capacitor plugin in the iOS and Android
wrappers, which hands a composed share image straight to the Instagram and
Facebook Stories editors and to Instagram's feed composer (issue #1730).

Native only. The web build has no implementation, so callers branch on the
platform before calling in. See `UC - Share A Bite To Social Media`.
