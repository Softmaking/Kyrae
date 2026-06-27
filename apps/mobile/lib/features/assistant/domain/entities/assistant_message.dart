import 'package:equatable/equatable.dart';

enum AssistantMessageRole { user, assistant, system }

class AssistantMessage extends Equatable {
  const AssistantMessage({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String conversationId;
  final AssistantMessageRole role;
  final String content;
  final DateTime createdAt;

  @override
  List<Object?> get props => [id, conversationId, role, content, createdAt];
}

class SendAssistantMessageResult extends Equatable {
  const SendAssistantMessageResult({
    required this.conversationId,
    required this.userMessage,
    required this.assistantMessage,
  });

  final String conversationId;
  final AssistantMessage userMessage;
  final AssistantMessage assistantMessage;

  @override
  List<Object?> get props => [conversationId, userMessage, assistantMessage];
}

enum AssistantTaskStatus { pending, running, completed, failed }

class AssistantMessageTask extends Equatable {
  const AssistantMessageTask({
    required this.id,
    required this.status,
    required this.conversationId,
    required this.userMessage,
    this.assistantMessage,
    this.errorMessage,
    required this.createdAt,
    required this.updatedAt,
    this.completedAt,
  });

  final String id;
  final AssistantTaskStatus status;
  final String conversationId;
  final AssistantMessage userMessage;
  final AssistantMessage? assistantMessage;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;

  @override
  List<Object?> get props => [
    id,
    status,
    conversationId,
    userMessage,
    assistantMessage,
    errorMessage,
    createdAt,
    updatedAt,
    completedAt,
  ];
}
