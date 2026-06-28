import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/router/app_router.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/network/api_client.dart';
import 'package:kyrae_mobile/core/network/auth_interceptor.dart';
import 'package:kyrae_mobile/core/notifications/local_notification_service.dart';
import 'package:kyrae_mobile/core/storage/secure_storage_service.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/assistant_remote_datasource.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/assistant_realtime_datasource.dart';
import 'package:kyrae_mobile/features/assistant/data/repositories/assistant_repository_impl.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/assistant_repository.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/create_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_session_messages_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/find_assistant_sessions_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/get_assistant_message_task_usecase.dart';
import 'package:kyrae_mobile/features/assistant/domain/usecases/send_assistant_message_usecase.dart';
import 'package:kyrae_mobile/features/assistant/presentation/providers/assistant_provider.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:kyrae_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:kyrae_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/get_profile_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/login_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/logout_usecase.dart';
import 'package:kyrae_mobile/features/auth/domain/usecases/restore_session_usecase.dart';
import 'package:kyrae_mobile/features/auth/presentation/providers/auth_provider.dart';

class SessionExpiredNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void trigger() => state = true;

  void reset() => state = false;
}

final sessionExpiredProvider = NotifierProvider<SessionExpiredNotifier, bool>(
  SessionExpiredNotifier.new,
);

final flutterLocalNotificationsPluginProvider =
    Provider<FlutterLocalNotificationsPlugin>((ref) {
      return FlutterLocalNotificationsPlugin();
    });

final localNotificationServiceProvider = Provider<LocalNotificationService>((
  ref,
) {
  final plugin = ref.watch(flutterLocalNotificationsPluginProvider);
  return LocalNotificationService(plugin);
});

final secureFlutterStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  final storage = ref.watch(secureFlutterStorageProvider);
  return SecureStorageService(storage);
});

final authLocalDatasourceProvider = Provider<AuthLocalDataSource>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  return AuthLocalDataSource(storage);
});

final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  final localDataSource = ref.watch(authLocalDatasourceProvider);
  final refreshDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));

  return AuthInterceptor(
    localDataSource: localDataSource,
    refreshDio: refreshDio,
    onSessionExpired: () {
      ref.read(sessionExpiredProvider.notifier).trigger();
    },
  );
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final authInterceptor = ref.watch(authInterceptorProvider);
  return ApiClient(authInterceptor: authInterceptor);
});

final authRemoteDatasourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthRemoteDataSource(apiClient);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remote = ref.watch(authRemoteDatasourceProvider);
  final local = ref.watch(authLocalDatasourceProvider);
  return AuthRepositoryImpl(remote: remote, local: local);
});

final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return LoginUseCase(repository);
});

final getProfileUseCaseProvider = Provider<GetProfileUseCase>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return GetProfileUseCase(repository);
});

final logoutUseCaseProvider = Provider<LogoutUseCase>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return LogoutUseCase(repository);
});

final restoreSessionUseCaseProvider = Provider<RestoreSessionUseCase>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return RestoreSessionUseCase(repository);
});

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

final assistantRemoteDataSourceProvider = Provider<AssistantRemoteDataSource>((
  ref,
) {
  final apiClient = ref.watch(apiClientProvider);
  return AssistantRemoteDataSource(apiClient);
});

final assistantRealtimeDataSourceProvider =
    Provider<AssistantRealtimeDataSource>((ref) {
      final localDataSource = ref.watch(authLocalDatasourceProvider);
      final realtime = AssistantRealtimeDataSource(localDataSource);
      ref.onDispose(realtime.dispose);
      return realtime;
    });

final assistantRepositoryProvider = Provider<AssistantRepository>((ref) {
  final remote = ref.watch(assistantRemoteDataSourceProvider);
  return AssistantRepositoryImpl(remote: remote);
});

final sendAssistantMessageUseCaseProvider =
    Provider<SendAssistantMessageUseCase>((ref) {
      final repository = ref.watch(assistantRepositoryProvider);
      return SendAssistantMessageUseCase(repository);
    });

final createAssistantMessageTaskUseCaseProvider =
    Provider<CreateAssistantMessageTaskUseCase>((ref) {
      final repository = ref.watch(assistantRepositoryProvider);
      return CreateAssistantMessageTaskUseCase(repository);
    });

final getAssistantMessageTaskUseCaseProvider =
    Provider<GetAssistantMessageTaskUseCase>((ref) {
      final repository = ref.watch(assistantRepositoryProvider);
      return GetAssistantMessageTaskUseCase(repository);
    });

final findAssistantSessionsUseCaseProvider =
    Provider<FindAssistantSessionsUseCase>((ref) {
      final repository = ref.watch(assistantRepositoryProvider);
      return FindAssistantSessionsUseCase(repository);
    });

final findAssistantSessionMessagesUseCaseProvider =
    Provider<FindAssistantSessionMessagesUseCase>((ref) {
      final repository = ref.watch(assistantRepositoryProvider);
      return FindAssistantSessionMessagesUseCase(repository);
    });

final assistantControllerProvider =
    NotifierProvider<AssistantController, AssistantState>(
      AssistantController.new,
    );

final routerRefreshNotifierProvider = Provider<ValueNotifier<int>>((ref) {
  final notifier = ValueNotifier<int>(0);

  ref.listen(authControllerProvider, (_, _) {
    notifier.value++;
  });

  ref.onDispose(notifier.dispose);
  return notifier;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = ref.watch(routerRefreshNotifierProvider);
  return AppRouter.build(ref, refreshNotifier);
});
