import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/auth_session.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:kyrae_mobile/features/auth/presentation/providers/auth_provider.dart';

void main() {
  group('AuthController', () {
    test('bootstrap authenticates when a stored session and profile exist', () async {
      final container = _buildContainer(
        _FakeAuthRepository(hasSession: true, profileResult: const Right(_user)),
      );
      addTearDown(container.dispose);

      await _waitForAuthStatus(container, AuthStatus.authenticated);

      final state = container.read(authControllerProvider);
      expect(state.status, AuthStatus.authenticated);
      expect(state.user, _user);
    });

    test('bootstrap remains unauthenticated when there is no stored session', () async {
      final container = _buildContainer(_FakeAuthRepository(hasSession: false));
      addTearDown(container.dispose);

      await _waitForAuthStatus(container, AuthStatus.unauthenticated);

      final state = container.read(authControllerProvider);
      expect(state.status, AuthStatus.unauthenticated);
      expect(state.user, isNull);
    });

    test('login sets authenticated state with the returned session user', () async {
      final container = _buildContainer(
        _FakeAuthRepository(
          hasSession: false,
          loginResult: const Right(_session),
        ),
      );
      addTearDown(container.dispose);
      await _waitForAuthStatus(container, AuthStatus.unauthenticated);

      await container
          .read(authControllerProvider.notifier)
          .login('admin@softmaking.cl', 'ChangeMe123!');

      final state = container.read(authControllerProvider);
      expect(state.status, AuthStatus.authenticated);
      expect(state.user, _user);
      expect(state.errorMessage, isNull);
    });

    test('login failure sets unauthenticated state and error message', () async {
      final container = _buildContainer(
        _FakeAuthRepository(
          hasSession: false,
          loginResult: const Left(AuthFailure('Credenciales invalidas')),
        ),
      );
      addTearDown(container.dispose);
      await _waitForAuthStatus(container, AuthStatus.unauthenticated);

      await container
          .read(authControllerProvider.notifier)
          .login('admin@softmaking.cl', 'bad-password');

      final state = container.read(authControllerProvider);
      expect(state.status, AuthStatus.unauthenticated);
      expect(state.errorMessage, 'Credenciales invalidas');
    });

    test('session expiration signal forces unauthenticated state', () async {
      final container = _buildContainer(
        _FakeAuthRepository(hasSession: true, profileResult: const Right(_user)),
      );
      addTearDown(container.dispose);
      await _waitForAuthStatus(container, AuthStatus.authenticated);

      container.read(sessionExpiredProvider.notifier).trigger();
      await _waitForAuthStatus(container, AuthStatus.unauthenticated);

      final state = container.read(authControllerProvider);
      expect(state.status, AuthStatus.unauthenticated);
      expect(state.user, isNull);
      expect(container.read(sessionExpiredProvider), isFalse);
    });
  });
}

ProviderContainer _buildContainer(AuthRepository repository) {
  final container = ProviderContainer(
    overrides: [authRepositoryProvider.overrideWithValue(repository)],
  );

  container.read(authControllerProvider);
  return container;
}

Future<void> _waitForAuthStatus(
  ProviderContainer container,
  AuthStatus status,
) async {
  for (var i = 0; i < 20; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 10));
    if (container.read(authControllerProvider).status == status) {
      return;
    }
  }

  fail(
    'Expected auth status $status, got '
    '${container.read(authControllerProvider).status}',
  );
}

const _user = User(
  id: 'user-1',
  email: 'admin@softmaking.cl',
  firstName: 'Admin',
  firstSurname: 'istrator',
  fullName: 'Administrator',
  roles: ['admin'],
  permissions: ['USERS_READ'],
);

const _session = AuthSession(
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: _user,
);

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({
    required this.hasSession,
    this.loginResult = const Left(AuthFailure('Login failed')),
    this.profileResult = const Left(ServerFailure('Profile failed')),
  });

  final bool hasSession;
  final Either<Failure, AuthSession> loginResult;
  final Either<Failure, User> profileResult;

  @override
  Future<Either<Failure, User>> getProfile() async => profileResult;

  @override
  Future<Either<Failure, AuthSession>> login({
    required String email,
    required String password,
  }) async =>
      loginResult;

  @override
  Future<Either<Failure, Unit>> logout() async => const Right(unit);

  @override
  Future<Either<Failure, AuthSession>> refreshSession(String refreshToken) async {
    return const Right(_session);
  }

  @override
  Future<Either<Failure, bool>> restoreSession() async => Right(hasSession);
}
