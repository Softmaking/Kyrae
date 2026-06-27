import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/lifecycle/app_lifecycle_provider.dart';
import 'package:kyrae_mobile/core/notifications/local_notification_service.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/create_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_session_messages_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_sessions_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/get_assistant_message_task_usecase.dart';

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
    _getTaskUseCase = ref.watch(getAssistantMessageTaskUseCaseProvider);
    _findSessionsUseCase = ref.watch(findAssistantSessionsUseCaseProvider);
    _findSessionMessagesUseCase = ref.watch(
      findAssistantSessionMessagesUseCaseProvider,
    );
    _notifications = ref.watch(localNotificationServiceProvider);
    return const AssistantState();
  }

  static const _sessionPageSize = 10;

  late CreateAssistantMessageTaskUseCase _createTaskUseCase;
  late GetAssistantMessageTaskUseCase _getTaskUseCase;
  late FindAssistantSessionsUseCase _findSessionsUseCase;
  late FindAssistantSessionMessagesUseCase _findSessionMessagesUseCase;
  late LocalNotificationService _notifications;

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
      errorMessage: null,
    );
  }

  Future<void> send(String message) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty || state.isSending) return;

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
        unawaited(loadSessions());
        await _pollTask(task.id);
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
              messages: [...state.messages, task.assistantMessage!],
              errorMessage: null,
            );
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
}
