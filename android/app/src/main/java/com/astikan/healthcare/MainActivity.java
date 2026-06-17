package com.astikan.healthcare;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoiceCallModePlugin.class);
        super.onCreate(savedInstanceState);
        bridge.getWebView().clearCache(true);
        bridge.getWebView().clearHistory();
    }
}
