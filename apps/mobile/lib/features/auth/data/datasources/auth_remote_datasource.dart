import 'package:dio/dio.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/errors/exceptions.dart';
import 'package:kyrae_mobile/core/network/api_client.dart';
import 'package:kyrae_mobile/features/auth/data/models/auth_session_model.dart';
import 'package:kyrae_mobile/features/auth/data/models/user_model.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthSessionModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        ApiConstants.login,
        data: <String, dynamic>{'email': email, 'password': password},
      );

      return AuthSessionModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw AuthException(_extractMessage(error));
    }
  }

  Future<AuthSessionModel> refreshSession(String refreshToken) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        ApiConstants.refreshToken,
        data: <String, dynamic>{'refreshToken': refreshToken},
      );

      return AuthSessionModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw AuthException(_extractMessage(error));
    }
  }

  Future<UserModel> getProfile() async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        ApiConstants.profile,
      );

      return UserModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  String _extractMessage(DioException error) {
    final data = error.response?.data;

    if (data is Map<String, dynamic> && data['message'] is String) {
      return _normalizeMessage(data['message'] as String);
    }

    return 'No fue posible completar la solicitud';
  }

  String _normalizeMessage(String message) {
    return switch (message.trim().toLowerCase()) {
      'invalid credentials' => 'Credenciales inválidas.',
      'invalid credential' => 'Credenciales inválidas.',
      'invalid refresh token' => 'Sesión inválida o expirada.',
      'unauthorized' => 'No tienes autorización para realizar esta acción.',
      _ => message,
    };
  }
}
