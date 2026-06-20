import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/auth_session.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';

abstract class AuthRepository {
  Future<Either<Failure, AuthSession>> login({
    required String email,
    required String password,
  });

  Future<Either<Failure, AuthSession>> refreshSession(String refreshToken);

  Future<Either<Failure, User>> getProfile();

  Future<Either<Failure, bool>> restoreSession();

  Future<Either<Failure, Unit>> logout();
}
