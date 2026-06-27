import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

abstract class AssistantRepository {
  Future<Either<Failure, SendAssistantMessageResult>> sendMessage({
    required String message,
    String? conversationId,
  });

  Future<Either<Failure, AssistantMessageTask>> createMessageTask({
    required String message,
    String? conversationId,
  });

  Future<Either<Failure, AssistantMessageTask>> findMessageTask(String taskId);
}
