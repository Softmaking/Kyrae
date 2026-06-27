import 'package:flutter/foundation.dart';

class ApiConstants {
  static String get baseUrl {
    if (kIsWeb) {
      return 'https://lightbox-books-allied-manner.trycloudflare.com';
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }

    return 'https://lightbox-books-allied-manner.trycloudflare.com';
  }

  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh';
  static const String profile = '/auth/me';
  static const String messages = '/messages';
}
