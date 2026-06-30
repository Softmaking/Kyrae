import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class CreateAssistantMessageTaskUseCase {
  CreateAssistantMessageTaskUseCase(this._repository);

  final AssistantRepository _repository;

  Future<Either<Failure, AssistantMessageTask>> call({
    required String message,
    String? conversationId,
  }) {
    return _repository.createMessageTask(
      message: message,
      conversationId: conversationId,
    );
  }
}
