import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

class AssistantMessageModel extends AssistantMessage {
  const AssistantMessageModel({
    required super.id,
    required super.conversationId,
    required super.role,
    required super.content,
    required super.createdAt,
  });

  factory AssistantMessageModel.fromJson(Map<String, dynamic> json) {
    return AssistantMessageModel(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      role: _roleFromString(json['role'] as String),
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static AssistantMessageRole _roleFromString(String role) {
    return switch (role) {
      'user' => AssistantMessageRole.user,
      'assistant' => AssistantMessageRole.assistant,
      'system' => AssistantMessageRole.system,
      _ => AssistantMessageRole.assistant,
    };
  }
}

class SendAssistantMessageResultModel extends SendAssistantMessageResult {
  const SendAssistantMessageResultModel({
    required super.conversationId,
    required super.userMessage,
    required super.assistantMessage,
  });

  factory SendAssistantMessageResultModel.fromJson(Map<String, dynamic> json) {
    return SendAssistantMessageResultModel(
      conversationId: json['conversationId'] as String,
      userMessage: AssistantMessageModel.fromJson(
        json['userMessage'] as Map<String, dynamic>,
      ),
      assistantMessage: AssistantMessageModel.fromJson(
        json['assistantMessage'] as Map<String, dynamic>,
      ),
    );
  }
}

class AssistantMessageTaskModel extends AssistantMessageTask {
  const AssistantMessageTaskModel({
    required super.id,
    required super.status,
    required super.conversationId,
    required super.userMessage,
    super.assistantMessage,
    super.errorMessage,
    required super.createdAt,
    required super.updatedAt,
    super.completedAt,
  });

  factory AssistantMessageTaskModel.fromJson(Map<String, dynamic> json) {
    return AssistantMessageTaskModel(
      id: json['id'] as String,
      status: _taskStatusFromString(json['status'] as String),
      conversationId: json['conversationId'] as String,
      userMessage: AssistantMessageModel.fromJson(
        json['userMessage'] as Map<String, dynamic>,
      ),
      assistantMessage: json['assistantMessage'] == null
          ? null
          : AssistantMessageModel.fromJson(
              json['assistantMessage'] as Map<String, dynamic>,
            ),
      errorMessage: json['errorMessage'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
    );
  }

  static AssistantTaskStatus _taskStatusFromString(String status) {
    return switch (status) {
      'pending' => AssistantTaskStatus.pending,
      'running' => AssistantTaskStatus.running,
      'completed' => AssistantTaskStatus.completed,
      'failed' => AssistantTaskStatus.failed,
      _ => AssistantTaskStatus.failed,
    };
  }
}
