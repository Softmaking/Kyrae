import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class SendAssistantMessageUseCase {
  SendAssistantMessageUseCase(this._repository);

  final AssistantRepository _repository;

  Future<Either<Failure, SendAssistantMessageResult>> call({
    required String message,
    String? conversationId,
  }) {
    return _repository.sendMessage(
      message: message,
      conversationId: conversationId,
    );
  }
}
