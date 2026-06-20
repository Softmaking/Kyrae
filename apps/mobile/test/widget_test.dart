// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:dartz/dartz.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/core/errors/failures.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/auth_session.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';

import 'package:kyrae_mobile/app/app.dart';

void main() {
  testWidgets('renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_UnauthenticatedRepository()),
        ],
        child: const KyraeApp(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Iniciar Sesión'), findsWidgets);
    expect(find.text('Correo electrónico'), findsOneWidget);
  });
}

class _UnauthenticatedRepository implements AuthRepository {
  @override
  Future<Either<Failure, User>> getProfile() async {
    return const Left(AuthFailure('No hay sesion'));
  }

  @override
  Future<Either<Failure, AuthSession>> login({
    required String email,
    required String password,
  }) async {
    return const Left(AuthFailure('No hay sesion'));
  }

  @override
  Future<Either<Failure, Unit>> logout() async => const Right(unit);

  @override
  Future<Either<Failure, AuthSession>> refreshSession(String refreshToken) async {
    return const Left(AuthFailure('No hay sesion'));
  }

  @override
  Future<Either<Failure, bool>> restoreSession() async => const Right(false);
}
