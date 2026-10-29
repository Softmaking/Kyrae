import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';

enum AttachmentExportResult { saved, shared, cancelled, unavailable }

class AttachmentLocalDataSource {
  static const channel = MethodChannel('cl.softmaking.kyrae/attachments');
  final Set<Directory> _directories = {};
  int _generation = 0;

  Future<List<LocalAttachment>> pick({required bool photos}) async {
    final generation = _generation;
    if (photos && Platform.isIOS) {
      final rows = await channel.invokeListMethod<dynamic>('pickOriginalPhotos') ?? [];
      final files = rows.map((row) {
        final j = Map<String, dynamic>.from(row as Map);
        return LocalAttachment(path: j['path'] as String, name: j['name'] as String, byteSize: j['byteSize'] as int);
      }).toList();
      for (final file in files) { _directories.add(File(file.path).parent); }
      if (generation != _generation) { await clear(); return []; }
      return files;
    }
    // Broad document types preserve arbitrary textual source/log names and HEIC in Files.
    // Android's media picker copy path is used without compression/resizing options.
    final picked = await FilePicker.pickFiles(type: photos ? FileType.image : FileType.any);
    final result = <LocalAttachment>[];
    try {
      for (final file in picked) {
        final directory = await newDirectory();
        final name = file.name;
        final target = File('${directory.path}/${safeAttachmentFilename(name)}');
        final sink = target.openWrite();
        var bytes = 0;
        try {
          await for (final chunk in file.readAsByteStream()) {
            bytes += chunk.length;
            if (bytes > 20971520) throw FormatException('$name: supera 20 MiB (20.971.520 bytes).');
            sink.add(chunk);
          }
          await sink.flush();
        } finally { await sink.close(); }
        result.add(LocalAttachment(path: target.path, name: name, byteSize: bytes));
      }
      if (generation != _generation) { await clear(); return []; }
      return result;
    } catch (_) {
      for (final file in result) { await release(file.path); }
      rethrow;
    }
  }

  Future<Directory> newDirectory() async {
    final temp = await getTemporaryDirectory();
    final directory = await Directory('${temp.path}/kyrae-attachment-${const Uuid().v4()}').create();
    _directories.add(directory);
    return directory;
  }

  Future<AttachmentExportResult> export(File file, {required bool save, Rect? origin}) async {
    if (save) {
      final saved = await channel.invokeMethod<bool>('saveOriginal', {'path': file.path});
      return saved == true ? AttachmentExportResult.saved : AttachmentExportResult.cancelled;
    }
    final result = await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], sharePositionOrigin: origin));
    return switch (result.status) {
      ShareResultStatus.success => AttachmentExportResult.shared,
      ShareResultStatus.dismissed => AttachmentExportResult.cancelled,
      ShareResultStatus.unavailable => AttachmentExportResult.unavailable,
    };
  }

  Future<void> release(String path) async {
    final directory = File(path).parent;
    if (!_directories.remove(directory)) return;
    if (await directory.exists()) await directory.delete(recursive: true);
  }
  Future<void> clear() async {
    _generation++;
    final directories = _directories.toList();
    _directories.clear();
    for (final directory in directories) {
      try { if (await directory.exists()) await directory.delete(recursive: true); } on FileSystemException { /* OS may have evicted cache. */ }
    }
  }
}

String attachmentExportFeedback(AttachmentExportResult result) => switch (result) {
  AttachmentExportResult.saved => 'Original guardado en el destino seleccionado.',
  AttachmentExportResult.shared => 'Original entregado al destino seleccionado.',
  AttachmentExportResult.cancelled => 'Operación cancelada. El original permanece en el servidor.',
  AttachmentExportResult.unavailable => 'No se pudo confirmar el destino. El original permanece en el servidor.',
};
