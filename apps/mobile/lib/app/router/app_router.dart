import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:kyrae_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:kyrae_mobile/features/home/presentation/pages/home_page.dart';
import 'package:kyrae_mobile/features/profile/presentation/pages/profile_page.dart';

class AppRouter {
  static GoRouter build(Ref ref, ValueListenable<int> refreshListenable) {
    return GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
        GoRoute(path: '/home', builder: (context, state) => const HomePage()),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfilePage(),
        ),
      ],
      redirect: (context, state) {
        final authState = ref.read(authControllerProvider);
        final inLogin = state.fullPath == '/login';

        if (authState.status == AuthStatus.authenticated && inLogin) {
          return '/home';
        }

        if (authState.status != AuthStatus.authenticated && !inLogin) {
          return '/login';
        }

        return null;
      },
      refreshListenable: refreshListenable,
    );
  }
}
