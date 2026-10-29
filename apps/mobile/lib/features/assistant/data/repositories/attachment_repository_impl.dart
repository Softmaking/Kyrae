import 'dart:io';
import 'dart:typed_data';
import 'dart:ui';
import 'package:dio/dio.dart';
import '../../domain/entities/assistant_attachment.dart';
import '../../domain/repositories/attachment_repository.dart';
import '../datasources/attachment_local_datasource.dart';
import '../datasources/attachment_remote_datasource.dart';

class AttachmentRepositoryImpl implements AttachmentRepository {
  AttachmentRepositoryImpl(this.remote, this.local);
  final AttachmentRemoteDataSource remote;
  final AttachmentLocalDataSource local;
  @override
  Future<List<LocalAttachment>> pick(bool photos) => local.pick(photos: photos);
  @override
  Future<AttachmentCapabilities> capabilities(String? sessionId) => remote.capabilities(sessionId);
  @override
  Future<AssistantUploadBatch> createBatch(String key, String? sessionId, CancelToken token) => remote.createBatch(key, sessionId, token);
  @override
  Future<AssistantUploadBatch> batch(String id, CancelToken token) => remote.batch(id, token);
  @override
  Future<AssistantAttachment> upload(String batchId, String key, LocalAttachment file, CancelToken token, ProgressCallback progress) => remote.upload(batchId, key, file, token, progress);
  @override
  Future<void> remove(String batchId, String id) => remote.remove(batchId, id);
  @override
  Future<void> cancel(String id) => remote.cancel(id);
  @override
  Future<Uint8List> thumbnail(String id, CancelToken token) => remote.thumbnail(id, token);
  @override
  Future<AttachmentExportResult> export(AssistantAttachment attachment, bool save, CancelToken token, Rect? origin) async {
    final current = await remote.descriptor(attachment.id, token);
    if (!current.downloadAvailable) throw const FileSystemException('Original unavailable');
    final directory = await local.newDirectory();
    final target = File('${directory.path}/${safeAttachmentFilename(current.originalFilename)}');
    try {
      await remote.download(current, target, token);
      if (token.isCancelled) throw token.cancelError!;
      return await local.export(target, save: save, origin: origin);
    } finally { await local.release(target.path); }
  }
  @override
  Future<void> release(String path) => local.release(path);
  @override
  Future<void> clear() => local.clear();
}
