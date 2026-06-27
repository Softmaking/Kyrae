import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/lifecycle/app_lifecycle_provider.dart';
import 'package:kyrae_mobile/core/notifications/local_notification_service.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/create_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/get_assistant_message_task_usecase.dart';

class AssistantState {
  const AssistantState({
    this.messages = const [],
    this.conversationId,
    this.activeTaskId,
    this.isSending = false,
    this.errorMessage,
  });

  final List<AssistantMessage> messages;
  final String? conversationId;
  final String? activeTaskId;
  final bool isSending;
  final String? errorMessage;

  AssistantState copyWith({
    List<AssistantMessage>? messages,
    String? conversationId,
    String? activeTaskId,
    bool clearActiveTaskId = false,
    bool clearConversationId = false,
    bool? isSending,
    String? errorMessage,
  }) {
    return AssistantState(
      messages: messages ?? this.messages,
      conversationId: clearConversationId
          ? null
          : conversationId ?? this.conversationId,
      activeTaskId: clearActiveTaskId
          ? null
          : activeTaskId ?? this.activeTaskId,
      isSending: isSending ?? this.isSending,
      errorMessage: errorMessage,
    );
  }
}

class AssistantController extends Notifier<AssistantState> {
  @override
  AssistantState build() {
    _createTaskUseCase = ref.watch(createAssistantMessageTaskUseCaseProvider);
    _getTaskUseCase = ref.watch(getAssistantMessageTaskUseCaseProvider);
    _notifications = ref.watch(localNotificationServiceProvider);
    return const AssistantState();
  }

  late CreateAssistantMessageTaskUseCase _createTaskUseCase;
  late GetAssistantMessageTaskUseCase _getTaskUseCase;
  late LocalNotificationService _notifications;

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
