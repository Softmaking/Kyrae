import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/attachment_remote_datasource.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

void main() {
  late Dio dio;
  late RecordingHttpClientAdapter adapter;
  late AttachmentRemoteDataSource dataSource;

  setUp(() {
    adapter = RecordingHttpClientAdapter([]);
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
      ..httpClientAdapter = adapter;
    dataSource = AttachmentRemoteDataSource(dio);
  });

  group('canonical wire endpoints', () {
    test(
      'GET /messages/attachment-capabilities keeps the sessionId query and maps sanitized fields',
      () async {
        adapter.queue.add(
          QueuedResponse.json(
            200,
            capabilitiesJson(
              available: false,
              unavailableReasons: ['worker_unavailable', 'profile_unverified'],
            ),
          ),
        );

        final capabilities = await dataSource.capabilities('sess-1');

        final request = adapter.requests.single;
        expect(request.method, 'GET');
        expect(
          request.path,
          'https://api.test${ApiConstants.messages}/attachment-capabilities?sessionId=sess-1',
        );
        expect(request.queryParameters['sessionId'], 'sess-1');
        expect(capabilities.available, isFalse);
        expect(capabilities.unavailableReasons, [
          'worker_unavailable',
          'profile_unverified',
        ]);
        expect(capabilities.provider, 'hermes');
        expect(capabilities.limits.maxFiles, kMaxAttachmentsPerMessage);
        expect(capabilities.limits.maxFileBytes, kMaxAttachmentFileBytes);
        expect(
          capabilities.wire['provider'],
          'hermes',
          reason: 'canonical accounting/profile fields stay accessible',
        );
      },
    );

    test('GET capabilities omits the query item when no sessionId exists', () async {
      adapter.queue.add(QueuedResponse.json(200, capabilitiesJson()));

      await dataSource.capabilities(null);

      expect(
        adapter.requests.single.queryParameters.containsKey('sessionId'),
        isFalse,
      );
    });

    test(
      'POST /messages/upload-batches sends the mobile channel with the idempotency key and sessionId',
      () async {
        adapter.queue.add(QueuedResponse.json(200, batchJson('batch-1')));

        final batch = await dataSource.createBatch(
          'batch-key-1',
          'sess-2',
          CancelToken(),
        );

        final request = adapter.requests.single;
        expect(request.method, 'POST');
        expect(
          request.path,
          'https://api.test${ApiConstants.messages}/upload-batches',
        );
        expect(request.bodyText(), contains('"clientBatchId":"batch-key-1"'));
        expect(request.bodyText(), contains('"channel":"mobile"'));
        expect(request.bodyText(), contains('"sessionId":"sess-2"'));
        expect(batch.id, 'batch-1');
        expect(batch.channel, 'mobile');
        expect(batch.state, 'open');
        expect(batch.capabilities.limits.maxFiles, kMaxAttachmentsPerMessage);
      },
    );

    test(
      'POST /messages/upload-batches drops the sessionId key for new-session drafts',
      () async {
        adapter.queue.add(QueuedResponse.json(200, batchJson('batch-1')));

        await dataSource.createBatch('batch-key-2', null, CancelToken());

        final body = adapter.requests.single.bodyText();
        expect(body, contains('"clientBatchId":"batch-key-2"'));
        expect(body, contains('"channel":"mobile"'));
        expect(body, isNot(contains('sessionId')));
      },
    );

    test(
      'POST /messages/upload-batches/:id/files uploads exactly one multipart file part',
      () async {
        final directory = await Directory.systemTemp.createTemp(
          'attachment-ds-test',
        );
        addTearDown(() => directory.delete(recursive: true));
        const marker = 'fixture-original-content-informe-fiscal';
        final file = File('${directory.path}/informe-original.pdf')
          ..writeAsBytesSync(marker.codeUnits, flush: true);

        adapter.queue.add(
          QueuedResponse.json(
            200,
            attachmentJson(
              id: 'att-10',
              batchId: 'batch-1',
              clientFileId: 'file-key-9',
              // Until finalization the descriptor phase is uploading/pending.
              lifecycle: 'uploading',
              processingStatus: 'pending',
              downloadAvailable: false,
            ),
          ),
        );

        final uploaded = await dataSource.upload(
          'batch-1',
          'file-key-9',
          LocalAttachment(
            path: file.path,
            name: 'informe-original.pdf',
            byteSize: marker.length,
          ),
          CancelToken(),
          (_, _) {},
        );

        final request = adapter.requests.single;
        expect(request.method, 'POST');
        expect(
          request.path,
          'https://api.test${ApiConstants.messages}/upload-batches/batch-1/files',
        );
        expect(request.contentType, contains('multipart/form-data; boundary='));
        final body = request.bodyText();
        expect(body, contains('name="clientFileId"'));
        expect(body, contains('file-key-9'));
        expect(body, contains('name="file"'));
        expect(body, contains('filename="informe-original.pdf"'));
        expect(body, contains(marker), reason: 'exact original bytes travel');
        expect(uploaded.id, 'att-10');
        expect(uploaded.clientFileId, 'file-key-9');
        expect(uploaded.lifecycle, 'uploading');
        expect(uploaded.processingStatus, 'pending');
        expect(uploaded.downloadAvailable, isFalse);
      },
    );

    test(
      'GET /messages/upload-batches/:id maps the full staged batch descriptor',
      () async {
        adapter.queue.add(
          QueuedResponse.json(
            200,
            batchJson('batch-7', state: 'open', attachments: [
              attachmentJson(
                id: 'att-3',
                batchId: 'batch-7',
                clientFileId: 'cf-3',
                sessionId: 'sess-1',
                lifecycle: 'ready',
                processingStatus: 'usable',
              ),
            ]),
          ),
        );

        final batch = await dataSource.batch('batch-7', CancelToken());

        expect(
          adapter.requests.single.path,
          'https://api.test${ApiConstants.messages}/upload-batches/batch-7',
        );
        expect(batch.id, 'batch-7');
        expect(batch.attachments.single.id, 'att-3');
        expect(batch.attachments.single.batchId, 'batch-7');
        expect(batch.attachments.single.lifecycle, 'ready');
        expect(batch.attachments.single.processingStatus, 'usable');
        expect(batch.limits.maxBatchBytes, kMaxAttachmentBatchBytes);
      },
    );

    test(
      'DELETE removes one batch file and cancels the whole batch with 204',
      () async {
        adapter.queue
          ..add(QueuedResponse.bytes(204, Uint8List(0)))
          ..add(QueuedResponse.bytes(204, Uint8List(0)));

        await dataSource.remove('batch-1', 'att-1');
        await dataSource.cancel('batch-1');

        expect(adapter.requests[0].method, 'DELETE');
        expect(
          adapter.requests[0].path,
          'https://api.test${ApiConstants.messages}/upload-batches/batch-1/files/att-1',
        );
        expect(adapter.requests[1].method, 'DELETE');
        expect(
          adapter.requests[1].path,
          'https://api.test${ApiConstants.messages}/upload-batches/batch-1',
        );
      },
    );

    test('GET /messages/attachments/:id maps the refreshed descriptor', () async {
      adapter.queue.add(
        QueuedResponse.json(
          200,
          attachmentJson(
            id: 'att-5',
            batchId: 'batch-1',
            originalFilename: 'fotografia.HEIC',
            mediaType: null,
            category: 'image',
            lifecycle: 'ready',
            processingStatus: 'failed',
            errorCode: 'ATTACHMENT_CODEC_UNAVAILABLE',
            errorMessage: 'decodificador no disponible',
            suggestedAction: 'revisa el formato',
            thumbnailAvailable: false,
          ),
        ),
      );

      final descriptor = await dataSource.descriptor('att-5', CancelToken());

      expect(
        adapter.requests.single.path,
        'https://api.test${ApiConstants.messages}/attachments/att-5',
      );
      expect(descriptor.id, 'att-5');
      expect(descriptor.originalFilename, 'fotografia.HEIC');
      expect(descriptor.category, 'image');
      expect(descriptor.mediaType, isNull);
      expect(descriptor.errorCode, 'ATTACHMENT_CODEC_UNAVAILABLE');
      expect(descriptor.errorMessage, 'decodificador no disponible');
      expect(descriptor.suggestedAction, 'revisa el formato');
      expect(descriptor.processingStatus, 'failed');
    });
  });

  group('original streaming guards', () {
    test(
      'download writes the streamed original byte-for-byte into the target',
      () async {
        final directory = await Directory.systemTemp.createTemp(
          'attachment-dl-test',
        );
        addTearDown(() => directory.delete(recursive: true));
        final target = File('${directory.path}/informe-descargado.pdf');

        final content = utf8.encode('origen-integro-<jpeg/bytes>');
        adapter.queue.add(
          QueuedResponse.stream(200, [
            Uint8List.fromList(content.sublist(0, 12)),
            Uint8List.fromList(content.sublist(12)),
          ]),
        );

        await dataSource.download(
          AssistantAttachment.fromJson(
            attachmentJson(id: 'att-1', byteSize: content.length),
          ),
          target,
          CancelToken(),
        );

        expect(
          adapter.requests.single.path,
          'https://api.test${ApiConstants.messages}/attachments/att-1/content',
        );
        expect(await target.readAsBytes(), content);
      },
    );

    test(
      'download aborts when the stream exceeds the declared original size',
      () async {
        final directory = await Directory.systemTemp.createTemp(
          'attachment-dl-test',
        );
        addTearDown(() => directory.delete(recursive: true));
        final target = File('${directory.path}/informe.pdf');

        adapter.queue.add(
          QueuedResponse.stream(200, [
            Uint8List.fromList(utf8.encode('0123456789')),
          ]),
        );

        await expectLater(
          dataSource.download(
            AssistantAttachment.fromJson(
              attachmentJson(id: 'att-1', byteSize: 5),
            ),
            target,
            CancelToken(),
          ),
          throwsA(
            isA<FormatException>().having(
              (error) => error.message,
              'message',
              'Original size mismatch',
            ),
          ),
        );
      },
    );

    test(
      'download aborts when the stream is shorter than the declared original',
      () async {
        final directory = await Directory.systemTemp.createTemp(
          'attachment-dl-test',
        );
        addTearDown(() => directory.delete(recursive: true));
        final target = File('${directory.path}/informe.pdf');

        adapter.queue.add(
          QueuedResponse.stream(200, [Uint8List.fromList(utf8.encode('short'))]),
        );

        await expectLater(
          dataSource.download(
            AssistantAttachment.fromJson(
              attachmentJson(id: 'att-1', byteSize: 64),
            ),
            target,
            CancelToken(),
          ),
          throwsA(
            isA<FormatException>().having(
              (error) => error.message,
              'message',
              'Incomplete original',
            ),
          ),
        );
      },
    );

    test('thumbnail accepts image payloads under the 128 KiB guard', () async {
      final pngBytes = Uint8List.fromList([0x89, 0x50, 0x4e, 0x47, 10, 11]);
      adapter.queue.add(
        QueuedResponse.bytes(200, pngBytes, headers: {
          'content-type': ['image/png'],
        }),
      );

      final bytes = await dataSource.thumbnail('att-1', CancelToken());

      expect(
        adapter.requests.single.path,
        'https://api.test${ApiConstants.messages}/attachments/att-1/thumbnail',
      );
      expect(bytes, pngBytes);
    });

    test('thumbnail rejects unsafe content types explicitly', () async {
      adapter.queue.add(
        QueuedResponse.bytes(200, Uint8List.fromList(utf8.encode('<html/>')), headers: {
          'content-type': ['text/html'],
        }),
      );

      await expectLater(
        dataSource.thumbnail('att-1', CancelToken()),
        throwsA(isA<FormatException>()),
      );
    });

    test('thumbnail rejects payloads above 128 KiB without materializing', () async {
      adapter.queue.add(
        QueuedResponse.bytes(200, Uint8List(131073), headers: {
          'content-type': ['image/png'],
        }),
      );

      await expectLater(
        dataSource.thumbnail('att-1', CancelToken()),
        throwsA(
          isA<FormatException>().having(
            (error) => error.message,
            'message',
            'Thumbnail too large',
          ),
        ),
      );
    });
  });

  group('attachmentError mapping', () {
    DioException statusResponse(int statusCode) {
      final options = RequestOptions(path: '/');
      return DioException(
        requestOptions: options,
        response: Response(requestOptions: options, statusCode: statusCode),
      );
    }

    DioException codeResponse(String code) {
      final options = RequestOptions(path: '/');
      return DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: 409,
          data: {
            'code': code,
            'message': 'texto crudo del parser debe filtrarse',
          },
        ),
      );
    }

    test('maps 403 to a permission explanation', () {
      expect(
        attachmentError(statusResponse(403)),
        'No tienes permisos para acceder a este archivo.',
      );
    });

    test('maps 404 to an owner-scoped unavailability explanation', () {
      expect(
        attachmentError(statusResponse(404)),
        'Archivo no disponible o sin acceso.',
      );
    });

    test('maps canonical error codes to stable operator messages', () {
      expect(
        attachmentError(codeResponse('ATTACHMENTS_DISPATCH_INDETERMINATE')),
        contains('indeterminada'),
        reason:
            'indeterminate dispatch must never promise automatic redispatch',
      );
      expect(
        attachmentError(codeResponse('ATTACHMENTS_CAPABILITY_UNAVAILABLE')),
        contains('no está disponible'),
        reason: 'unavailable capability keeps staged originals',
      );
      expect(
        attachmentError(codeResponse('ATTACHMENT_IDEMPOTENCY_CONFLICT')),
        contains('no coincide'),
      );
      expect(
        attachmentError(codeResponse('ATTACHMENT_NOT_READY')),
        contains('Espera a que'),
      );
    });

    test('falls back to a file-retaining neutral message for unknown codes', () {
      expect(
        attachmentError(codeResponse('ATTACHMENT_UNEXPECTED_HYPOTHETICAL')),
        contains('Reintenta'),
        reason: 'raw parser/provider text must never leak',
      );
    });

    test('translates temporary-file losses into reselection guidance', () {
      expect(
        attachmentError(const FileSystemException('no such file', '/tmp/x')),
        contains('El archivo temporal ya no está disponible'),
      );
    });

    test('keeps a safe fallback for unclassified failures', () {
      expect(
        attachmentError(const FormatException('boom')),
        contains('original del servidor se conserva'),
      );
    });
  });
}
