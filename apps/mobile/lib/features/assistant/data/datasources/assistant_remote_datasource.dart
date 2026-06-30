import 'package:dio/dio.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/errors/exceptions.dart';
import 'package:kyrae_mobile/core/network/api_client.dart';
import 'package:kyrae_mobile/features/assistant/data/models/assistant_message_model.dart';

class AssistantRemoteDataSource {
  AssistantRemoteDataSource(this._apiClient);

  final ApiClient _apiClient;

  Future<SendAssistantMessageResultModel> sendMessage({
    required String message,
    String? conversationId,
  }) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        ApiConstants.messages,
        data: <String, dynamic>{
          'message': message,
          'sessionId': conversationId,
          'conversationId': conversationId,
          'channel': 'mobile',
        },
      );

      return SendAssistantMessageResultModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  Future<AssistantMessageTaskModel> createMessageTask({
    required String message,
    String? conversationId,
  }) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '${ApiConstants.messages}/tasks',
        data: <String, dynamic>{
          'message': message,
          'sessionId': conversationId,
          'conversationId': conversationId,
          'channel': 'mobile',
        },
        options: Options(receiveTimeout: null, sendTimeout: null),
      );

      return AssistantMessageTaskModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  Future<AssistantMessageTaskModel> findMessageTask(String taskId) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '${ApiConstants.messages}/tasks/$taskId',
      );

      return AssistantMessageTaskModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  Future<AssistantSessionPageModel> findSessions({
    int limit = 10,
    String? cursor,
  }) async {
    try {
      final queryParameters = <String, dynamic>{'limit': limit};
      if (cursor != null) queryParameters['cursor'] = cursor;

      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/sessions',
        queryParameters: queryParameters,
      );

      return AssistantSessionPageModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  Future<AssistantSessionMessagesModel> findSessionMessages(
    String sessionId,
  ) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/sessions/$sessionId/messages',
      );

      return AssistantSessionMessagesModel.fromJson(response.data!);
    } on DioException catch (error) {
      throw ServerException(_extractMessage(error));
    }
  }

  String _extractMessage(DioException error) {
    final data = error.response?.data;

    if (data is Map<String, dynamic> && data['message'] is String) {
      return data['message'] as String;
    }

    return 'No fue posible enviar el mensaje';
  }
}
