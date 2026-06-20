import 'package:equatable/equatable.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';

class AuthSession extends Equatable {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final User user;

  @override
  List<Object?> get props => [accessToken, refreshToken, user];
}
