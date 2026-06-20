import 'package:kyrae_mobile/core/storage/secure_storage_service.dart';

class AuthLocalDataSource {
  AuthLocalDataSource(this._storage);

  final SecureStorageService _storage;

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(_accessTokenKey, accessToken);
    await _storage.write(_refreshTokenKey, refreshToken);
  }

  Future<String?> getAccessToken() {
    return _storage.read(_accessTokenKey);
  }

  Future<String?> getRefreshToken() {
    return _storage.read(_refreshTokenKey);
  }

  Future<void> clearSession() {
    return _storage.clear();
  }
}
