package com.example.kyrae_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.app.Activity
import android.content.Intent
import java.io.File

class MainActivity : FlutterActivity() {
    private var pendingSave: MethodChannel.Result? = null
    private var source: File? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "cl.softmaking.kyrae/attachments")
            .setMethodCallHandler { call, result ->
                if (call.method != "saveOriginal") { result.notImplemented(); return@setMethodCallHandler }
                if (pendingSave != null) { result.error("SAVE_BUSY", "Hay un guardado en curso.", null); return@setMethodCallHandler }
                val path = call.argument<String>("path")
                val file = path?.let { File(it).canonicalFile }
                if (file == null || !file.isFile || !file.path.startsWith(cacheDir.canonicalPath + "/kyrae-attachment-")) {
                    result.error("INVALID_FILE", "Original temporal no disponible.", null); return@setMethodCallHandler
                }
                pendingSave = result
                source = file
                try {
                    startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "application/octet-stream"
                        putExtra(Intent.EXTRA_TITLE, file.name)
                    }, 7041)
                } catch (_: Exception) {
                    pendingSave = null; source = null
                    result.error("SAVE_FAILED", "No se pudo abrir el destino.", null)
                }
            }
    }

    @Deprecated("Required by the Flutter activity result bridge")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 7041) return
        val result = pendingSave ?: return
        val file = source
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null || file == null) {
            pendingSave = null; source = null; result.success(false); return
        }
        Thread {
            try {
                contentResolver.openOutputStream(uri, "wt").use { output ->
                    requireNotNull(output)
                    file.inputStream().use { input -> input.copyTo(output, 65536) }
                    output.flush()
                }
                runOnUiThread { pendingSave = null; source = null; result.success(true) }
            } catch (_: Exception) {
                runOnUiThread { pendingSave = null; source = null; result.error("SAVE_FAILED", "No se pudo guardar el original.", null) }
            }
        }.start()
    }
}
