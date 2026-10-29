import 'package:dartz/dartz.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/core/notifications/local_notification_service.dart';
import 'package:kyrae_mobile/features/assistant/data/models/assistant_message_model.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/create_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_session_messages_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_sessions_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/get_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/send_assistant_voice_message_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/speak_assistant_message_usecase.dart';
import 'package:kyrae_mobile/features/assistant/presentation/providers/attachment_provider.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

typedef _TaskCall = ({
  String message,
  String? uploadBatchId,
  List<String>? attachmentIds,
  String? clientMessageId,
});

class _NeverAssistantRepository implements AssistantRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) {
    throw StateError(
      'The assistant repository must not be reached in this test '
      '(${invocation.memberName}).',
    );
  }
}

/// Records task submissions and answers with a stable failure so the send flow
/// ends in the ambiguous/uncertain path instead of scheduling the 5 s poll.
class _RecordingTaskUseCase extends CreateAssistantMessageTaskUseCase {
  _RecordingTaskUseCase(Either<Failure, AssistantMessageTask> result)
    : _result = result,
      super(_NeverAssistantRepository());

  final Either<Failure, AssistantMessageTask> _result;
  final List<_TaskCall> calls = [];

  @override
  Future<Either<Failure, AssistantMessageTask>> call({
    required String message,
    String? conversationId,
    String? uploadBatchId,
    List<String>? attachmentIds,
    String? clientMessageId,
  }) async {
    calls.add((
      message: message,
      uploadBatchId: uploadBatchId,
      attachmentIds: attachmentIds,
      clientMessageId: clientMessageId,
    ));
    return _result;
  }
}

class _EmptySessionsUseCase extends FindAssistantSessionsUseCase {
  _EmptySessionsUseCase() : super(_NeverAssistantRepository());

  @override
  Future<Either<Failure, AssistantSessionPage>> call({
    int limit = 10,
    String? cursor,
  }) async {
    return Right(
      AssistantSessionPageModel.fromJson({
        'sessions': <Map<String, dynamic>>[],
        'nextCursor': null,
      }),
    );
  }
}

class _EmptySessionMessagesUseCase
    extends FindAssistantSessionMessagesUseCase {
  _EmptySessionMessagesUseCase() : super(_NeverAssistantRepository());

  @override
  Future<Either<Failure, AssistantSessionMessages>> call(String sessionId) async {
    throw StateError('findSessionMessages must not run before a committed task');
  }
}

void main() {
  late FakeAttachmentRepository attachmentRepository;
  late _RecordingTaskUseCase taskUseCase;
  late ProviderContainer container;

  setUp(() {
    // AssistantController owns AudioRecorder/AudioPlayer; their plugin setup
    // chatters on platform channels whose handlers must exist offline.
    TestWidgetsFlutterBinding.ensureInitialized();
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    for (final channel in const [
      MethodChannel('com.llfbandit.record/messages'),
      MethodChannel('com.ryanheise.just_audio'),
      MethodChannel('com.ryanheise.audioservice/audio_session'),
    ]) {
      messenger.setMockMethodCallHandler(channel, (call) async => null);
    }
    attachmentRepository = FakeAttachmentRepository();
    taskUseCase = _RecordingTaskUseCase(
      const Left(ServerFailure('La tarea no se pudo iniciar')),
    );
    // Constructing LocalNotificationService directly is safe offline; the send
    // failure path never reaches notification calls.
    final notifications = LocalNotificationService(
      FlutterLocalNotificationsPlugin(),
    );
    container = ProviderContainer(
      overrides: [
        authControllerProvider.overrideWith(StubAuthController.new),
        attachmentRepositoryProvider.overrideWithValue(attachmentRepository),
        createAssistantMessageTaskUseCaseProvider.overrideWithValue(taskUseCase),
        getAssistantMessageTaskUseCaseProvider.overrideWithValue(
          _UnusedGetTask(),
        ),
        sendAssistantVoiceMessageUseCaseProvider.overrideWithValue(
          _UnusedSendVoice(),
        ),
        speakAssistantMessageUseCaseProvider.overrideWithValue(
          _UnusedSpeak(),
        ),
        findAssistantSessionsUseCaseProvider.overrideWithValue(
          _EmptySessionsUseCase(),
        ),
        findAssistantSessionMessagesUseCaseProvider.overrideWithValue(
          _EmptySessionMessagesUseCase(),
        ),
        assistantRealtimeDataSourceProvider.overrideWithValue(
          StubRealtimeDataSource(),
        ),
        localNotificationServiceProvider.overrideWithValue(notifications),
      ],
    );
  });

  LocalAttachment stagedFile(String name) => LocalAttachment(
    path: '/tmp/staged/$name',
    name: name,
    byteSize: 1024,
  );

  Future<void> driveReadyDraft() async {
    attachmentRepository.pickResult = [stagedFile('informe-send.pdf')];
    final controller = container.read(attachmentControllerProvider.notifier);
    await controller.pick(false);
    await pumpUntil(() => container.read(attachmentControllerProvider).ready);
  }

  test('whitespace-only instructions never reach the backend', () async {
    final controller = container.read(assistantControllerProvider.notifier);

    await controller.send('   \n\t ');

    expect(taskUseCase.calls, isEmpty);
    final state = container.read(assistantControllerProvider);
    expect(state.errorMessage, isNull);
    expect(state.isSending, isFalse);
  });

  test('rejects instructions above 4,000 characters with a structured error', () async {
    final controller = container.read(assistantControllerProvider.notifier);

    await controller.send('x' * 4001);

    expect(taskUseCase.calls, isEmpty);
    expect(
      container.read(assistantControllerProvider).errorMessage,
      contains('4.000 caracteres'),
      reason: 'the descriptor field length bound needs an explicit message',
    );
  });

  test('text-only sends submit trimmed instructions without attachment fields', () async {
    final controller = container.read(assistantControllerProvider.notifier);

    await controller.send('  Resumir los hallazgos del informe  ');

    expect(taskUseCase.calls, hasLength(1));
    final call = taskUseCase.calls.single;
    expect(call.message, 'Resumir los hallazgos del informe');
    expect(call.uploadBatchId, isNull);
    expect(call.attachmentIds, isNull);
    expect(call.clientMessageId, isNull);
    final state = container.read(assistantControllerProvider);
    expect(state.isSending, isFalse);
    expect(state.errorMessage, 'La tarea no se pudo iniciar');
  });

  test(
    'attachment sends reuse the same idempotency key across ambiguous retries',
    () async {
      await driveReadyDraft();
      final attachmentController = container.read(
        attachmentControllerProvider.notifier,
      );
      final assistantController = container.read(
        assistantControllerProvider.notifier,
      );

      // First attempt: prepare builds a submission; task creation fails late,
      // leaving the send ambiguous, exactly like a vanished acknowledgement.
      await assistantController.send('  Resumir lo último con adjuntos  ');

      expect(taskUseCase.calls, hasLength(1));
      final first = taskUseCase.calls.single;
      expect(first.message, 'Resumir lo último con adjuntos');
      expect(first.uploadBatchId, attachmentRepository.batchId);
      expect(first.attachmentIds, ['att-1']);
      expect(first.clientMessageId, isNotEmpty);

      final prepared = await attachmentController.prepare(
        'Resumir lo último con adjuntos',
      );
      expect(prepared!.clientMessageId, first.clientMessageId);

      // The draft stays locked after the ambiguous failure; the retry message
      // re-enters the pending submission instead of starting a second turn.
      await assistantController.send('Resumir lo último con adjuntos');

      expect(taskUseCase.calls, hasLength(2));
      final second = taskUseCase.calls.last;
      expect(second.clientMessageId, first.clientMessageId);
      expect(second.uploadBatchId, first.uploadBatchId);
      expect(second.attachmentIds, first.attachmentIds);
      expect(
        container.read(attachmentControllerProvider).locked,
        isTrue,
        reason: 'an unconfirmed task keeps the draft locked until resolution',
      );
    },
  );

  test(
    'a different instruction after ambiguity is rejected before sending again',
    () async {
      await driveReadyDraft();
      final attachmentController = container.read(
        attachmentControllerProvider.notifier,
      );
      final assistantController = container.read(
        assistantControllerProvider.notifier,
      );

      await assistantController.send('instrucción original pendiente');
      await expectLater(
        attachmentController.prepare('instrucción cambiada'),
        throwsA(isA<FormatException>()),
      );

      expect(taskUseCase.calls, hasLength(1));
    },
  );
}

class _UnusedGetTask extends GetAssistantMessageTaskUseCase {
  _UnusedGetTask() : super(_NeverAssistantRepository());

  @override
  Future<Either<Failure, AssistantMessageTask>> call(String taskId) {
    throw StateError('polling must not start because task creation always fails');
  }
}

class _UnusedSendVoice extends SendAssistantVoiceMessageUseCase {
  _UnusedSendVoice() : super(_NeverAssistantRepository());

  @override
  Future<Either<Failure, AssistantMessageTask>> call({
    required String audioPath,
    String? conversationId,
  }) {
    throw StateError('voice flows are out of scope for this suite');
  }
}

class _UnusedSpeak extends SpeakAssistantMessageUseCase {
  _UnusedSpeak() : super(_NeverAssistantRepository());

  @override
  Future<Either<Failure, AssistantVoiceAudio>> call({
    required String text,
    required String conversationId,
    required String messageId,
  }) {
    throw StateError('voice output is out of scope for this suite');
  }
}
