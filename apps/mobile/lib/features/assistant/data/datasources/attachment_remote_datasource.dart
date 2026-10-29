import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';

class AttachmentRemoteDataSource {
  AttachmentRemoteDataSource(this.dio);
  final Dio dio;
  static const root = '/messages';
  Future<AttachmentCapabilities> capabilities(String? sessionId) async => AttachmentCapabilities.fromJson(
    (await dio.get<Map<String, dynamic>>('$root/attachment-capabilities', queryParameters: {'sessionId': ?sessionId})).data!);
  Future<AssistantUploadBatch> createBatch(String key, String? sessionId, CancelToken cancel) async => AssistantUploadBatch.fromJson(
    (await dio.post<Map<String, dynamic>>('$root/upload-batches', data: {'clientBatchId': key, 'channel': 'mobile', 'sessionId': ?sessionId}, cancelToken: cancel)).data!);
  Future<AssistantUploadBatch> batch(String id, CancelToken cancel) async => AssistantUploadBatch.fromJson(
    (await dio.get<Map<String, dynamic>>('$root/upload-batches/$id', cancelToken: cancel)).data!);
  Future<AssistantAttachment> upload(String batchId, String key, LocalAttachment file, CancelToken cancel, ProgressCallback progress) async {
    Future<FormData> body() async => FormData.fromMap({
      'clientFileId': key,
      'file': await MultipartFile.fromFile(file.path, filename: file.name),
    });
    final response = await dio.post<Map<String, dynamic>>('$root/upload-batches/$batchId/files',
      data: await body(), cancelToken: cancel, onSendProgress: progress,
      options: Options(sendTimeout: const Duration(minutes: 5), receiveTimeout: const Duration(minutes: 5), extra: {'rebuildBody': body}));
    return AssistantAttachment.fromJson(response.data!);
  }
  Future<void> remove(String batchId, String id) async { await dio.delete<void>('$root/upload-batches/$batchId/files/$id'); }
  Future<void> cancel(String id) async { await dio.delete<void>('$root/upload-batches/$id'); }
  Future<AssistantAttachment> descriptor(String id, CancelToken token) async => AssistantAttachment.fromJson(
    (await dio.get<Map<String, dynamic>>('$root/attachments/$id', cancelToken: token)).data!);

  /// Bound the actual stream, including chunked responses; never materialize an original.
  Future<void> download(AssistantAttachment attachment, File target, CancelToken token) async {
    final response = await dio.get<ResponseBody>('$root/attachments/${attachment.id}/content',
      cancelToken: token, options: Options(responseType: ResponseType.stream, receiveTimeout: const Duration(minutes: 5)));
    final sink = target.openWrite();
    var count = 0;
    try {
      await for (final bytes in response.data!.stream) {
        if (token.isCancelled) throw token.cancelError!;
        count += bytes.length;
        if (count > attachment.byteSize || count > 20971520) throw const FormatException('Original size mismatch');
        sink.add(bytes);
      }
      await sink.flush();
      if (count != attachment.byteSize) throw const FormatException('Incomplete original');
    } finally { await sink.close(); }
  }

  Future<Uint8List> thumbnail(String id, CancelToken token) async {
    final response = await dio.get<ResponseBody>('$root/attachments/$id/thumbnail', cancelToken: token,
      options: Options(responseType: ResponseType.stream));
    final mime = response.headers.value('content-type')?.split(';').first;
    if (mime != 'image/png' && mime != 'image/jpeg') throw const FormatException('Unsafe thumbnail');
    final builder = BytesBuilder(copy: false);
    await for (final bytes in response.data!.stream) {
      if (token.isCancelled) throw token.cancelError!;
      if (builder.length + bytes.length > 131072) throw const FormatException('Thumbnail too large');
      builder.add(bytes);
    }
    return builder.takeBytes();
  }
}

String attachmentError(Object error) {
  if (error is DioException) {
    if (error.response?.statusCode == 403) return 'No tienes permisos para acceder a este archivo.';
    if (error.response?.statusCode == 404) return 'Archivo no disponible o sin acceso.';
    final data = error.response?.data;
    if (data is Map && data['code'] is String) {
      return switch (data['code']) {
        'ATTACHMENTS_DISPATCH_INDETERMINATE' => 'Entrega al asistente indeterminada. Consulta la tarea; no se reenviará automáticamente.',
        'ATTACHMENTS_CAPABILITY_UNAVAILABLE' => 'El análisis de archivos no está disponible. Los originales se conservan.',
        'ATTACHMENT_IDEMPOTENCY_CONFLICT' => 'La solicitud original no coincide. Recupera su estado antes de cambiarla.',
        'ATTACHMENT_NOT_READY' => 'Espera a que todos los archivos estén listos.',
        _ => 'No se pudo completar la operación (${data['code']}). Reintenta o retira el archivo.',
      };
    }
  }
  if (error is FileSystemException) return 'El archivo temporal ya no está disponible. Retíralo y selecciónalo otra vez.';
  return 'No se pudo completar la operación. Reintenta; el original del servidor se conserva.';
}
