import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';

class GetProfileUseCase {
  GetProfileUseCase(this._repository);

  final AuthRepository _repository;

  Future<Either<Failure, User>> call() {
    return _repository.getProfile();
  }
}
