import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class SpeakAssistantMessageUseCase {
  SpeakAssistantMessageUseCase(this._repository);

  final AssistantRepository _repository;

  Future<Either<Failure, AssistantVoiceAudio>> call({
    required String text,
    required String conversationId,
    required String messageId,
  }) {
    return _repository.speakAssistantMessage(
      text: text,
      conversationId: conversationId,
      messageId: messageId,
    );
  }
}
