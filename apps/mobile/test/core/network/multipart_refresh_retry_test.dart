import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/core/network/auth_interceptor.dart';
import 'package:kyrae_mobile/core/storage/secure_storage_service.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/attachment_remote_datasource.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';

import '../../helpers/assistant_attachment_fixtures.dart';

class _FakeAuthLocalDataSource extends AuthLocalDataSource {
  _FakeAuthLocalDataSource({this.accessToken, this.refreshToken})
    : super(SecureStorageService(const FlutterSecureStorage()));

  String? accessToken;
  String? refreshToken;
  String? savedAccessToken;
  String? savedRefreshToken;

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
    accessToken = null;
    refreshToken = null;
  }
}

void main() {
  late Directory workingDirectory;
  late File original;

  setUp(() async {
    workingDirectory = await Directory.systemTemp.createTemp(
      'attachment-retry-test',
    );
    original = File('${workingDirectory.path}/informe-retry.pdf')
      ..writeAsBytesSync(utf8.encode('original-reenviable-con-marker-exacto'), flush: true);
  });

  tearDown(() async {
    if (await workingDirectory.exists()) {
      await workingDirectory.delete(recursive: true);
    }
  });

  test(
    'retries the multipart upload with a refreshed bearer token and a rebuilt file stream',
    () async {
      final local = _FakeAuthLocalDataSource(
        accessToken: 'access-token-expirado',
        refreshToken: 'refresh-vigente',
      );
      final uploadBody = attachmentJson(
        id: 'att-1',
        batchId: 'batch-1',
        clientFileId: 'file-key-1',
        lifecycle: 'uploading',
        processingStatus: 'pending',
        downloadAvailable: false,
      );

      final mainAdapter = RecordingHttpClientAdapter([
        QueuedResponse.json(401, {'message': 'token expirado'}),
      ]);
      final refreshAdapter = RecordingHttpClientAdapter([
        QueuedResponse.json(200, {
          'accessToken': 'access-token-nuevo',
          'refreshToken': 'refresh-nuevo',
        }),
        QueuedResponse.json(200, uploadBody),
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
      final dataSource = AttachmentRemoteDataSource(dio);

      final uploaded = await dataSource.upload(
        'batch-1',
        'file-key-1',
        LocalAttachment(
          path: original.path,
          name: 'informe-retry.pdf',
          byteSize: original.lengthSync(),
        ),
        CancelToken(),
        (_, _) {},
      );

      expect(uploaded.id, 'att-1');
      expect(local.savedAccessToken, 'access-token-nuevo');

      // First (rejected) attempt still carried the original bytes and token.
      final first = mainAdapter.requests.single;
      expect(
        first.path,
        'https://api.test${ApiConstants.messages}/upload-batches/batch-1/files',
      );
      expect(first.headers['Authorization'], 'Bearer access-token-expirado');
      expect(first.bodyText(), contains('original-reenviable-con-marker-exacto'));
      expect(first.bodyText(), contains('file-key-1'));

      // The retried attempt was forwarded through the auth-refresh client.
      expect(refreshAdapter.requests, hasLength(2));
      expect(
        refreshAdapter.requests[0].path,
        'https://api.test${ApiConstants.refreshToken}',
      );

      final retried = refreshAdapter.requests[1];
      expect(
        retried.path,
        'https://api.test${ApiConstants.messages}/upload-batches/batch-1/files',
      );
      expect(retried.headers['Authorization'], 'Bearer access-token-nuevo');
      final retriedBody = retried.bodyText();
      expect(retried.contentType, isNotNull);
      expect(
        _boundary(retried.contentType!),
        isNot(_boundary(first.contentType!)),
        reason:
            'the multipart body is re-encoded per attempt (fresh boundary), '
            'never reused after the 401 consumed the first one',
      );
      expect(retriedBody, contains('file-key-1'));
      expect(
        retriedBody,
        contains('original-reenviable-con-marker-exacto'),
        reason:
            'the multipart stream is re-encoded per attempt, never reused '
            'after the 401 consumed the first one',
      );
      expect(retriedBody, contains('filename="informe-retry.pdf"'));
    },
  );
}

String _boundary(String contentType) {
  final match = RegExp(r'boundary=([^;\s]+)').firstMatch(contentType);
  return match?.group(1) ?? '';
}
