import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import '../../data/datasources/attachment_local_datasource.dart';
import '../../data/datasources/attachment_remote_datasource.dart';
import '../../data/repositories/attachment_repository_impl.dart';
import '../../domain/entities/assistant_attachment.dart';
import '../../domain/repositories/attachment_repository.dart';
import '../../domain/usecases/attachment_usecases.dart';

final attachmentRepositoryProvider = Provider<AttachmentRepository>((ref) {
  final local = AttachmentLocalDataSource();
  ref.onDispose(() { unawaited(local.clear()); });
  return AttachmentRepositoryImpl(AttachmentRemoteDataSource(ref.watch(apiClientProvider).dio), local);
});
final attachmentControllerProvider = NotifierProvider<AttachmentController, AttachmentDraft>(AttachmentController.new);

class DraftFile {
  DraftFile(this.local, this.clientFileId);
  final LocalAttachment local;
  final String clientFileId;
  final CancelToken token = CancelToken();
  AssistantAttachment? attachment;
  double progress = 0;
  bool uploading = false;
  bool removing = false;
  String? error;
}

class AttachmentSubmission {
  const AttachmentSubmission(this.uploadBatchId, this.attachmentIds, this.clientMessageId, this.message, this.sessionId);
  final String uploadBatchId, clientMessageId, message;
  final List<String> attachmentIds;
  final String? sessionId;
}

class AttachmentDraft {
  const AttachmentDraft({this.files = const [], this.batch, this.capabilities,
    this.busy = false, this.locked = false, this.error, this.feedback});
  final List<DraftFile> files;
  final AssistantUploadBatch? batch;
  final AttachmentCapabilities? capabilities;
  final bool busy, locked;
  final String? error, feedback;
  bool get ready => !busy && !locked && files.isNotEmpty && files.every((f) =>
    f.attachment?.lifecycle == 'ready' && !f.uploading && !f.removing && f.error == null);
}

class AttachmentController extends Notifier<AttachmentDraft> {
  late AttachmentRepository _repository;
  final _uuid = const Uuid();
  String? _sessionId;
  String? _batchKey;
  Future<AssistantUploadBatch>? _creating;
  AttachmentSubmission? _submission;
  CancelToken _token = CancelToken();
  final Map<String, Uint8List> _thumbnails = {};
  final Set<CancelToken> _readTokens = {};
  int _epoch = 0;
  int _active = 0;
  Timer? _poll;
  AttachmentDraft _draft = const AttachmentDraft();

  @override
  AttachmentDraft build() {
    _repository = ref.watch(attachmentRepositoryProvider);
    ref.listen(authControllerProvider.select((s) => s.user?.id), (previous, next) {
      if (previous != next) { unawaited(reset()); }
    });
    ref.onDispose(() {
      // Riverpod blocks state/ref access inside onDispose; mirror reads only.
      _epoch++;
      _poll?.cancel();
      _token.cancel();
      for (final file in _draft.files) { file.token.cancel(); }
      for (final token in _readTokens) { token.cancel(); }
      final id = _draft.batch?.id;
      if (id != null && !_isCommitted) { unawaited(_repository.cancel(id).catchError((_) {})); }
      _thumbnails.clear();
      unawaited(_repository.clear());
    });
    return const AttachmentDraft();
  }
  bool _isCommitted = false;
  bool _valid(int epoch) => ref.mounted && epoch == _epoch;
  void _emit({String? error, String? feedback, bool? busy, bool? locked,
      List<DraftFile>? files, AssistantUploadBatch? batch, AttachmentCapabilities? capabilities}) {
    if (!ref.mounted) return;
    state = _draft = AttachmentDraft(files: files ?? [...state.files], batch: batch ?? state.batch,
      capabilities: capabilities ?? state.capabilities, busy: busy ?? state.busy,
      locked: locked ?? state.locked, error: error, feedback: feedback);
  }
  Future<void> setSession(String? sessionId) async {
    if (_sessionId == sessionId) return;
    await reset();
    _sessionId = sessionId;
    await loadCapabilities();
  }
  Future<void> loadCapabilities() async {
    final epoch = _epoch;
    try {
      final value = await _repository.capabilities(_sessionId);
      if (_valid(epoch)) _emit(capabilities: value);
    } catch (e) { if (_valid(epoch)) _emit(error: attachmentError(e)); }
  }
  Future<void> pick(bool photos) async {
    if (state.busy || state.locked) return;
    final epoch = _epoch;
    _emit(busy: true);
    try {
      final selected = await SelectAssistantAttachments(_repository)(photos, state.files.map((f) => f.local).toList());
      if (!_valid(epoch)) {
        for (final f in selected) { await _repository.release(f.path); }
        return;
      }
      _emit(files: [...state.files, ...selected.map((f) => DraftFile(f, _uuid.v4()))], busy: false,
        feedback: selected.isEmpty ? 'Sélección cancelada.' : null);
      _pump();
    } catch (e) {
      if (_valid(epoch)) _emit(busy: false, error: e is FormatException ? e.message : e is PlatformException ? e.message : attachmentError(e));
    }
  }
  Future<AssistantUploadBatch> _ensureBatch() {
    final existing = state.batch;
    if (existing != null) return Future.value(existing);
    final epoch = _epoch;
    return _creating ??= _repository.createBatch(_batchKey ??= _uuid.v4(), _sessionId, _token).then((batch) {
      if (!_valid(epoch)) { unawaited(_repository.cancel(batch.id).catchError((_) {})); throw StateError('Draft changed'); }
      _emit(batch: batch, capabilities: batch.capabilities);
      _poll ??= Timer.periodic(const Duration(seconds: 3), (_) { unawaited(refresh()); });
      return batch;
    }).whenComplete(() { if (_valid(epoch)) _creating = null; });
  }
  void _pump() {
    if (!ref.mounted || state.locked) return;
    for (final file in state.files) {
      if (_active >= 2) break;
      if (file.uploading || file.removing || file.attachment != null || file.error != null) continue;
      file.uploading = true;
      _active++;
      unawaited(_upload(file, _epoch));
    }
    _emit();
  }
  Future<void> _upload(DraftFile file, int epoch) async {
    try {
      final batch = await _ensureBatch();
      if (!_valid(epoch) || file.token.isCancelled) return;
      file.attachment = await _repository.upload(batch.id, file.clientFileId, file.local, file.token, (sent, total) {
        if (_valid(epoch) && state.files.contains(file)) {
          file.progress = total > 0 ? (sent / total).clamp(0, 1) : 0;
          _emit();
        }
      });
    } catch (e) { if (_valid(epoch)) file.error = attachmentError(e); }
    finally {
      if (_valid(epoch)) {
        file.uploading = false;
        _active--;
        _emit();
        _pump();
      }
    }
  }
  Future<void> refresh() async {
    final id = state.batch?.id;
    if (id == null || state.locked) return;
    final epoch = _epoch;
    try {
      final batch = await _repository.batch(id, _token);
      if (!_valid(epoch)) return;
      for (final file in state.files) {
        final matches = batch.attachments.where((a) => a.clientFileId == file.clientFileId);
        if (matches.isNotEmpty && !file.removing) {
          file.attachment = matches.first;
          if (matches.first.lifecycle == 'ready') file.error = null;
        }
      }
      _emit(batch: batch, error: batch.state != 'open' ? 'El lote ya no está abierto. Recupera el envío o inicia un nuevo borrador.' : null);
    } catch (e) { if (_valid(epoch)) _emit(error: attachmentError(e)); }
  }
  Future<void> retry(DraftFile file) async {
    if (state.locked || file.uploading || file.removing) return;
    await refresh(); // Recover an acknowledgement lost after durable upload.
    if (!ref.mounted || !state.files.contains(file)) return;
    if (file.attachment?.lifecycle == 'ready') { _emit(); return; }
    file.error = null;
    file.attachment = null;
    _pump();
  }
  Future<void> remove(DraftFile file) async {
    if (state.locked || file.removing) return;
    // Let an active transfer settle before deletion; cancellation can race server finalization.
    if (file.uploading) { _emit(error: 'Espera a que termine la transferencia y luego retira el archivo, o cancela el lote.'); return; }
    final epoch = _epoch;
    file.removing = true;
    _emit();
    try {
      final current = state.batch == null ? null : await _repository.batch(state.batch!.id, _token);
      if (!_valid(epoch)) return;
      final batch = current ?? state.batch;
      final descriptor = batch?.attachments.where((a) => a.clientFileId == file.clientFileId).firstOrNull ?? file.attachment;
      if (batch != null && descriptor != null) await _repository.remove(batch.id, descriptor.id);
      if (!_valid(epoch)) return;
      await _repository.release(file.local.path);
      _emit(files: state.files.where((f) => f != file).toList());
    } catch (e) { if (_valid(epoch)) { file.removing = false; _emit(error: attachmentError(e)); } }
  }

  Future<AttachmentSubmission?> prepare(String message) async {
    if (_submission != null) {
      if (_submission!.message != message.trim()) throw const FormatException('Reintenta la misma instrucción para recuperar el envío pendiente.');
      return _submission;
    }
    if (state.files.isEmpty) return null;
    if (!state.ready) throw const FormatException('Todos los archivos deben estar listos; reintenta o retira los que fallaron.');
    final epoch = _epoch;
    _emit(locked: true);
    try {
      final batch = await _repository.batch(state.batch!.id, _token);
      if (!_valid(epoch)) throw const FormatException('La sesión cambió.');
      final selected = state.files.map((f) => f.attachment!).toList();
      if (!exactReadySelection(batch, selected)) throw const FormatException('El conjunto listo no coincide. Recupera el estado antes de enviar.');
      _submission = AttachmentSubmission(batch.id, selected.map((f) => f.id).toList(), _uuid.v4(), message.trim(), _sessionId);
      return _submission;
    } catch (_) { if (_valid(epoch)) _emit(locked: false); rethrow; }
  }
  void uncertain() { _emit(locked: true, error: 'No se confirmó el envío. Reintenta la misma instrucción: se recuperará la misma tarea sin duplicarla.'); }
  Future<void> committed(String sessionId) async {
    _isCommitted = true;
    await reset(cancelBatch: false);
    _sessionId = sessionId;
  }
  Future<void> reset({bool cancelBatch = true}) async {
    _epoch++;
    final epoch = _epoch;
    final id = state.batch?.id;
    final committed = _isCommitted;
    _token.cancel();
    for (final file in state.files) { file.token.cancel(); }
    for (final token in _readTokens) { token.cancel(); }
    _readTokens.clear();
    _thumbnails.clear();
    _poll?.cancel(); _poll = null;
    _token = CancelToken(); _active = 0; _creating = null;
    _batchKey = null; _submission = null; _isCommitted = false;
    _sessionId = null;
    if (ref.mounted) state = _draft = const AttachmentDraft(busy: true);
    await _repository.clear();
    if (cancelBatch && id != null && !committed) {
      try { await _repository.cancel(id); } catch (_) { /* Fixed backend staging expiry remains authoritative. */ }
    }
    if (_valid(epoch)) state = _draft = const AttachmentDraft();
  }
  Future<Uint8List?> thumbnail(AssistantAttachment file) async {
    if (!file.thumbnailAvailable) return null;
    final key = '${file.id}:${file.processingVersion}';
    if (_thumbnails.containsKey(key)) return _thumbnails[key];
    final epoch = _epoch;
    final token = CancelToken(); _readTokens.add(token);
    try {
      final bytes = await _repository.thumbnail(file.id, token);
      if (!_valid(epoch)) return null;
      // At most 16 x 128 KiB, scoped to the active user/session.
      if (_thumbnails.length >= 16) _thumbnails.remove(_thumbnails.keys.first);
      _thumbnails[key] = bytes;
      return bytes;
    } catch (_) { return null; } finally { _readTokens.remove(token); }
  }
  Future<String> export(AssistantAttachment file, bool save, Rect? origin) async {
    final token = CancelToken(); _readTokens.add(token);
    try { return attachmentExportFeedback(await _repository.export(file, save, token, origin)); }
    catch (e) { return attachmentError(e); }
    finally { _readTokens.remove(token); }
  }
}
