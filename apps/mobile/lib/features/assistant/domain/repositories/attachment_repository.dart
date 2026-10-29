import 'dart:typed_data';
import 'dart:ui';
import 'package:dio/dio.dart';
import '../entities/assistant_attachment.dart';
import '../../data/datasources/attachment_local_datasource.dart' show AttachmentExportResult;

abstract class AttachmentRepository {
  Future<List<LocalAttachment>> pick(bool photos);
  Future<AttachmentCapabilities> capabilities(String? sessionId);
  Future<AssistantUploadBatch> createBatch(String key, String? sessionId, CancelToken token);
  Future<AssistantUploadBatch> batch(String id, CancelToken token);
  Future<AssistantAttachment> upload(String batchId, String key, LocalAttachment file, CancelToken token, ProgressCallback progress);
  Future<void> remove(String batchId, String id);
  Future<void> cancel(String id);
  Future<Uint8List> thumbnail(String id, CancelToken token);
  Future<AttachmentExportResult> export(AssistantAttachment attachment, bool save, CancelToken token, Rect? origin);
  Future<void> release(String path);
  Future<void> clear();
}
