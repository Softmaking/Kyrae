import '../entities/assistant_attachment.dart';
import '../repositories/attachment_repository.dart';

class SelectAssistantAttachments {
  const SelectAssistantAttachments(this.repository);
  final AttachmentRepository repository;
  Future<List<LocalAttachment>> call(bool photos, List<LocalAttachment> existing) async {
    final selected = await repository.pick(photos);
    final error = validateAttachmentSelection([...existing, ...selected]);
    if (error != null) {
      for (final file in selected) { await repository.release(file.path); }
      throw FormatException(error);
    }
    return selected;
  }
}

bool exactReadySelection(AssistantUploadBatch batch, List<AssistantAttachment> selected) {
  final ready = batch.attachments.where((f) => f.lifecycle == 'ready').map((f) => f.id).toSet();
  final ids = selected.map((f) => f.id).toSet();
  return batch.state == 'open' && batch.expiresAt.isAfter(DateTime.now()) &&
      selected.isNotEmpty && selected.length <= 5 && ids.length == selected.length &&
      batch.attachments.length == selected.length && ready.length == ids.length &&
      ready.containsAll(ids) && selected.every((f) => f.lifecycle == 'ready' && f.batchId == batch.id);
}
