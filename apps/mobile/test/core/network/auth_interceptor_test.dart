import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/network/auth_interceptor.dart';
import 'package:kyrae_mobile/core/storage/secure_storage_service.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';

void main() {
  group('AuthInterceptor', () {
    test('adds bearer token when an access token exists', () async {
      final local = _FakeAuthLocalDataSource(accessToken: 'access-token');
      final adapter = _QueueHttpClientAdapter([
        _TestResponse(statusCode: 200, data: {'ok': true}),
      ]);
      final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
        ..httpClientAdapter = adapter
        ..interceptors.add(
          AuthInterceptor(
            localDataSource: local,
            refreshDio: Dio(BaseOptions(baseUrl: 'https://api.test')),
            onSessionExpired: () {},
          ),
        );

      await dio.get<Map<String, dynamic>>('/secure');

      expect(
        adapter.requests.single.headers['Authorization'],
        'Bearer access-token',
      );
    });

    test('refreshes token and retries the failed request after a 401', () async {
      final local = _FakeAuthLocalDataSource(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
      );
      final mainAdapter = _QueueHttpClientAdapter([
        _TestResponse(statusCode: 401, data: {'message': 'expired'}),
      ]);
      final refreshAdapter = _QueueHttpClientAdapter([
        _TestResponse(
          statusCode: 200,
          data: {
            'accessToken': 'new-access-token',
            'refreshToken': 'new-refresh-token',
          },
        ),
        _TestResponse(statusCode: 200, data: {'ok': true}),
      ]);
      final refreshDio = Dio(BaseOptions(baseUrl: 'https://api.test'))
        ..httpClientAdapter = refreshAdapter;
      final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
        ..httpClientAdapter = mainAdapter
        ..interceptors.add(
          AuthInterceptor(
            localDataSource: local,
            refreshDio: refreshDio,
            onSessionExpired: () {},
          ),
        );

      final response = await dio.get<Map<String, dynamic>>('/secure');

      expect(response.data, {'ok': true});
      expect(local.savedAccessToken, 'new-access-token');
      expect(local.savedRefreshToken, 'new-refresh-token');
      expect(refreshAdapter.requests.first.path, ApiConstants.refreshToken);
      expect(refreshAdapter.requests.last.path, '/secure');
      expect(
        refreshAdapter.requests.last.headers['Authorization'],
        'Bearer new-access-token',
      );
    });

    test('clears session and notifies expiration when refresh fails', () async {
      var sessionExpired = false;
      final local = _FakeAuthLocalDataSource(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
      );
      final mainAdapter = _QueueHttpClientAdapter([
        _TestResponse(statusCode: 401, data: {'message': 'expired'}),
      ]);
      final refreshAdapter = _QueueHttpClientAdapter([
        _TestResponse(statusCode: 401, data: {'message': 'refresh expired'}),
      ]);
      final refreshDio = Dio(BaseOptions(baseUrl: 'https://api.test'))
        ..httpClientAdapter = refreshAdapter;
      final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
        ..httpClientAdapter = mainAdapter
        ..interceptors.add(
          AuthInterceptor(
            localDataSource: local,
            refreshDio: refreshDio,
            onSessionExpired: () => sessionExpired = true,
          ),
        );

      await expectLater(
        dio.get<Map<String, dynamic>>('/secure'),
        throwsA(isA<DioException>()),
      );

      expect(local.clearSessionCalled, isTrue);
      expect(sessionExpired, isTrue);
    });
  });
}

class _FakeAuthLocalDataSource extends AuthLocalDataSource {
  _FakeAuthLocalDataSource({this.accessToken, this.refreshToken})
      : super(SecureStorageService(const FlutterSecureStorage()));

  String? accessToken;
  String? refreshToken;
  String? savedAccessToken;
  String? savedRefreshToken;
  bool clearSessionCalled = false;

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    savedAccessToken = accessToken;
    savedRefreshToken = refreshToken;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  @override
  Future<void> clearSession() async {
    clearSessionCalled = true;
    accessToken = null;
    refreshToken = null;
  }
}

class _QueueHttpClientAdapter implements HttpClientAdapter {
  _QueueHttpClientAdapter(this._responses);

  final List<_TestResponse> _responses;
  final List<RequestOptions> requests = [];

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);

    if (_responses.isEmpty) {
      throw StateError('No test response queued for ${options.path}');
    }

    final response = _responses.removeAt(0);
    final bytes = utf8.encode(jsonEncode(response.data));

    return ResponseBody.fromBytes(
      bytes,
      response.statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _TestResponse {
  const _TestResponse({required this.statusCode, required this.data});

  final int statusCode;
  final Map<String, dynamic> data;
}
