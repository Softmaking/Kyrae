import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/exceptions.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/assistant_remote_datasource.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';

class AssistantRepositoryImpl implements AssistantRepository {
  AssistantRepositoryImpl({required this.remote});

  final AssistantRemoteDataSource remote;

  @override
  Future<Either<Failure, SendAssistantMessageResult>> sendMessage({
    required String message,
    String? conversationId,
  }) async {
    try {
      final result = await remote.sendMessage(
        message: message,
        conversationId: conversationId,
      );
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible enviar el mensaje'));
    }
  }

  @override
  Future<Either<Failure, AssistantMessageTask>> createMessageTask({
    required String message,
    String? conversationId,
  }) async {
    try {
      final result = await remote.createMessageTask(
        message: message,
        conversationId: conversationId,
      );
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible iniciar la tarea'));
    }
  }

  @override
  Future<Either<Failure, AssistantMessageTask>> findMessageTask(
    String taskId,
  ) async {
    try {
      final result = await remote.findMessageTask(taskId);
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible consultar la tarea'));
    }
  }

  @override
  Future<Either<Failure, AssistantMessageTask>> sendVoiceMessage({
    required String audioPath,
    String? conversationId,
  }) async {
    try {
      final result = await remote.sendVoiceMessage(
        audioPath: audioPath,
        conversationId: conversationId,
      );
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible enviar el audio'));
    }
  }

  @override
  Future<Either<Failure, AssistantSessionPage>> findSessions({
    int limit = 10,
    String? cursor,
  }) async {
    try {
      final result = await remote.findSessions(limit: limit, cursor: cursor);
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(
        ServerFailure('No fue posible cargar las conversaciones'),
      );
    }
  }

  @override
  Future<Either<Failure, AssistantSessionMessages>> findSessionMessages(
    String sessionId,
  ) async {
    try {
      final result = await remote.findSessionMessages(sessionId);
      return Right(result);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible cargar el historial'));
    }
  }
}
