import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class FindAssistantSessionMessagesUseCase {
  FindAssistantSessionMessagesUseCase(this._repository);

  final AssistantRepository _repository;

  Future<Either<Failure, AssistantSessionMessages>> call(String sessionId) {
    return _repository.findSessionMessages(sessionId);
  }
}
