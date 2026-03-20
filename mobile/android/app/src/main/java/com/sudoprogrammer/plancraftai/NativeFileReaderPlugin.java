package com.sudoprogrammer.plancraftai;

import android.net.Uri;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@CapacitorPlugin(name = "NativeFileReader")
public class NativeFileReaderPlugin extends Plugin {
    @PluginMethod
    public void readFileBase64(PluginCall call) {
        String rawPath = call.getString("path");
        if (rawPath == null || rawPath.trim().isEmpty()) {
            call.reject("Missing file path");
            return;
        }

        try {
            Uri uri = Uri.parse(rawPath);
            byte[] bytes = readBytes(uri, rawPath);
            JSObject result = new JSObject();
            result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            result.put("mimeType", resolveMimeType(uri, rawPath));
            result.put("size", bytes.length);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Failed to read native file: " + error.getMessage());
        }
    }

    private byte[] readBytes(Uri uri, String rawPath) throws IOException {
        String scheme = uri.getScheme();
        InputStream inputStream = null;

        try {
            if ("content".equalsIgnoreCase(scheme)) {
                inputStream = getContext().getContentResolver().openInputStream(uri);
            } else if ("file".equalsIgnoreCase(scheme)) {
                inputStream = new FileInputStream(new File(uri.getPath()));
            } else if (scheme == null || scheme.isEmpty()) {
                inputStream = new FileInputStream(new File(rawPath));
            } else {
                inputStream = getContext().getContentResolver().openInputStream(uri);
            }

            if (inputStream == null) {
                throw new IOException("Unable to open file stream");
            }

            return readAllBytes(inputStream);
        } finally {
            if (inputStream != null) {
                inputStream.close();
            }
        }
    }

    private byte[] readAllBytes(InputStream inputStream) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, count);
        }
        return outputStream.toByteArray();
    }

    private String resolveMimeType(Uri uri, String rawPath) {
        String mimeType = null;
        try {
            mimeType = getContext().getContentResolver().getType(uri);
        } catch (Exception ignored) {
        }
        if (mimeType != null && !mimeType.isEmpty()) {
            String normalized = normalizeMimeType(mimeType, rawPath, uri);
            if (normalized != null && !normalized.isEmpty()) {
                return normalized;
            }
            return mimeType;
        }

        String extension = getExtension(rawPath, uri);
        String explicitMimeType = mimeTypeForExtension(extension);
        if (explicitMimeType != null && !explicitMimeType.isEmpty()) {
            return explicitMimeType;
        }

        extension = MimeTypeMap.getFileExtensionFromUrl(rawPath);
        if (extension == null || extension.isEmpty()) {
            String path = uri.getPath();
            if (path != null) {
                int idx = path.lastIndexOf('.');
                if (idx >= 0 && idx + 1 < path.length()) {
                    extension = path.substring(idx + 1);
                }
            }
        }

        if (extension != null && !extension.isEmpty()) {
            String inferred = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
            if (inferred != null && !inferred.isEmpty()) {
                return inferred;
            }
        }

        return "application/octet-stream";
    }

    private String normalizeMimeType(String mimeType, String rawPath, Uri uri) {
        String extension = getExtension(rawPath, uri);
        String explicitMimeType = mimeTypeForExtension(extension);
        if (explicitMimeType == null || explicitMimeType.isEmpty()) {
            return mimeType;
        }

        String cleanedMimeType = mimeType.toLowerCase();
        if ("m4a".equals(extension) && "audio/mpeg".equals(cleanedMimeType)) {
            return explicitMimeType;
        }

        if ("application/octet-stream".equals(cleanedMimeType)) {
            return explicitMimeType;
        }

        return mimeType;
    }

    private String getExtension(String rawPath, Uri uri) {
        String extension = MimeTypeMap.getFileExtensionFromUrl(rawPath);
        if (extension != null && !extension.isEmpty()) {
            return extension.toLowerCase();
        }

        String path = uri != null ? uri.getPath() : null;
        if (path != null) {
            int idx = path.lastIndexOf('.');
            if (idx >= 0 && idx + 1 < path.length()) {
                return path.substring(idx + 1).toLowerCase();
            }
        }

        return "";
    }

    private String mimeTypeForExtension(String extension) {
        if (extension == null || extension.isEmpty()) {
            return null;
        }

        switch (extension.toLowerCase()) {
            case "m4a":
                return "audio/x-m4a";
            case "mp4":
                return "audio/mp4";
            case "aac":
                return "audio/aac";
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "webm":
                return "audio/webm";
            case "ogg":
            case "oga":
                return "audio/ogg";
            case "flac":
                return "audio/flac";
            default:
                return null;
        }
    }
}
