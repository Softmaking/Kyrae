import 'package:dartz/dartz.dart';
import 'package:kyrae_mobile/core/errors/exceptions.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/auth_session.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({required this.remote, required this.local});

  final AuthRemoteDataSource remote;
  final AuthLocalDataSource local;

  @override
  Future<Either<Failure, AuthSession>> login({
    required String email,
    required String password,
  }) async {
    try {
      final session = await remote.login(email: email, password: password);
      await local.saveTokens(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      return Right(session);
    } on AuthException catch (error) {
      return Left(AuthFailure(error.message));
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible iniciar sesion'));
    }
  }

  @override
  Future<Either<Failure, AuthSession>> refreshSession(
    String refreshToken,
  ) async {
    try {
      final session = await remote.refreshSession(refreshToken);
      await local.saveTokens(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      return Right(session);
    } on AuthException catch (error) {
      return Left(AuthFailure(error.message));
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible renovar la sesion'));
    }
  }

  @override
  Future<Either<Failure, User>> getProfile() async {
    try {
      final user = await remote.getProfile();
      return Right(user);
    } on ServerException catch (error) {
      return Left(ServerFailure(error.message));
    } catch (_) {
      return const Left(ServerFailure('No fue posible obtener el perfil'));
    }
  }

  @override
  Future<Either<Failure, bool>> restoreSession() async {
    try {
      final token = await local.getAccessToken();
      return Right(token != null && token.isNotEmpty);
    } catch (_) {
      return const Left(AuthFailure('No fue posible restaurar la sesion'));
    }
  }

  @override
  Future<Either<Failure, Unit>> logout() async {
    try {
      await local.clearSession();
      return Right(unit);
    } catch (_) {
      return const Left(AuthFailure('No fue posible cerrar sesion'));
    }
  }
}
