import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:kyrae_mobile/features/auth/presentation/widgets/login_form.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.slate50, Colors.white, AppColors.blue50],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _BrandHeader(),
                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.brandPrimary.withValues(alpha: 0.08),
                          blurRadius: 32,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 28,
                      ),
                      child: LoginForm(
                        loading: authState.status == AuthStatus.loading,
                        errorMessage: authState.errorMessage,
                        onSubmit: (email, password) {
                          ref
                              .read(authControllerProvider.notifier)
                              .login(email, password);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/img/app-img/logo-sm.png',
          height: 48,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 8),
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF63B3ED), Color(0xFF3182CE), Color(0xFF2A4365)],
          ).createShader(bounds),
          blendMode: BlendMode.srcIn,
          child: const Text(
            'Kyrae',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }
}
