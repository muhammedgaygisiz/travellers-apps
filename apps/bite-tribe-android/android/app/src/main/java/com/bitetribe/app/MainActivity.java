package com.bitetribe.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        AppCheckProviderInstaller.install();
        super.onCreate(savedInstanceState);
    }
}
