import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';
import 'package:kyrae_mobile/features/assistant/presentation/providers/attachment_provider.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

void main() {
  late FakeAttachmentRepository repository;
  late ProviderContainer container;
  late AttachmentController controller;

  setUp(() {
    repository = FakeAttachmentRepository();
    container = ProviderContainer(
      overrides: [
        authControllerProvider.overrideWith(StubAuthController.new),
        attachmentRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    controller = container.read(attachmentControllerProvider.notifier);
  });

  LocalAttachment stagedFile(String name, [int byteSize = 2048]) =>
      LocalAttachment(path: '/tmp/staged/$name', name: name, byteSize: byteSize);

  Future<AttachmentDraft> driveReadyDraft() async {
    repository.pickResult = [
      stagedFile('informe-driven.pdf'),
    ];
    await controller.pick(false);
    await pumpUntil(
      () => container.read(attachmentControllerProvider).ready,
    );
    return container.read(attachmentControllerProvider);
  }

  test('uploads the picked set through one server batch until every file is ready', () async {
    final draft = await driveReadyDraft();

    expect(draft.ready, isTrue);
    expect(repository.pickCalls, [false]);
    expect(repository.createBatchCalls, hasLength(1));
    expect(repository.createBatchCalls.single.key, isNotEmpty);
    expect(repository.createBatchCalls.single.sessionId, isNull);
    expect(repository.uploadCalls.single.batchId, repository.batchId);
    expect(draft.files.single.attachment!.lifecycle, 'ready');
    expect(draft.capabilities?.available, isTrue);
  });

  test('keeps the same submission and clientMessageId across ambiguous retries', () async {
    await driveReadyDraft();

    final submission = await controller.prepare('  Resumir las cifras del informe  ');
    expect(submission, isNotNull);
    expect(submission!.message, 'Resumir las cifras del informe');
    expect(submission.uploadBatchId, repository.batchId);
    expect(submission.attachmentIds, ['att-1']);
    expect(submission.clientMessageId, isNotEmpty);

    controller.uncertain();

    final recovered = await controller.prepare('Resumir las cifras del informe');
    expect(identical(recovered, submission), isTrue);
    expect(
      recovered!.clientMessageId,
      submission.clientMessageId,
      reason:
          'a retried ambiguous send must reuse one idempotency key so the backend '
          'returns the already-committed task instead of a duplicate turn',
    );

    await expectLater(
      controller.prepare('otra instrucción distinta'),
      throwsA(isA<FormatException>()),
    );
  });

  test('cancels the server batch and reloads capabilities when the session changes', () async {
    await driveReadyDraft();
    expect(container.read(attachmentControllerProvider).batch!.id, repository.batchId);

    await controller.setSession('sess-9');
    await pumpUntil(
      () => container.read(attachmentControllerProvider).capabilities != null &&
          container.read(attachmentControllerProvider).files.isEmpty,
    );

    expect(repository.cancelIds, [repository.batchId]);
    expect(repository.capabilitiesCalls.last, 'sess-9');
    expect(container.read(attachmentControllerProvider).files, isEmpty);
  });

  test('recovers a lost upload acknowledgement from the authoritative batch', () async {
    final draft = await driveReadyDraft();
    final uploadsBefore = repository.uploadCalls.length;

    final file = draft.files.single;
    file.attachment = null;
    file.error = 'No se confirmó la transferencia.';

    await controller.retry(file);
    await pumpUntil(() => container.read(attachmentControllerProvider).ready);

    expect(repository.uploadCalls.length, uploadsBefore);
    expect(file.attachment!.lifecycle, 'ready');
    expect(file.error, isNull);
    expect(
      repository.batchCalls,
      isNotEmpty,
      reason: 'refresh() must consult the server state after a lost ack',
    );
  });

  test('caches thumbnails per attachment id and processing version', () async {
    await driveReadyDraft();
    final attachment = AssistantAttachment.fromJson(
      attachmentJson(
        id: 'att-thumbs',
        batchId: repository.batchId,
        clientFileId: 'cf-thumbs',
        thumbnailAvailable: true,
        processingVersion: 1,
      ),
    );

    final first = await controller.thumbnail(attachment);
    final second = await controller.thumbnail(attachment);

    expect(first, repository.thumbnailBytes);
    expect(second, repository.thumbnailBytes);
    expect(repository.thumbnailCalls, hasLength(1));

    final newer = AssistantAttachment.fromJson(
      attachmentJson(
        id: 'att-thumbs',
        batchId: repository.batchId,
        clientFileId: 'cf-thumbs',
        thumbnailAvailable: true,
        processingVersion: 2,
      ),
    );
    await controller.thumbnail(newer);

    expect(repository.thumbnailCalls, hasLength(2));
  });

  test('does not fetch thumbnails when the descriptor blocks previews', () async {
    await driveReadyDraft();
    final attachment = AssistantAttachment.fromJson(
      attachmentJson(
        id: 'att-without-thumb',
        batchId: repository.batchId,
        clientFileId: 'cf-without-thumb',
        thumbnailAvailable: false,
      ),
    );

    expect(await controller.thumbnail(attachment), isNull);
    expect(repository.thumbnailCalls, isEmpty);
  });

  test('removes a ready file from the server batch and drops the staging set', () async {
    final draft = await driveReadyDraft();
    final file = draft.files.single;

    await controller.remove(file);
    await pumpUntil(
      () => container.read(attachmentControllerProvider).files.isEmpty,
    );

    final attachmentId = file.attachment!.id;
    expect(
      repository.removeCalls.single,
      (batchId: repository.batchId, attachmentId: attachmentId),
    );
    expect(
      repository.releasedPaths,
      contains(file.local.path),
      reason: 'local staging must be released with the server descriptor',
    );
    expect(container.read(attachmentControllerProvider).files, isEmpty);
  });

  test('blocks additional picking while the draft sits locked after prepare', () async {
    await driveReadyDraft();

    await controller.prepare('instrucción con archivos listos');

    expect(container.read(attachmentControllerProvider).locked, isTrue);
    await controller.pick(false);
    expect(
      container.read(attachmentControllerProvider).files,
      hasLength(1),
      reason: 'lock keeps the committed ready-set stable',
    );
    expect(
      repository.pickCalls,
      hasLength(1),
      reason: 'the picker is not invoked behind the lock',
    );
  });
}
