package com.astikan.healthcare;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "VoiceCallMode",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class VoiceCallModePlugin extends Plugin {

    private boolean hasMicPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < 33
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject permissionResult(boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("microphone", hasMicPermission() ? "granted" : "denied");
        result.put("notifications", hasNotificationPermission() ? "granted" : "denied");
        return result;
    }

    @PluginMethod
    public void ensurePermissions(PluginCall call) {
        if (hasMicPermission() && hasNotificationPermission()) {
            call.resolve(permissionResult(true));
            return;
        }
        requestAllPermissions(call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        boolean granted = hasMicPermission() && hasNotificationPermission();
        call.resolve(permissionResult(granted));
    }

    @PluginMethod
    public void startCallMode(PluginCall call) {
        if (!hasMicPermission()) {
            call.reject("Microphone permission is required for Astikan voice call mode.");
            return;
        }

        String title = call.getString("title", "Astikan consultation active");
        String text = call.getString("text", "Astikan voice consultation is still active.");

        Intent intent = new Intent(getContext(), VoiceCallForegroundService.class);
        intent.setAction(VoiceCallForegroundService.ACTION_START);
        intent.putExtra(VoiceCallForegroundService.EXTRA_TITLE, title);
        intent.putExtra(VoiceCallForegroundService.EXTRA_TEXT, text);
        ContextCompat.startForegroundService(getContext(), intent);

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopCallMode(PluginCall call) {
        Intent intent = new Intent(getContext(), VoiceCallForegroundService.class);
        intent.setAction(VoiceCallForegroundService.ACTION_STOP);
        getContext().stopService(intent);

        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }
}
