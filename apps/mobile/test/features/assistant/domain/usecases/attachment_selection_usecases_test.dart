import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/attachment_usecases.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

const _policy = AttachmentPolicy();

void main() {
  group('validateAttachmentSelection policy mirror', () {
    test('accepts the canonical five-file maximum', () {
      final files = List.generate(
        5,
        (index) => LocalAttachment(
          path: '/tmp/file-$index.pdf',
          name: 'informe-$index.pdf',
          byteSize: 1024,
        ),
      );

      expect(validateAttachmentSelection(files), isNull);
    });

    test('rejects the sixth file without amending the staged set', () {
      final files = List.generate(
        6,
        (index) => LocalAttachment(
          path: '/tmp/file-$index.pdf',
          name: 'informe-$index.pdf',
          byteSize: 1024,
        ),
      );

      final error = validateAttachmentSelection(files);

      expect(error, isNotNull);
      expect(error, contains('6 archivos'));
      expect(error, contains('${_policy.maxFiles}'));
    });

    test('accepts 20,971,520-byte originals and rejects 20,971,521', () {
      final exact = const LocalAttachment(
        path: '/tmp/exacto.pdf',
        name: 'exacto.pdf',
        byteSize: 20971520,
      );
      final oneByteOver = const LocalAttachment(
        path: '/tmp/exceso.pdf',
        name: 'exceso.pdf',
        byteSize: 20971521,
      );

      expect(validateAttachmentSelection([exact]), isNull);
      final error = validateAttachmentSelection([oneByteOver]);
      expect(error, isNotNull);
      expect(error, contains('exceso.pdf'));
      expect(error, contains('20.971.520'));
    });

    test('rejects filenames above 255 UTF-8 bytes but accepts exactly 255', () {
      final twoByteName = 'ñ' * 200; // 400 bytes UTF-8
      final exactName = 'a' * kMaxAttachmentFilenameBytes;

      expect(
        validateAttachmentSelection([
          LocalAttachment(
            path: '/tmp/n.txt',
            name: twoByteName,
            byteSize: 10,
          ),
        ]),
        isNotNull,
      );
      expect(
        validateAttachmentSelection([
          LocalAttachment(path: '/tmp/a.txt', name: exactName, byteSize: 10),
        ]),
        isNull,
      );
    });

    test('rejects traversal, control, dot and empty filenames', () {
      const traversed = LocalAttachment(
        path: '/tmp/../x',
        name: '../descargas/informe.pdf',
        byteSize: 1,
      );
      const control = LocalAttachment(
        path: '/tmp/x',
        name: 'salto\ndos lineas.pdf',
        byteSize: 1,
      );
      const nul = LocalAttachment(
        path: '/tmp/x',
        name: 'nulo\x00.pdf',
        byteSize: 1,
      );
      const dot = LocalAttachment(path: '/tmp/x', name: '.', byteSize: 1);
      const dotDot = LocalAttachment(path: '/tmp/x', name: '..', byteSize: 1);
      const empty = LocalAttachment(path: '/tmp/x', name: '', byteSize: 1);

      expect(
        validateAttachmentSelection([traversed]),
        isNotNull,
        reason: 'the original filename must not carry path routes',
      );
      expect(validateAttachmentSelection([control]), isNotNull);
      expect(validateAttachmentSelection([nul]), isNotNull);
      expect(validateAttachmentSelection([dot]), isNotNull);
      expect(validateAttachmentSelection([dotDot]), isNotNull);
      expect(validateAttachmentSelection([empty]), isNotNull);
    });

    test('rejects negative byte sizes defensively', () {
      expect(
        validateAttachmentSelection([
          const LocalAttachment(
            path: '/tmp/x',
            name: 'negativo.pdf',
            byteSize: -1,
          ),
        ]),
        isNotNull,
      );
    });

    test(
      'keeps five exact-limit originals inside the 100 MiB aggregate boundary',
      () {
        final files = List.generate(
          5,
          (index) => LocalAttachment(
            path: '/tmp/f-$index',
            name: 'f-$index.bin',
            byteSize: 20971520,
          ),
        );

        expect(validateAttachmentSelection(files), isNull);

        final over = [
          ...files.take(4),
          const LocalAttachment(
            path: '/tmp/f-4',
            name: 'f-4.bin',
            byteSize: 20971521,
          ),
        ];
        expect(validateAttachmentSelection(over), isNotNull);
      },
    );

    test('HEIC/HEIF originals pass through the client with no hidden extension rule', () {
      const heic = LocalAttachment(
        path: '/tmp/IMG_0001.HEIC',
        name: 'IMG_0001.HEIC',
        byteSize: 2048,
      );
      const heif = LocalAttachment(
        path: '/tmp/IMG_0002.heif',
        name: 'IMG_0002.heif',
        byteSize: 2048,
      );

      expect(
        validateAttachmentSelection([heic, heif]),
        isNull,
        reason:
            'the client gates counts/sizes only; HEIC/HEIF reach format authority '
            'through the backend panel',
      );
    });

    test(
      'plain .env has no client-side rejection rule; backend semantics is the gate',
      () {
        const env = LocalAttachment(
          path: '/tmp/.env',
          name: '.env',
          byteSize: 64,
        );

        expect(
          validateAttachmentSelection([env]),
          isNull,
          reason:
              'plain .env rejection is a backend parsing decision; the mobile '
              'selection experience does not hide an extra rule',
        );
      },
    );
  });

  group('exactReadySelection ready-set mirror', () {
    List<Map<String, dynamic>> attachedJsonList(int count) => List.generate(
      count,
      (index) => attachmentJson(
        id: 'att-${index + 1}',
        batchId: 'batch-1',
        clientFileId: 'cf-att-${index + 1}',
        lifecycle: 'ready',
      ),
    );

    test('matches an open unexpired batch with the exact staged set', () {
      final batch = AssistantUploadBatch.fromJson(
        batchJson('batch-1', attachments: attachedJsonList(2)),
      );

      expect(exactReadySelection(batch, batch.attachments), isTrue);
    });

    test('rejects a sixth staged attachment in the ready-set prompt', () {
      final batch = AssistantUploadBatch.fromJson(
        batchJson('batch-1', attachments: attachedJsonList(6)),
      );

      expect(exactReadySelection(batch, batch.attachments), isFalse);
    });

    test('rejects consumed, cancelled and expired batches', () {
      final attachments = attachedJsonList(1);
      final consumed = AssistantUploadBatch.fromJson(
        batchJson('batch-1', state: 'consumed', attachments: attachments),
      );
      final cancelled = AssistantUploadBatch.fromJson(
        batchJson('batch-1', state: 'cancelled', attachments: attachments),
      );
      final expired = AssistantUploadBatch.fromJson(
        batchJson(
          'batch-1',
          attachments: attachments,
          expiresAt: DateTime.now().subtract(const Duration(minutes: 5)),
        ),
      );

      final selected = consumed.attachments;

      expect(exactReadySelection(consumed, selected), isFalse);
      expect(exactReadySelection(cancelled, cancelled.attachments), isFalse);
      expect(exactReadySelection(expired, expired.attachments), isFalse);
    });

    test('rejects non-ready lifecycles', () {
      final uploading = AssistantAttachment.fromJson(
        attachmentJson(
          id: 'att-1',
          batchId: 'batch-1',
          clientFileId: 'cf-att-1',
          lifecycle: 'uploading',
        ),
      );
      final batch = AssistantUploadBatch.fromJson(
        batchJson('batch-1', attachments: [
          attachmentJson(
            id: 'att-1',
            batchId: 'batch-1',
            clientFileId: 'cf-att-1',
            lifecycle: 'uploading',
          ),
        ]),
      );

      expect(exactReadySelection(batch, [uploading]), isFalse);
    });

    test('rejects selections that do not match the batch staged identity', () {
      final batch = AssistantUploadBatch.fromJson(
        batchJson('batch-1', attachments: attachedJsonList(1)),
      );
      final foreign = AssistantAttachment.fromJson(
        attachmentJson(
          id: 'att-2',
          batchId: 'batch-9',
          clientFileId: 'cf-att-2',
          lifecycle: 'ready',
        ),
      );

      expect(exactReadySelection(batch, [foreign]), isFalse);
    });

    test('rejects empty selections and duplicated ids', () {
      final batch = AssistantUploadBatch.fromJson(
        batchJson('batch-1', attachments: attachedJsonList(1)),
      );
      final ready = batch.attachments.single;

      expect(exactReadySelection(batch, []), isFalse);
      expect(exactReadySelection(batch, [ready, ready]), isFalse);
    });
  });

  group('safeAttachmentFilename mirroring', () {
    test('strips separators from staged original names', () {
      expect(
        safeAttachmentFilename('/srv/private/\\secret\\informe.pdf'),
        'informe.pdf',
      );
      expect(safeAttachmentFilename('admisible/informe.pdf'), 'informe.pdf');
    });

    test('replaces control characters with underscores', () {
      final safe = safeAttachmentFilename('sal\u0007to.pdf');

      expect(safe, contains('_'));
      expect(safe.endsWith('.pdf'), isTrue);
    });

    test('covers empty and dot-only basenames with a safe fallback', () {
      expect(safeAttachmentFilename('.'), 'archivo');
      expect(safeAttachmentFilename('..'), 'archivo');
      expect(safeAttachmentFilename(''), 'archivo');
    });

    test('bounds the saved basename to 255 UTF-8 bytes without splitting runes', () {
      final longName = 'ℓ' * 400; // 3 bytes per rune
      final safe = safeAttachmentFilename(longName);

      expect(utf8.encode(safe).length <= kMaxAttachmentFilenameBytes, isTrue);
      expect(safe.isNotEmpty, isTrue);
    });
  });
}
