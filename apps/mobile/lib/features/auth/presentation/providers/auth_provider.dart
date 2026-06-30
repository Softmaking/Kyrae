import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/get_profile_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/login_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/logout_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/restore_session_usecase.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.user, this.errorMessage});

  final AuthStatus status;
  final User? user;
  final String? errorMessage;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    bool clearUser = false,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : user ?? this.user,
      errorMessage: errorMessage,
    );
  }

  static const AuthState initial = AuthState(status: AuthStatus.initial);
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    _loginUseCase = ref.watch(loginUseCaseProvider);
    _getProfileUseCase = ref.watch(getProfileUseCaseProvider);
    _logoutUseCase = ref.watch(logoutUseCaseProvider);
    _restoreSessionUseCase = ref.watch(restoreSessionUseCaseProvider);

    ref.listen(sessionExpiredProvider, (_, expired) {
      if (expired) {
        onSessionExpired();
        ref.read(sessionExpiredProvider.notifier).reset();
      }
    });

    Future<void>.microtask(bootstrap);
    return AuthState.initial;
  }

  void onSessionExpired() {
    state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
  }

  late final LoginUseCase _loginUseCase;
  late final GetProfileUseCase _getProfileUseCase;
  late final LogoutUseCase _logoutUseCase;
  late final RestoreSessionUseCase _restoreSessionUseCase;

  Future<void> bootstrap() async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final restored = await _restoreSessionUseCase();

    await restored.fold(
      (_) async {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          clearUser: true,
        );
      },
      (hasSession) async {
        if (!hasSession) {
          state = state.copyWith(
            status: AuthStatus.unauthenticated,
            clearUser: true,
          );
          return;
        }

        final profile = await _getProfileUseCase();
        profile.fold(
          (_) => state = state.copyWith(
            status: AuthStatus.unauthenticated,
            clearUser: true,
          ),
          (user) => state = state.copyWith(
            status: AuthStatus.authenticated,
            user: user,
          ),
        );
      },
    );
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final result = await _loginUseCase(email, password);

    result.fold(
      (failure) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          clearUser: true,
          errorMessage: failure.message,
        );
      },
      (session) {
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: session.user,
          errorMessage: null,
        );
      },
    );
  }

  Future<void> logout() async {
    final result = await _logoutUseCase();

    result.fold(
      (failure) => state = state.copyWith(
        errorMessage: failure.message,
        clearUser: true,
      ),
      (_) => state = state.copyWith(
        status: AuthStatus.unauthenticated,
        clearUser: true,
      ),
    );
  }
}
