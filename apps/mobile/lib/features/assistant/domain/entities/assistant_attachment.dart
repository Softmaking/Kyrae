import 'dart:convert';

/// Mirrors packages/shared-contracts/src/attachments/attachment.contracts.ts.
/// Originals are paths/streams in the data layer, never binary DTO properties.
class AttachmentPolicy {
  const AttachmentPolicy({this.maxFiles = 5, this.maxFileBytes = 20971520,
    this.maxBatchBytes = 104857600, this.maxFilenameBytes = 255});
  final int maxFiles, maxFileBytes, maxBatchBytes, maxFilenameBytes;
  factory AttachmentPolicy.fromJson(Map<String, dynamic> j) => AttachmentPolicy(
    maxFiles: j['maxFiles'] as int, maxFileBytes: j['maxFileBytes'] as int,
    maxBatchBytes: j['maxBatchBytes'] as int, maxFilenameBytes: j['maxFilenameBytes'] as int);
}

class AssistantAttachment {
  AssistantAttachment.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String, batchId = j['batchId'] as String,
      clientFileId = j['clientFileId'] as String,
      sessionId = j['sessionId'] as String?, messageId = j['messageId'] as String?,
      originalFilename = j['originalFilename'] as String, byteSize = j['byteSize'] as int,
      mediaType = j['mediaType'] as String?, category = j['category'] as String?,
      lifecycle = j['lifecycle'] as String, processingStatus = j['processingStatus'] as String,
      processingVersion = j['processingVersion'] as int,
      errorCode = j['errorCode'] as String?, errorMessage = j['errorMessage'] as String?,
      suggestedAction = j['suggestedAction'] as String?,
      downloadAvailable = j['downloadAvailable'] == true,
      thumbnailAvailable = j['thumbnailAvailable'] == true,
      coverage = j['coverage'] == null ? null : AttachmentCoverage.fromJson(j['coverage'] as Map<String, dynamic>),
      createdAt = DateTime.parse(j['createdAt'] as String), updatedAt = DateTime.parse(j['updatedAt'] as String);
  final String id, batchId, clientFileId, originalFilename, lifecycle, processingStatus;
  final String? sessionId, messageId, mediaType, category, errorCode, errorMessage, suggestedAction;
  final int byteSize, processingVersion;
  final bool downloadAvailable, thumbnailAvailable;
  final AttachmentCoverage? coverage;
  final DateTime createdAt, updatedAt;
}

class AttachmentCoverage {
  AttachmentCoverage.fromJson(Map<String, dynamic> j)
    : attachmentId = j['attachmentId'] as String,
      processingVersion = j['processingVersion'] as int,
      status = j['status'] as String, summary = j['summary'] as String,
      totals = jsonRecords(j['totals']), included = jsonRecords(j['included']),
      omitted = jsonRecords(j['omitted']), truncated = j['truncated'] == true,
      extractedTextBytes = j['extractedTextBytes'] as int?, notices = jsonRecords(j['notices']);
  final String attachmentId, status, summary;
  final int processingVersion;
  final int? extractedTextBytes;
  final bool truncated;
  final List<Map<String, dynamic>> totals, included, omitted, notices;
}

List<Map<String, dynamic>> jsonRecords(Object? value) => (value as List? ?? const [])
    .map((e) => Map<String, dynamic>.from(e as Map)).toList(growable: false);

class AttachmentCapabilities {
  AttachmentCapabilities.fromJson(Map<String, dynamic> j)
      : available = j['available'] == true, provider = j['provider'] as String,
        unavailableReasons = List<String>.from(j['unavailableReasons'] as List? ?? []),
        limits = AttachmentPolicy.fromJson(j['limits'] as Map<String, dynamic>),
        wire = Map.unmodifiable(j);
  final bool available;
  final String provider;
  final List<String> unavailableReasons;
  final AttachmentPolicy limits;
  /// Retains every canonical accounting/profile/constraint field without inventing defaults.
  final Map<String, dynamic> wire;
}

class AssistantUploadBatch {
  AssistantUploadBatch.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String, sessionId = j['sessionId'] as String?,
        channel = j['channel'] as String, state = j['state'] as String,
        expiresAt = DateTime.parse(j['expiresAt'] as String),
        attachments = jsonRecords(j['attachments']).map(AssistantAttachment.fromJson).toList(),
        limits = AttachmentPolicy.fromJson(j['limits'] as Map<String, dynamic>),
        capabilities = AttachmentCapabilities.fromJson(j['capabilities'] as Map<String, dynamic>);
  final String id, channel, state;
  final String? sessionId;
  final DateTime expiresAt;
  final List<AssistantAttachment> attachments;
  final AttachmentPolicy limits;
  final AttachmentCapabilities capabilities;
}

class LocalAttachment {
  const LocalAttachment({required this.path, required this.name, required this.byteSize});
  final String path, name;
  final int byteSize;
}

String? validateAttachmentSelection(List<LocalAttachment> files, {AttachmentPolicy policy = const AttachmentPolicy()}) {
  if (files.length > policy.maxFiles) return 'Seleccionaste ${files.length} archivos. El máximo es ${policy.maxFiles}; no se agregó ninguno.';
  for (final f in files) {
    if (f.byteSize > policy.maxFileBytes) return '${f.name}: supera 20 MiB (20.971.520 bytes).';
    if (f.byteSize < 0 || f.name.isEmpty || f.name == '.' || f.name == '..' ||
        RegExp(r'[/\\\x00-\x1f\x7f]').hasMatch(f.name) || utf8.encode(f.name).length > policy.maxFilenameBytes) {
      return '${f.name}: nombre inválido; usa un nombre sin rutas ni controles, de hasta 255 bytes UTF-8.';
    }
  }
  if (files.fold<int>(0, (sum, f) => sum + f.byteSize) > policy.maxBatchBytes) return 'El conjunto supera 100 MiB.';
  return null;
}

String safeAttachmentFilename(String name) {
  var safe = name.split(RegExp(r'[/\\]')).last.replaceAll(RegExp(r'[\x00-\x1f\x7f]'), '_');
  if (safe.isEmpty || safe == '.' || safe == '..') safe = 'archivo';
  while (utf8.encode(safe).length > 255) { safe = String.fromCharCodes(safe.runes.take(safe.runes.length - 1)); }
  return safe;
}
