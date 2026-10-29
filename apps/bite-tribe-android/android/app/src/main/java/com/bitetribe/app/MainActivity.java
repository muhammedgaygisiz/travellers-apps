package com.bitetribe.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        AppCheckProviderInstaller.install();
        // Registration has to happen before the bridge is built, which is what
        // super.onCreate does.
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(BiteHapticsPlugin.class);
        registerPlugin(SaveImagePlugin.class);
        registerPlugin(SocialSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
