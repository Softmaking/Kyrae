class ServerException implements Exception {
  const ServerException(this.message);

  final String message;
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;
}
