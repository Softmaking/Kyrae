import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/errors/exceptions.dart';
import 'package:kyrae_mobile/core/network/api_client.dart';
import 'package:kyrae_mobile/features/assistant/data/models/assistant_message_model.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

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

  Future<AssistantMessageTaskModel> sendVoiceMessage({
    required String audioPath,
    String? conversationId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'audio': await MultipartFile.fromFile(
          audioPath,
          filename: 'kyrae-voice.m4a',
          contentType: DioMediaType.parse('audio/mp4'),
        ),
        'channel': 'mobile',
      });

      if (conversationId != null && conversationId.isNotEmpty) {
        formData.fields.add(MapEntry('sessionId', conversationId));
        formData.fields.add(MapEntry('conversationId', conversationId));
      }

      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/voice/messages',
        data: formData,
        options: Options(receiveTimeout: null, sendTimeout: null),
      );

      final task = response.data!['task'] as Map<String, dynamic>;
      return AssistantMessageTaskModel.fromJson(task);
    } on DioException catch (error) {
      throw ServerException(
        _extractMessage(error, fallback: 'No fue posible enviar el audio'),
      );
    }
  }

  Future<AssistantVoiceAudio> speakAssistantMessage({
    required String text,
    required String conversationId,
    required String messageId,
  }) async {
    try {
      final response = await _apiClient.dio.post<List<int>>(
        '/voice/speak',
        data: <String, dynamic>{
          'text': text,
          'sessionId': conversationId,
          'messageId': messageId,
          'channel': 'mobile',
        },
        options: Options(
          receiveTimeout: null,
          sendTimeout: null,
          responseType: ResponseType.bytes,
        ),
      );

      return AssistantVoiceAudio(
        bytes: Uint8List.fromList(response.data ?? const []),
        mimeType: response.headers.value('content-type') ?? 'audio/mpeg',
      );
    } on DioException catch (error) {
      throw ServerException(
        _extractMessage(error, fallback: 'No fue posible generar la respuesta hablada'),
      );
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

  String _extractMessage(
    DioException error, {
    String fallback = 'No fue posible enviar el mensaje',
  }) {
    if (error.response?.statusCode == 403) {
      return 'No tienes permisos para realizar esta acción.';
    }

    final data = error.response?.data;

    if (data is Map<String, dynamic>) {
      final message = _messageFromValue(data['message']);
      if (message != null) return message;

      final detail = _messageFromValue(data['detail']);
      if (detail != null) return detail;

      final errorMessage = _messageFromValue(data['error']);
      if (errorMessage != null) return errorMessage;
    }

    if (data is String && data.trim().isNotEmpty) {
      return data.trim();
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'No fue posible conectar con el servicio.';
    }

    return fallback;
  }

  String? _messageFromValue(Object? value) {
    if (value is String && value.trim().isNotEmpty) {
      return value.trim();
    }

    if (value is List) {
      final messages = value
          .whereType<Object>()
          .map((item) => item.toString().trim())
          .where((item) => item.isNotEmpty)
          .toList();

      if (messages.isNotEmpty) return messages.join('\n');
    }

    return null;
  }
}
