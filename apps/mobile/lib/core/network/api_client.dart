import 'package:dio/dio.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/constants/app_constants.dart';
import 'package:kyrae_mobile/core/network/auth_interceptor.dart';

class ApiClient {
  ApiClient({required AuthInterceptor authInterceptor}) {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: AppConstants.requestTimeout,
        receiveTimeout: AppConstants.requestTimeout,
        sendTimeout: AppConstants.requestTimeout,
      ),
    )..interceptors.add(authInterceptor);
  }

  late final Dio dio;
}
