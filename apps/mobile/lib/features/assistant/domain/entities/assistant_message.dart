import 'dart:typed_data';

import 'package:equatable/equatable.dart';

enum AssistantMessageRole { user, assistant, system }

enum AssistantSessionStatus { active, completed, failed, archived }

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

class AssistantSession extends Equatable {
  const AssistantSession({
    required this.id,
    required this.title,
    required this.channel,
    required this.status,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
    this.lastMessageAt,
  });

  final String id;
  final String? title;
  final String channel;
  final AssistantSessionStatus status;
  final int messageCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastMessageAt;

  @override
  List<Object?> get props => [
    id,
    title,
    channel,
    status,
    messageCount,
    createdAt,
    updatedAt,
    lastMessageAt,
  ];
}

class AssistantSessionPage extends Equatable {
  const AssistantSessionPage({required this.sessions, this.nextCursor});

  final List<AssistantSession> sessions;
  final String? nextCursor;

  @override
  List<Object?> get props => [sessions, nextCursor];
}

class AssistantSessionMessages extends Equatable {
  const AssistantSessionMessages({
    required this.session,
    required this.messages,
  });

  final AssistantSession session;
  final List<AssistantMessage> messages;

  @override
  List<Object?> get props => [session, messages];
}

class AssistantVoiceAudio extends Equatable {
  const AssistantVoiceAudio({required this.bytes, required this.mimeType});

  final Uint8List bytes;
  final String mimeType;

  @override
  List<Object?> get props => [bytes, mimeType];
}
