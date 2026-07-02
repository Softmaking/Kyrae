import 'package:flutter/foundation.dart';

class ApiConstants {
  static const String _localNetworkBaseUrl = 'http://192.168.100.43:3000';

  static String get baseUrl {
    if (kIsWeb) {
      return 'https://lightbox-books-allied-manner.trycloudflare.com';
    }

    return _localNetworkBaseUrl;
  }

  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh';
  static const String profile = '/auth/me';
  static const String messages = '/messages';
}
