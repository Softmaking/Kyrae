import 'package:flutter/material.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';
import 'package:kyrae_mobile/core/utils/validators.dart';
import 'package:kyrae_mobile/core/widgets/app_button.dart';
import 'package:kyrae_mobile/core/widgets/app_text_field.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({
    required this.loading,
    required this.onSubmit,
    this.errorMessage,
    super.key,
  });

  final bool loading;
  final String? errorMessage;
  final void Function(String email, String password) onSubmit;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'admin@softmaking.cl');
  final _passwordController = TextEditingController(text: 'ChangeMe123!');

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Iniciar Sesión',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: AppColors.slate900,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ingresa tus credenciales para continuar.',
            style: TextStyle(fontSize: 14, color: AppColors.slate500),
          ),
          const SizedBox(height: 24),
          AppTextField(
            controller: _emailController,
            label: 'Correo electrónico',
            keyboardType: TextInputType.emailAddress,
            validator: (value) => Validators.email(value ?? ''),
          ),
          const SizedBox(height: 14),
          AppTextField(
            controller: _passwordController,
            label: 'Contraseña',
            obscureText: true,
            validator: (value) => Validators.password(value ?? ''),
          ),
          const SizedBox(height: 20),
          if (widget.errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                widget.errorMessage!,
                style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
              ),
            ),
            const SizedBox(height: 16),
          ],
          AppButton(
            label: 'Iniciar Sesión',
            loading: widget.loading,
            onPressed: () {
              if (_formKey.currentState?.validate() ?? false) {
                widget.onSubmit(
                  _emailController.text.trim(),
                  _passwordController.text,
                );
              }
            },
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {},
            style: TextButton.styleFrom(
              foregroundColor: AppColors.brandPrimary,
              textStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            child: const Text('¿Olvidó su contraseña?'),
          ),
        ],
      ),
    );
  }
}
