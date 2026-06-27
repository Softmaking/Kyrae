import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: user == null
            ? const Text('No hay sesion activa')
            : Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user.fullName,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(user.email),
                      const SizedBox(height: 4),
                      Text(
                        '${user.firstName} ${user.firstSurname}${user.secondSurname != null ? ' ${user.secondSurname}' : ''}',
                      ),
                      const SizedBox(height: 8),
                      Text('Roles: ${user.roles.join(', ')}'),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}
