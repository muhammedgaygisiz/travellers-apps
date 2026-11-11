# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Keep line numbers so Crashlytics and Play can map a trace back to a source
# line, not just a method (issue #1449). The original file name is replaced,
# since the mapping restores it anyway.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor reads its plugin annotations at runtime: @CapacitorPlugin for the
# permission aliases, @PluginMethod and @Permission for the bridge. Capacitor's
# own consumer rules keep the plugin classes but not the annotation types, and
# R8 full mode (the AGP 8 default) drops an annotation whose type is not kept.
# Without this, getPluginAnnotation() returns null and the first
# checkPermissions() call crashes the app (issue #1449, found on a non-debuggable
# R8 build; a debuggable build does not strip them, so the qa type hid it).
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

# @capacitor-firebase/authentication compiles its Facebook handler against the
# Facebook SDK as compileOnly unless rgcfaIncludeFacebook is set. BiteTribe
# signs in with google.com and apple.com only (capacitor.config.ts), so the
# handler is never constructed and the SDK is deliberately absent.
-dontwarn com.facebook.**
