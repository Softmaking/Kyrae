import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/core/storage/secure_storage_service.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/assistant_realtime_datasource.dart';
import 'package:kyrae_mobile/features/assistant/data/datasources/attachment_local_datasource.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';
import 'package:kyrae_mobile/features/assistant/domain/repositories/attachment_repository.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';
import 'package:kyrae_mobile/features/auth/presentation/providers/auth_provider.dart';

/// Canonical attachment-policy values from
/// packages/shared-contracts/src/attachments/attachment.contracts.ts.
const int kMaxAttachmentFileBytes = 20971520;
const int kMaxAttachmentBatchBytes = 104857600;
const int kMaxAttachmentFilenameBytes = 255;
const int kMaxAttachmentsPerMessage = 5;

const kTestUser = User(
  id: 'user-1',
  email: 'admin@softmaking.cl',
  firstName: 'Admin',
  firstSurname: 'Strator',
  fullName: 'Admin Strator',
  roles: ['admin'],
  permissions: ['ASSISTANT_CHAT_USE'],
);

Map<String, dynamic> limitsJson() => const {
  'maxFiles': 5,
  'maxFileBytes': 20971520,
  'maxBatchBytes': 104857600,
  'maxFilenameBytes': 255,
};

Map<String, dynamic> capabilitiesJson({
  bool available = true,
  List<String> unavailableReasons = const [],
  String? resolvedModel = 'hermes-test-model',
}) => {
  'provider': 'hermes',
  'resolvedModel': ?resolvedModel,
  'profileVersion': 'profile-1',
  'evidenceVersion': 'evidence-1',
  'modelIdentityEvidence': available ? 'verified' : 'unknown',
  'available': available,
  'imageInputAvailable': available,
  'unavailableReasons': unavailableReasons,
  'textInputAccounting': available ? 'verified_tokenizer' : 'unavailable',
  'imageInputAccounting': available
      ? 'verified_upper_bound'
      : 'unavailable',
  'outputAccountingMode': 'utf16_units',
  'contextWindowTokens': null,
  'imageTransport': available ? 'inline-data-url' : null,
  'imageMediaTypes': ['image/jpeg', 'image/png'],
  'limits': limitsJson(),
  'constraints': const {
    'maxSerializedRequestBytes': 9000000,
    'maxCombinedTextUtf16Units': 60000,
    'maxSuppliedInputTokens': 24000,
    'maxOutputTokens': 4096,
    'maxOutputUtf16Units': 16000,
    'maxRawResponseBytes': 262144,
    'invocationDeadlineMs': 120000,
    'maxImages': 5,
    'maxImageBytes': 1048576,
    'maxImageLongEdgePixels': 2048,
  },
};

Map<String, dynamic> coverageJson({
  String attachmentId = 'att-1',
  String status = 'partial',
  String summary = 'Extracción parcial con omisiones explícitas.',
  List<Map<String, dynamic>>? totals,
  List<Map<String, dynamic>>? included,
  List<Map<String, dynamic>>? omitted,
  bool truncated = false,
  int? extractedTextBytes = 4096,
  List<Map<String, dynamic>>? notices,
}) => {
  'attachmentId': attachmentId,
  'processingVersion': 1,
  'status': status,
  'summary': summary,
  'totals':
      totals ??
      [
        {'unit': 'pages', 'total': null, 'sheet': null},
      ],
  'included':
      included ??
      [
        {'kind': 'lines', 'start': 1, 'end': 40},
      ],
  'omitted': ?omitted,
  'truncated': truncated,
  'extractedTextBytes': ?extractedTextBytes,
  'notices': ?notices,
};

Map<String, dynamic> attachmentJson({
  String id = 'att-1',
  String batchId = 'batch-1',
  String clientFileId = 'cf-1',
  String? sessionId,
  String? messageId,
  String originalFilename = 'informe.pdf',
  int byteSize = 1024,
  String? mediaType = 'application/pdf',
  String? category = 'document',
  String lifecycle = 'ready',
  String processingStatus = 'usable',
  int processingVersion = 1,
  String? errorCode,
  String? errorMessage,
  String? suggestedAction,
  bool downloadAvailable = true,
  bool thumbnailAvailable = false,
  Map<String, dynamic>? coverage,
  String createdAt = '2026-10-01T10:00:00.000Z',
  String updatedAt = '2026-10-01T10:00:05.000Z',
}) => {
  'id': id,
  'batchId': batchId,
  'sessionId': ?sessionId,
  'messageId': ?messageId,
  'clientFileId': clientFileId,
  'originalFilename': originalFilename,
  'byteSize': byteSize,
  'mediaType': ?mediaType,
  'category': ?category,
  'lifecycle': lifecycle,
  'processingStatus': processingStatus,
  'processingVersion': processingVersion,
  'errorCode': ?errorCode,
  'errorMessage': ?errorMessage,
  'suggestedAction': ?suggestedAction,
  'downloadAvailable': downloadAvailable,
  'thumbnailAvailable': thumbnailAvailable,
  'coverage': ?coverage,
  'createdAt': createdAt,
  'updatedAt': updatedAt,
};

Map<String, dynamic> batchJson(
  String id, {
  String? sessionId,
  String state = 'open',
  String channel = 'mobile',
  List<Map<String, dynamic>> attachments = const [],
  DateTime? expiresAt,
  Map<String, dynamic>? capabilities,
}) => {
  'id': id,
  'sessionId': ?sessionId,
  'channel': channel,
  'state': state,
  'expiresAt':
      (expiresAt ?? DateTime.now().add(const Duration(hours: 20)))
          .toIso8601String(),
  'attachments': attachments,
  'limits': limitsJson(),
  'capabilities': capabilities ?? capabilitiesJson(),
};

/// In-memory Dio adapter queueing canned responses and recording every
/// request, mirroring the convention in
/// test/core/network/auth_interceptor_test.dart.
class QueuedResponse {
  QueuedResponse.json(this.statusCode, this.body, {this.headers = const {}})
    : bytes = null,
      chunks = null;

  QueuedResponse.bytes(this.statusCode, this.bytes, {this.headers = const {}})
    : body = null,
      chunks = null;

  QueuedResponse.stream(
    this.statusCode,
    this.chunks, {
    this.headers = const {},
  }) : body = null,
       bytes = null;

  final int statusCode;
  final Map<String, dynamic>? body;
  final Uint8List? bytes;
  final List<Uint8List>? chunks;
  final Map<String, List<String>> headers;
}

class RecordedRequest {
  RecordedRequest(RequestOptions options)
    : method = options.method,
      path = options.uri.toString(),
      headers = Map<String, String>.of(options.headers.cast<String, String>()),
      queryParameters = Map<String, String>.of(
        options.queryParameters.map((key, value) => MapEntry(key, '$value')),
      ),
      contentType = options.headers[Headers.contentTypeHeader]?.toString();

  final String method;
  final String path;
  final Map<String, String> headers;
  final Map<String, String> queryParameters;
  final String? contentType;
  Uint8List? bodyBytes;

  String bodyText() => utf8.decode(bodyBytes ?? Uint8List.fromList(const []));

  bool get hasBody => bodyBytes != null;
}

class RecordingHttpClientAdapter implements HttpClientAdapter {
  RecordingHttpClientAdapter(List<QueuedResponse> responses)
    : queue = Queue<QueuedResponse>.from(responses);

  final Queue<QueuedResponse> queue;
  final List<RecordedRequest> requests = [];

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final record = RecordedRequest(options);
    if (requestStream != null) {
      final builder = BytesBuilder(copy: false);
      await for (final chunk in requestStream) {
        builder.add(chunk);
      }
      record.bodyBytes = builder.takeBytes();
    }
    requests.add(record);

    if (queue.isEmpty) {
      fail('Unexpected request: ${options.method} ${options.uri}');
    }
    final response = queue.removeFirst();
    final headers = Map<String, List<String>>.of(response.headers);
    headers.putIfAbsent(
      Headers.contentTypeHeader,
      () => [Headers.jsonContentType],
    );

    if (response.body != null) {
      return ResponseBody.fromBytes(
        Uint8List.fromList(utf8.encode(jsonEncode(response.body))),
        response.statusCode,
        headers: headers,
      );
    }
    if (response.bytes != null) {
      return ResponseBody.fromBytes(
        response.bytes!,
        response.statusCode,
        headers: headers,
      );
    }
    return ResponseBody(
      Stream.fromIterable(response.chunks!),
      response.statusCode,
      headers: headers,
    );
  }
}

/// Fake [AttachmentRepository] recording every call so controllers can be
/// driven offline without plugin or network access.
class FakeAttachmentRepository implements AttachmentRepository {
  FakeAttachmentRepository()
    : batchExpiresAt = DateTime.now().add(const Duration(hours: 20));

  final List<String?> capabilitiesCalls = [];
  final List<({String key, String? sessionId})> createBatchCalls = [];
  final List<String> batchCalls = [];
  final List<({String batchId, String clientFileId})> uploadCalls = [];
  final List<({String batchId, String attachmentId})> removeCalls = [];
  final List<String> cancelIds = [];
  final List<String> thumbnailCalls = [];
  final List<String> releasedPaths = [];
  final List<bool> pickCalls = [];
  final List<({AssistantAttachment attachment, bool save, Rect? origin})>
  exportCalls = [];
  int clearCalls = 0;

  // Behaviour knobs.
  String batchId = 'batch-1';
  String? batchSessionId;
  String batchState = 'open';
  final DateTime batchExpiresAt;
  List<LocalAttachment> pickResult = [];
  Object? capabilitiesError;
  Object? createBatchError;
  Object? batchError;
  Object? uploadError;
  Object? removeError;
  Object? thumbnailError;
  Object? exportError;
  AttachmentExportResult exportResult = AttachmentExportResult.saved;
  Uint8List thumbnailBytes = Uint8List.fromList([9, 8, 7]);
  AttachmentCapabilities capabilitiesResult = AttachmentCapabilities.fromJson(
    capabilitiesJson(),
  );

  final List<Map<String, dynamic>> _uploadedJson = [];

  @override
  Future<List<LocalAttachment>> pick(bool photos) async {
    pickCalls.add(photos);
    return pickResult;
  }

  @override
  Future<AttachmentCapabilities> capabilities(String? sessionId) async {
    capabilitiesCalls.add(sessionId);
    if (capabilitiesError != null) throw capabilitiesError!;
    return capabilitiesResult;
  }

  @override
  Future<AssistantUploadBatch> createBatch(
    String key,
    String? sessionId,
    CancelToken token,
  ) async {
    createBatchCalls.add((key: key, sessionId: sessionId));
    if (createBatchError != null) throw createBatchError!;
    return AssistantUploadBatch.fromJson(
      batchJson(
        batchId,
        sessionId: sessionId,
        state: batchState,
        expiresAt: batchExpiresAt,
      ),
    );
  }

  @override
  Future<AssistantUploadBatch> batch(String id, CancelToken token) async {
    batchCalls.add(id);
    if (batchError != null) throw batchError!;
    return AssistantUploadBatch.fromJson(
      batchJson(
        batchId,
        sessionId: batchSessionId,
        state: batchState,
        expiresAt: batchExpiresAt,
        attachments: _uploadedJson.map(Map<String, dynamic>.of).toList(),
      ),
    );
  }

  @override
  Future<AssistantAttachment> upload(
    String batchId,
    String key,
    LocalAttachment file,
    CancelToken token,
    ProgressCallback progress,
  ) async {
    uploadCalls.add((batchId: batchId, clientFileId: key));
    if (uploadError != null) throw uploadError!;
    final json = attachmentJson(
      id: 'att-${_uploadedJson.length + 1}',
      batchId: batchId,
      clientFileId: key,
      sessionId: batchSessionId,
      lifecycle: 'ready',
    );
    _uploadedJson.add(json);
    return AssistantAttachment.fromJson(Map.of(json));
  }

  @override
  Future<void> remove(String batchId, String id) async {
    if (removeError != null) throw removeError!;
    removeCalls.add((batchId: batchId, attachmentId: id));
  }

  @override
  Future<void> cancel(String id) async {
    cancelIds.add(id);
  }

  @override
  Future<Uint8List> thumbnail(String id, CancelToken token) async {
    thumbnailCalls.add(id);
    if (thumbnailError != null) throw thumbnailError!;
    return thumbnailBytes;
  }

  @override
  Future<AttachmentExportResult> export(
    AssistantAttachment attachment,
    bool save,
    CancelToken token,
    Rect? origin,
  ) async {
    if (exportError != null) throw exportError!;
    exportCalls.add((attachment: attachment, save: save, origin: origin));
    return exportResult;
  }

  @override
  Future<void> release(String path) async {
    releasedPaths.add(path);
  }

  @override
  Future<void> clear() async {
    clearCalls++;
  }
}

/// Riverpod stub for authControllerProvider so assistant providers observe a
/// stable authenticated user without touching secure storage or network.
class StubAuthController extends AuthController {
  @override
  AuthState build() =>
      AuthState(status: AuthStatus.authenticated, user: kTestUser);
}

/// Offline [AssistantRealtimeDataSource] without socket_io_client side effects.
class StubRealtimeDataSource extends AssistantRealtimeDataSource {
  StubRealtimeDataSource() : super(StubAuthLocalDataSource());

  @override
  Future<void> connect() async {}

  @override
  Future<void> joinSession(String sessionId) async {}

  @override
  bool get isConnected => false;
}

class StubAuthLocalDataSource extends AuthLocalDataSource {
  StubAuthLocalDataSource()
    : super(SecureStorageService(const FlutterSecureStorage()));
}

/// Lets controller microtask chains settle without fixture races.
Future<void> pumpUntil(
  bool Function() condition, {
  int attempts = 400,
  Duration step = const Duration(milliseconds: 5),
}) async {
  for (var i = 0; i < attempts; i++) {
    if (condition()) return;
    await Future<void>.delayed(step);
  }
  fail('Condition was not reached after ${step * attempts}');
}
