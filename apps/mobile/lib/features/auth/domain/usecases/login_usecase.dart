import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/auth_session.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';

class LoginUseCase {
  LoginUseCase(this._repository);

  final AuthRepository _repository;

  Future<Either<Failure, AuthSession>> call(String email, String password) {
    return _repository.login(email: email, password: password);
  }
}
