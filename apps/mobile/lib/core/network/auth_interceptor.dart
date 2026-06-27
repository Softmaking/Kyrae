// ignore_for_file: prefer_initializing_formals

import 'package:dio/dio.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required AuthLocalDataSource localDataSource,
    required Dio refreshDio,
    required void Function() onSessionExpired,
  }) : _localDataSource = localDataSource,
       _refreshDio = refreshDio,
       _onSessionExpired = onSessionExpired;

  final AuthLocalDataSource _localDataSource;
  final Dio _refreshDio;
  final void Function() _onSessionExpired;

  bool _isRefreshing = false;

  final List<({RequestOptions options, ErrorInterceptorHandler handler})>
  _pendingRequests = [];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _localDataSource.getAccessToken();

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    if (_isRefreshing) {
      _pendingRequests.add((options: err.requestOptions, handler: handler));
      return;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await _localDataSource.getRefreshToken();

      if (refreshToken == null || refreshToken.isEmpty) {
        throw DioException(requestOptions: err.requestOptions);
      }

      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiConstants.refreshToken,
        data: <String, dynamic>{'refreshToken': refreshToken},
      );

      final data = response.data!;
      final newAccessToken = data['accessToken'] as String;
      final newRefreshToken = data['refreshToken'] as String;

      await _localDataSource.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );

      err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _refreshDio.fetch(err.requestOptions);
      handler.resolve(retryResponse);

      for (final pending in _pendingRequests) {
        pending.options.headers['Authorization'] = 'Bearer $newAccessToken';
        try {
          final response = await _refreshDio.fetch(pending.options);
          pending.handler.resolve(response);
        } catch (e) {
          pending.handler.next(e as DioException);
        }
      }
    } catch (_) {
      await _localDataSource.clearSession();
      _onSessionExpired();
      handler.next(err);

      for (final pending in _pendingRequests) {
        pending.handler.next(err);
      }
    } finally {
      _isRefreshing = false;
      _pendingRequests.clear();
    }
  }
}
