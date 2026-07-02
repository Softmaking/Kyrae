import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/lifecycle/app_lifecycle_provider.dart';
import 'package:kyrae_mobile/core/notifications/local_notification_service.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/assistant_realtime_datasource.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/create_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_session_messages_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_sessions_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/get_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/send_assistant_voice_message_usecase.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AssistantState {
  const AssistantState({
    this.sessions = const [],
    this.messages = const [],
    this.conversationId,
    this.activeTaskId,
    this.isSending = false,
    this.isLoadingSessions = false,
    this.isLoadingMoreSessions = false,
    this.isLoadingHistory = false,
    this.isRecording = false,
    this.isTranscribing = false,
    this.sessionsNextCursor,
    this.errorMessage,
  });

  final List<AssistantSession> sessions;
  final List<AssistantMessage> messages;
  final String? conversationId;
  final String? activeTaskId;
  final bool isSending;
  final bool isLoadingSessions;
  final bool isLoadingMoreSessions;
  final bool isLoadingHistory;
  final bool isRecording;
  final bool isTranscribing;
  final String? sessionsNextCursor;
  final String? errorMessage;

  AssistantState copyWith({
    List<AssistantSession>? sessions,
    List<AssistantMessage>? messages,
    String? conversationId,
    String? activeTaskId,
    bool clearActiveTaskId = false,
    bool clearConversationId = false,
    bool clearSessionsNextCursor = false,
    bool? isSending,
    bool? isLoadingSessions,
    bool? isLoadingMoreSessions,
    bool? isLoadingHistory,
    bool? isRecording,
    bool? isTranscribing,
    String? sessionsNextCursor,
    String? errorMessage,
  }) {
    return AssistantState(
      sessions: sessions ?? this.sessions,
      messages: messages ?? this.messages,
      conversationId: clearConversationId
          ? null
          : conversationId ?? this.conversationId,
      activeTaskId: clearActiveTaskId
          ? null
          : activeTaskId ?? this.activeTaskId,
      isSending: isSending ?? this.isSending,
      isLoadingSessions: isLoadingSessions ?? this.isLoadingSessions,
      isLoadingMoreSessions:
          isLoadingMoreSessions ?? this.isLoadingMoreSessions,
      isLoadingHistory: isLoadingHistory ?? this.isLoadingHistory,
      isRecording: isRecording ?? this.isRecording,
      isTranscribing: isTranscribing ?? this.isTranscribing,
      sessionsNextCursor: clearSessionsNextCursor
          ? null
          : sessionsNextCursor ?? this.sessionsNextCursor,
      errorMessage: errorMessage,
    );
  }
}

class AssistantController extends Notifier<AssistantState> {
  @override
  AssistantState build() {
    _createTaskUseCase = ref.watch(createAssistantMessageTaskUseCaseProvider);
    _sendVoiceUseCase = ref.watch(sendAssistantVoiceMessageUseCaseProvider);
    _getTaskUseCase = ref.watch(getAssistantMessageTaskUseCaseProvider);
    _findSessionsUseCase = ref.watch(findAssistantSessionsUseCaseProvider);
    _findSessionMessagesUseCase = ref.watch(
      findAssistantSessionMessagesUseCaseProvider,
    );
    _notifications = ref.watch(localNotificationServiceProvider);
    _realtimeDataSource = ref.watch(assistantRealtimeDataSourceProvider);
    _realtimeDataSource.setHandler(_handleRealtimeEvent);
    unawaited(_realtimeDataSource.connect());
    ref.onDispose(_audioRecorder.dispose);
    return const AssistantState();
  }

  static const _sessionPageSize = 10;

  final AudioRecorder _audioRecorder = AudioRecorder();

  late CreateAssistantMessageTaskUseCase _createTaskUseCase;
  late SendAssistantVoiceMessageUseCase _sendVoiceUseCase;
  late GetAssistantMessageTaskUseCase _getTaskUseCase;
  late FindAssistantSessionsUseCase _findSessionsUseCase;
  late FindAssistantSessionMessagesUseCase _findSessionMessagesUseCase;
  late LocalNotificationService _notifications;
  late AssistantRealtimeDataSource _realtimeDataSource;

  Future<void> loadSessions() async {
    if (state.isLoadingSessions) return;

    state = state.copyWith(isLoadingSessions: true, errorMessage: null);
    final result = await _findSessionsUseCase(limit: _sessionPageSize);

    result.fold(
      (failure) {
        state = state.copyWith(
          isLoadingSessions: false,
          errorMessage: failure.message,
        );
      },
      (page) {
        state = state.copyWith(
          isLoadingSessions: false,
          sessions: page.sessions,
          sessionsNextCursor: page.nextCursor,
          clearSessionsNextCursor: page.nextCursor == null,
          errorMessage: null,
        );
      },
    );
  }

  Future<void> loadMoreSessions() async {
    final cursor = state.sessionsNextCursor;
    if (cursor == null || state.isLoadingMoreSessions) return;

    state = state.copyWith(isLoadingMoreSessions: true, errorMessage: null);
    final result = await _findSessionsUseCase(
      limit: _sessionPageSize,
      cursor: cursor,
    );

    result.fold(
      (failure) {
        state = state.copyWith(
          isLoadingMoreSessions: false,
          errorMessage: failure.message,
        );
      },
      (page) {
        state = state.copyWith(
          isLoadingMoreSessions: false,
          sessions: [...state.sessions, ...page.sessions],
          sessionsNextCursor: page.nextCursor,
          clearSessionsNextCursor: page.nextCursor == null,
          errorMessage: null,
        );
      },
    );
  }

  Future<void> openSession(AssistantSession session) async {
    if (state.isLoadingHistory || state.conversationId == session.id) return;

    state = state.copyWith(isLoadingHistory: true, errorMessage: null);
    final result = await _findSessionMessagesUseCase(session.id);

    result.fold(
      (failure) {
        state = state.copyWith(
          isLoadingHistory: false,
          errorMessage: failure.message,
        );
      },
      (history) {
        state = state.copyWith(
          isLoadingHistory: false,
          conversationId: history.session.id,
          messages: history.messages,
          errorMessage: null,
        );
        unawaited(_realtimeDataSource.joinSession(history.session.id));
      },
    );
  }

  void newSession() {
    state = state.copyWith(
      messages: const [],
      clearConversationId: true,
      clearActiveTaskId: true,
      isSending: false,
      isLoadingHistory: false,
      isRecording: false,
      isTranscribing: false,
      errorMessage: null,
    );
  }

  Future<void> send(String message) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty || state.isSending || state.isRecording || state.isTranscribing) return;

    state = state.copyWith(isSending: true, errorMessage: null);
    final result = await _createTaskUseCase(
      message: trimmed,
      conversationId: state.conversationId,
    );

    await result.fold(
      (failure) {
        state = state.copyWith(isSending: false, errorMessage: failure.message);
      },
      (task) async {
        state = state.copyWith(
          conversationId: task.conversationId,
          activeTaskId: task.id,
          messages: [...state.messages, task.userMessage],
          errorMessage: null,
        );
        await _realtimeDataSource.joinSession(task.conversationId);
        unawaited(loadSessions());
        if (!_realtimeDataSource.isConnected) {
          await _pollTask(task.id);
        }
      },
    );
  }

  Future<void> startVoiceRecording() async {
    if (state.isSending || state.isRecording || state.isTranscribing) return;

    final hasPermission = await _audioRecorder.hasPermission();
    if (!hasPermission) {
      state = state.copyWith(errorMessage: 'No hay permiso para usar el micrófono.');
      return;
    }

    try {
      final directory = await getTemporaryDirectory();
      final path = '${directory.path}/kyrae-voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _audioRecorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
      state = state.copyWith(isRecording: true, errorMessage: null);
    } catch (_) {
      state = state.copyWith(
        isRecording: false,
        errorMessage: 'No se pudo iniciar la grabación de voz.',
      );
    }
  }

  Future<void> stopVoiceRecordingAndSend() async {
    if (!state.isRecording) return;

    final path = await _audioRecorder.stop();
    state = state.copyWith(isRecording: false);

    if (path == null) {
      state = state.copyWith(errorMessage: 'No se capturó audio para enviar.');
      return;
    }

    state = state.copyWith(isTranscribing: true, errorMessage: null);
    final result = await _sendVoiceUseCase(
      audioPath: path,
      conversationId: state.conversationId,
    );
    unawaited(File(path).delete().catchError((_) => File(path)));

    await result.fold(
      (failure) {
        state = state.copyWith(
          isSending: false,
          isTranscribing: false,
          errorMessage: failure.message,
        );
      },
      (task) async {
        state = state.copyWith(
          conversationId: task.conversationId,
          activeTaskId: task.id,
          messages: [...state.messages, task.userMessage],
          isSending: true,
          isTranscribing: false,
          errorMessage: null,
        );
        await _realtimeDataSource.joinSession(task.conversationId);
        unawaited(loadSessions());
        if (!_realtimeDataSource.isConnected) {
          await _pollTask(task.id);
        }
      },
    );
  }

  Future<void> _pollTask(String taskId) async {
    while (state.activeTaskId == taskId) {
      await Future<void>.delayed(const Duration(seconds: 5));
      final result = await _getTaskUseCase(taskId);

      final shouldContinue = result.fold(
        (failure) {
          state = state.copyWith(
            isSending: false,
            clearActiveTaskId: true,
            errorMessage: failure.message,
          );
          return false;
        },
        (task) {
          if (task.status == AssistantTaskStatus.completed &&
              task.assistantMessage != null) {
            state = state.copyWith(
              isSending: false,
              clearActiveTaskId: true,
              conversationId: task.conversationId,
              errorMessage: null,
            );
            _addMessage(task.assistantMessage!);
            unawaited(loadSessions());
            _notifyIfAppIsInactive();
            return false;
          }

          if (task.status == AssistantTaskStatus.failed) {
            state = state.copyWith(
              isSending: false,
              clearActiveTaskId: true,
              errorMessage: task.errorMessage ?? 'La tarea del asistente falló',
            );
            return false;
          }

          return true;
        },
      );

      if (!shouldContinue) return;
    }
  }

  void _notifyIfAppIsInactive() {
    final lifecycleState = ref.read(appLifecycleProvider);
    if (lifecycleState == AppLifecycleState.resumed) return;

    unawaited(_notifications.showAssistantResponseReady());
  }

  void _handleRealtimeEvent(Map<String, dynamic> event) {
    final sessionId = event['sessionId'];
    if (sessionId is! String || sessionId != state.conversationId) return;

    final status = event['status'];
    final role = event['role'];
    final content = event['content'];

    if (status == 'received' && role == 'user') {
      return;
    }

    if (status == 'processing') {
      state = state.copyWith(isSending: true, errorMessage: null);
      return;
    }

    if (status == 'completed' && role == 'assistant' && content is String) {
      _addMessage(_messageFromRealtime(event, AssistantMessageRole.assistant));
      state = state.copyWith(
        isSending: false,
        clearActiveTaskId: true,
        errorMessage: null,
      );
      unawaited(loadSessions());
      _notifyIfAppIsInactive();
      return;
    }

    if (status == 'failed') {
      state = state.copyWith(
        isSending: false,
        clearActiveTaskId: true,
        errorMessage:
            event['errorMessage'] as String? ??
            'Kyrae no pudo procesar la solicitud.',
      );
      unawaited(loadSessions());
    }
  }

  void _addMessage(AssistantMessage message) {
    if (state.messages.any((item) => _isSameMessage(item, message))) return;
    state = state.copyWith(messages: [...state.messages, message]);
  }

  bool _isSameMessage(AssistantMessage current, AssistantMessage next) {
    if (current.id == next.id) return true;

    final createdAtDifference = current.createdAt
        .difference(next.createdAt)
        .abs();

    return current.conversationId == next.conversationId &&
        current.role == next.role &&
        current.content.trim() == next.content.trim() &&
        createdAtDifference <= const Duration(seconds: 5);
  }

  AssistantMessage _messageFromRealtime(
    Map<String, dynamic> event,
    AssistantMessageRole fallbackRole,
  ) {
    final createdAt = event['createdAt'] is String
        ? DateTime.tryParse(event['createdAt'] as String) ?? DateTime.now()
        : DateTime.now();

    return AssistantMessage(
      id:
          event['messageId'] as String? ??
          '${event['sessionId']}-${createdAt.toIso8601String()}',
      conversationId: event['sessionId'] as String,
      role: fallbackRole,
      content: event['content'] as String? ?? '',
      createdAt: createdAt,
    );
  }
}
