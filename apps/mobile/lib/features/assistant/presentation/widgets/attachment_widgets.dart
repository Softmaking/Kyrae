import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';
import '../../domain/entities/assistant_attachment.dart';
import '../providers/attachment_provider.dart';

class AttachmentComposerPanel extends ConsumerWidget {
  const AttachmentComposerPanel({super.key, required this.disabled});
  final bool disabled;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draft = ref.watch(attachmentControllerProvider);
    final controller = ref.read(attachmentControllerProvider.notifier);
    return Container(
      color: Colors.white,
      constraints: const BoxConstraints(maxHeight: 230),
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, children: [
            TextButton.icon(onPressed: disabled || draft.busy || draft.locked ? null : () => controller.pick(false), icon: const Icon(Icons.attach_file), label: const Text('Archivos')),
            TextButton.icon(onPressed: disabled || draft.busy || draft.locked ? null : () => controller.pick(true), icon: const Icon(Icons.photo_library_outlined), label: const Text('Fotos')),
            if (draft.files.isNotEmpty) TextButton(onPressed: disabled ? null : () => controller.reset(), child: const Text('Cancelar lote')),
          ]),
          const Text('Hasta 5 archivos · 20 MiB cada uno · PDF, Office, texto, código e imágenes (HEIC/HEIF incluidos). El servidor verifica el contenido.', style: TextStyle(color: AppColors.slate500, fontSize: 11)),
          if (draft.capabilities?.available == false)
            Text('Análisis no disponible: ${draft.capabilities!.unavailableReasons.join(', ')}. Puedes preparar originales; el análisis fallará explícitamente hasta que esté disponible.', style: const TextStyle(color: AppColors.slate600, fontSize: 12)),
          if (draft.busy) const LinearProgressIndicator(),
          for (final file in draft.files) Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              const Icon(Icons.insert_drive_file_outlined, size: 20, color: AppColors.blue600),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${file.local.name} · ${file.local.byteSize} bytes', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                if (file.uploading) LinearProgressIndicator(value: file.progress),
                Text(file.error ?? (file.removing ? 'Retirando…' : file.uploading ? '${(file.progress * 100).round()}% transferido; esperando confirmación' : file.attachment?.lifecycle == 'ready' ? 'Original listo; aún no analizado' : 'Esperando transferencia'), style: TextStyle(fontSize: 11, color: file.error == null ? AppColors.slate600 : Colors.red.shade700)),
              ])),
              if (file.error != null) IconButton(tooltip: 'Reintentar ${file.local.name}', onPressed: draft.locked ? null : () => controller.retry(file), icon: const Icon(Icons.refresh)),
              IconButton(tooltip: 'Retirar ${file.local.name}', onPressed: draft.locked || file.removing ? null : () => controller.remove(file), icon: const Icon(Icons.close)),
            ]),
          ),
          if (draft.error != null) Semantics(liveRegion: true, child: Text(draft.error!, style: TextStyle(color: Colors.red.shade700, fontSize: 12))),
          if (draft.feedback != null) Semantics(liveRegion: true, child: Text(draft.feedback!, style: const TextStyle(fontSize: 12))),
          if (draft.files.isNotEmpty) const Text('La voz se envía por separado. Envía o retira estos archivos antes de grabar.', style: TextStyle(fontSize: 11, color: AppColors.slate600)),
        ]),
      ),
    );
  }
}

class StoredAttachmentCard extends ConsumerStatefulWidget {
  const StoredAttachmentCard(this.attachment, {super.key});
  final AssistantAttachment attachment;
  @override
  ConsumerState<StoredAttachmentCard> createState() => _StoredAttachmentCardState();
}
class _StoredAttachmentCardState extends ConsumerState<StoredAttachmentCard> {
  Future<Uint8List?>? _thumbnail;
  bool _busy = false;
  String? _feedback;
  @override
  void initState() { super.initState(); _loadThumbnail(); }
  @override
  void didUpdateWidget(StoredAttachmentCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.attachment.id != widget.attachment.id || oldWidget.attachment.processingVersion != widget.attachment.processingVersion || oldWidget.attachment.thumbnailAvailable != widget.attachment.thumbnailAvailable) _loadThumbnail();
  }
  void _loadThumbnail() {
    _thumbnail = ref.read(attachmentControllerProvider.notifier).thumbnail(widget.attachment);
  }
  Future<void> _export(bool save) async {
    if (_busy) return;
    setState(() { _busy = true; _feedback = null; });
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null ? null : box.localToGlobal(Offset.zero) & box.size;
    final feedback = await ref.read(attachmentControllerProvider.notifier).export(widget.attachment, save, origin);
    if (!mounted) return;
    setState(() { _busy = false; _feedback = feedback; });
  }
  @override
  Widget build(BuildContext context) {
    final file = widget.attachment;
    return Container(
      margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
      child: DefaultTextStyle(style: const TextStyle(color: AppColors.slate800, fontSize: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(file.originalFilename, style: const TextStyle(fontWeight: FontWeight.w700)),
        Text('${file.byteSize} bytes · ${file.lifecycle} · ${_processingLabel(file.processingStatus)}'),
        if (file.thumbnailAvailable) FutureBuilder<Uint8List?>(future: _thumbnail, builder: (context, snapshot) => snapshot.data == null
          ? const Text('Vista previa no disponible; el original se conserva.')
          : Image.memory(snapshot.data!, width: 160, height: 100, fit: BoxFit.contain, cacheWidth: 320, errorBuilder: (_, _, _) => const Text('Vista previa no disponible.'))),
        if (file.category == 'image' && !file.thumbnailAvailable) const Text('Imagen original (HEIC/HEIF sin vista previa hasta su conversión).'),
        if (file.errorMessage != null) Text(file.errorMessage!),
        if (file.suggestedAction != null) Text(file.suggestedAction!),
        if (file.coverage != null) AttachmentCoveragePanel(file.coverage!),
        Wrap(spacing: 8, children: [
          TextButton.icon(onPressed: _busy || !file.downloadAvailable ? null : () => _export(true), icon: const Icon(Icons.save_alt, size: 18), label: const Text('Guardar original')),
          TextButton.icon(onPressed: _busy || !file.downloadAvailable ? null : () => _export(false), icon: const Icon(Icons.share_outlined, size: 18), label: const Text('Compartir')),
        ]),
        if (_busy) const LinearProgressIndicator(),
        if (!file.downloadAvailable) const Text('Original no disponible. No se sustituirá por una conversión.'),
        if (_feedback != null) Semantics(liveRegion: true, child: Text(_feedback!)),
      ])),
    );
  }
}

String _processingLabel(String value) => switch (value) {
  'pending' => 'análisis pendiente', 'processing' => 'procesando',
  'usable' => 'contenido extraído (no prueba de análisis completo)',
  'partial' => 'extracción parcial', 'failed' => 'procesamiento fallido', _ => value,
};

String sourceLocator(Object? value) {
  if (value == null) return 'extensión desconocida';
  final j = Map<String, dynamic>.from(value as Map);
  return switch (j['kind']) {
    'pages' => 'páginas ${j['start']}–${j['end']}${j['region'] == null ? '' : ' · región ${jsonEncode(j['region'])}'}',
    'lines' => 'líneas ${j['start']}–${j['end']}',
    'sheet' => 'hoja ${j['sheet']} · filas ${j['startRow']}–${j['endRow']} · columnas ${j['startColumn'] ?? '?'}–${j['endColumn'] ?? '?'}${j['hidden'] == true ? ' (oculta)' : ''}',
    'document' => '${j['section']} ${j['start']}–${j['end']}',
    'image' => 'imagen/cuadro ${j['frame']}',
    _ => 'localización desconocida',
  };
}

class AttachmentCoveragePanel extends StatelessWidget {
  const AttachmentCoveragePanel(this.coverage, {super.key});
  final AttachmentCoverage coverage;
  @override
  Widget build(BuildContext context) => ExpansionTile(
    tilePadding: EdgeInsets.zero, title: const Text('Cobertura de extracción', style: TextStyle(fontSize: 12)),
    subtitle: Text(coverage.summary, style: const TextStyle(fontSize: 11)),
    children: [
      const Text('Extracción no equivale a contenido enviado ni a atención del modelo.'),
      for (final total in coverage.totals) Text('${total['sheet'] ?? ''} ${total['unit']}: ${total['total'] ?? 'desconocido'}'),
      for (final range in coverage.included) Text('Extraído: ${sourceLocator(range)}'),
      for (final omission in coverage.omitted) Text('Omitido: ${sourceLocator(omission['locator'])} · ${omission['reason']}${omission['message'] == null ? '' : ' · ${omission['message']}'}'),
      for (final notice in coverage.notices) Text(notice['message'] as String),
      if (coverage.truncated) const Text('Contenido recortado. Acota el archivo o la pregunta.'),
    ],
  );
}

class AttachmentContextPanel extends StatelessWidget {
  const AttachmentContextPanel(this.manifest, {super.key});
  final Map<String, dynamic> manifest;
  @override
  Widget build(BuildContext context) => ExpansionTile(
    tilePadding: EdgeInsets.zero,
    title: const Text('Fuentes enviadas al asistente', style: TextStyle(fontSize: 12)),
    children: [
      Text('Entrega: ${manifest['status']}. La entrega no demuestra atención ni análisis completo.'),
      Text('Modelo: ${manifest['resolvedModel']} · perfil ${manifest['profileVersion']}'),
      for (final file in jsonRecords(manifest['files'])) ...[
        Text('${file['attachmentId']}: ${file['status']} (versión ${file['processingVersion']})'),
        for (final range in jsonRecords(file['included'])) Text(sourceLocator(range)),
      ],
      for (final omission in jsonRecords(manifest['omissions'])) Text('Omitido ${omission['attachmentId'] ?? 'historial'}: ${sourceLocator(omission['locator'])} · ${omission['reason']}'),
      if ((manifest['omittedHistoryMessageIds'] as List? ?? []).isNotEmpty) const Text('Parte del historial no se envió en este turno.'),
      if (manifest['truncated'] == true) const Text('Contexto parcial: acota la pregunta para revisar las partes omitidas.'),
      if (manifest['accounting'] is Map) Text('Contabilidad de entrada suministrada: ${jsonEncode(manifest['accounting'])}. No representa el contexto interno completo del runtime.'),
    ],
  );
}
