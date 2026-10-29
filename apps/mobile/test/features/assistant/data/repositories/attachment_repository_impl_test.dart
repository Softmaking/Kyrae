import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/attachment_local_datasource.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/attachment_remote_datasource.dart';
import 'package:kyrae_mobile/features/assistant/data/repositories/attachment_repository_impl.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

class _RecordingLocalDataSource extends AttachmentLocalDataSource {
  _RecordingLocalDataSource(this.directory);

  final Directory directory;
  final List<({String path, bool save, Rect? origin})> exportCalls = [];
  final List<String> releasedPaths = [];
  final List<bool> pickCalls = [];
  int clearCalls = 0;
  List<LocalAttachment> pickedFiles = [];

  @override
  Future<List<LocalAttachment>> pick({required bool photos}) async {
    pickCalls.add(photos);
    return pickedFiles;
  }

  @override
  Future<Directory> newDirectory() async => directory;

  @override
  Future<AttachmentExportResult> export(
    File file, {
    required bool save,
    Rect? origin,
  }) async {
    exportCalls.add((path: file.path, save: save, origin: origin));
    return save
        ? AttachmentExportResult.saved
        : AttachmentExportResult.shared;
  }

  @override
  Future<void> release(String path) async {
    releasedPaths.add(path);
  }

  @override
  Future<void> clear() async {
    clearCalls++;
  }
}

void main() {
  late Directory workingDirectory;
  late _RecordingLocalDataSource local;
  late RecordingHttpClientAdapter adapter;
  late Dio dio;
  late AttachmentRepositoryImpl repository;

  setUp(() async {
    workingDirectory = await Directory.systemTemp.createTemp(
      'attachment-repo-test',
    );
    local = _RecordingLocalDataSource(workingDirectory);
    adapter = RecordingHttpClientAdapter([]);
    dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
      ..httpClientAdapter = adapter;
    repository = AttachmentRepositoryImpl(
      AttachmentRemoteDataSource(dio),
      local,
    );
  });

  tearDown(() async {
    if (await workingDirectory.exists()) {
      await workingDirectory.delete(recursive: true);
    }
  });

  group('AttachmentRepositoryImpl.export', () {
    test(
      'streams the original into a safe temp filename before native save',
      () async {
        final content = utf8.encode('contenido-original-informe-fiscal');
        adapter.queue
          ..add(
            QueuedResponse.json(
              200,
              attachmentJson(
                id: 'att-1',
                batchId: 'batch-1',
                originalFilename: 'informe fiscal 2026.pdf',
                byteSize: content.length,
              ),
            ),
          )
          ..add(
            QueuedResponse.stream(200, [
              Uint8List.fromList(content.sublist(0, 9)),
              Uint8List.fromList(content.sublist(9)),
            ]),
          );

        final result = await repository.export(
          AssistantAttachment.fromJson(
            attachmentJson(id: 'att-1', batchId: 'batch-1'),
          ),
          true,
          CancelToken(),
          null,
        );

        expect(result, AttachmentExportResult.saved);
        expect(
          adapter.requests[0].path,
          'https://api.test${ApiConstants.messages}/attachments/att-1',
        );
        expect(
          adapter.requests[1].path,
          'https://api.test${ApiConstants.messages}/attachments/att-1/content',
        );
        expect(local.exportCalls.single.save, isTrue);

        final targetPath = local.exportCalls.single.path;
        expect(
          targetPath.startsWith(workingDirectory.path),
          isTrue,
          reason: 'downloads stay inside the private attachment staging dir',
        );
        expect(
          targetPath.split('/').last,
          'informe fiscal 2026.pdf',
          reason: 'the safe original filename is preserved for the user',
        );
        expect(
          await File(targetPath).readAsBytes(),
          content,
          reason: 'the downloaded original stays byte-identical',
        );
        expect(local.releasedPaths, [targetPath]);
      },
    );

    test('delegates share flows with the invocation origin preserved', () async {
      final content = utf8.encode('bytes');
      adapter.queue
        ..add(
          QueuedResponse.json(
            200,
            attachmentJson(
              id: 'att-2',
              batchId: 'batch-1',
              originalFilename: 'resumen.md',
              byteSize: content.length,
            ),
          ),
        )
        ..add(
          QueuedResponse.stream(200, [Uint8List.fromList(content)]),
        );

      final result = await repository.export(
        AssistantAttachment.fromJson(
          attachmentJson(id: 'att-2', batchId: 'batch-1'),
        ),
        false,
        CancelToken(),
        const Rect.fromLTRB(0, 0, 10, 20),
      );

      expect(result, AttachmentExportResult.shared);
      expect(local.exportCalls.single.save, isFalse);
      expect(local.exportCalls.single.origin, const Rect.fromLTRB(0, 0, 10, 20));
    });

    test(
      'rejects exports when the refreshed descriptor drops the original',
      () async {
        adapter.queue.add(
          QueuedResponse.json(
            200,
            attachmentJson(
              id: 'att-3',
              batchId: 'batch-1',
              originalFilename: 'perdido.pdf',
              downloadAvailable: false,
            ),
          ),
        );

        await expectLater(
          repository.export(
            AssistantAttachment.fromJson(
              attachmentJson(id: 'att-3', batchId: 'batch-1'),
            ),
            true,
            CancelToken(),
            null,
          ),
          throwsA(isA<FileSystemException>()),
        );

        expect(
          adapter.requests.single.path,
          'https://api.test${ApiConstants.messages}/attachments/att-3',
        );
        expect(local.exportCalls, isEmpty);
        expect(local.releasedPaths, isEmpty);
      },
    );
  });

  group('AttachmentRepositoryImpl delegates', () {
    test('keeps pick/release/clear aligned with the local datasource', () async {
      final picked = [
        const LocalAttachment(
          path: '/tmp/pick-1.pdf',
          name: 'pick-1.pdf',
          byteSize: 10,
        ),
      ];
      local.pickedFiles = picked;

      expect(await repository.pick(false), picked);
      expect(local.pickCalls, [false]);

      await repository.release('/tmp/pick-1.pdf');
      expect(local.releasedPaths, ['/tmp/pick-1.pdf']);

      await repository.clear();
      expect(local.clearCalls, 1);
    });
  });
}
