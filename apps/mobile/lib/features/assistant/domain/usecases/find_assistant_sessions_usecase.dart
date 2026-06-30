import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class FindAssistantSessionsUseCase {
  FindAssistantSessionsUseCase(this._repository);

  final AssistantRepository _repository;

  Future<Either<Failure, AssistantSessionPage>> call({
    int limit = 10,
    String? cursor,
  }) {
    return _repository.findSessions(limit: limit, cursor: cursor);
  }
}
