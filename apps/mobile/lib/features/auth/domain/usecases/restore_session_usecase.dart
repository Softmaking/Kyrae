import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';

class RestoreSessionUseCase {
  RestoreSessionUseCase(this._repository);

  final AuthRepository _repository;

  Future<Either<Failure, bool>> call() {
    return _repository.restoreSession();
  }
}
