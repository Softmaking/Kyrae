class ApiConstants {
  static const String _configuredBaseUrl = String.fromEnvironment(
    'KYRAE_API_BASE_URL',
  );
  static const String _localNetworkBaseUrl = 'https://lightbox-books-allied-manner.trycloudflare.com';

  static String get baseUrl =>
      (_configuredBaseUrl.trim().isEmpty
              ? _localNetworkBaseUrl
              : _configuredBaseUrl.trim())
          .replaceFirst(RegExp(r'\/$'), '');

  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh';
  static const String profile = '/auth/me';
  static const String messages = '/messages';
}
