import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/features/assistant/data/models/assistant_message_model.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_attachment.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/presentation/providers/attachment_provider.dart';
import 'package:kyrae_mobile/features/assistant/presentation/widgets/assistant_message_bubble.dart';
import 'package:kyrae_mobile/features/assistant/presentation/widgets/attachment_widgets.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

/// Minimal valid 1x1 PNG used to prove the preview decodes real bytes.
final Uint8List kTinyPng = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
);

class _StubAttachmentController extends AttachmentController {
  _StubAttachmentController(this.draft, [this._thumbnailBytes]);

  final AttachmentDraft draft;
  final Uint8List? _thumbnailBytes;

  @override
  AttachmentDraft build() => draft;

  @override
  Future<Uint8List?> thumbnail(AssistantAttachment file) async =>
      file.thumbnailAvailable ? _thumbnailBytes : null;

  @override
  Future<String> export(AssistantAttachment file, bool save, Rect? origin) async =>
      'Original guardado en el destino seleccionado.';

  @override
  Future<void> remove(DraftFile file) async {}

  @override
  Future<void> retry(DraftFile file) async {}

  @override
  Future<void> reset({bool cancelBatch = true}) async {}

  @override
  Future<void> pick(bool photos) async {}
}

Future<void> _pumpPanel(
  WidgetTester tester,
  List<Object> overrides,
  Widget child,
) async {
  await tester.pumpWidget(
    ProviderScope(
      // Chat bubbles live inside a scrollable list in the app; expansion panels
      // grow the content, so the scaffold body needs the same scroll freedom.
      overrides: overrides.cast(),
      child: MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(child: child),
        ),
      ),
    ),
  );
  await tester.pump();
}

List<Object> _draftOverrides(AttachmentDraft draft, [Uint8List? thumbnails]) => [
  attachmentControllerProvider.overrideWith(
    () => _StubAttachmentController(draft, thumbnails),
  ),
];

/// The bubble/card containers intentionally paint their own decoration around
/// Flutter's ExpansionTile; Flutter 3.44 emits a debug-only ink-splash warning
/// in that case. Production keeps the design, so tests tolerate exactly that
/// diagnostic.
void _allowExpansionTileInkWarning() {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception
        .toString()
        .contains('ListTile background color or ink splashes may be invisible')) {
      return;
    }
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
}

void main() {
  group('StoredAttachmentCard', () {
    for (final entry in const {
      'pending': 'análisis pendiente',
      'usable': 'contenido extraído (no prueba de análisis completo)',
      'partial': 'extracción parcial',
      'failed': 'procesamiento fallido',
    }.entries) {
      testWidgets(
        'renders the "${entry.key}" processing state label truthfully',
        (tester) async {
          final attachment = AssistantAttachment.fromJson(
            attachmentJson(
              id: 'att-${entry.key}',
              batchId: 'batch-1',
              clientFileId: 'cf-${entry.key}',
              processingStatus: entry.key,
            ),
          );

          await _pumpPanel(tester, _draftOverrides(const AttachmentDraft()),
              StoredAttachmentCard(attachment));

          expect(
            find.byWidgetPredicate(
              (widget) => widget is Text && widget.data != null && widget.data!.contains(entry.value),
            ),
            findsOneWidget,
          );
        },
      );
    }

    testWidgets(
      'failed files keep the original download affordance and guidance',
      (tester) async {
        final attachment = AssistantAttachment.fromJson(
          attachmentJson(
            id: 'att-failed',
            batchId: 'batch-1',
            clientFileId: 'cf-failed',
            originalFilename: 'fotografia.HEIC',
            mediaType: null,
            category: 'image',
            processingStatus: 'failed',
            errorCode: 'ATTACHMENT_CODEC_UNAVAILABLE',
            errorMessage: 'No se pudo decodificar el HEIC original.',
            suggestedAction: 'Reintenta después de actualizar la app.',
          ),
        );

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          StoredAttachmentCard(attachment),
        );

        expect(find.text('fotografia.HEIC'), findsOneWidget);
        expect(
          find.text('No se pudo decodificar el HEIC original.'),
          findsOneWidget,
        );
        expect(
          find.text('Reintenta después de actualizar la app.'),
          findsOneWidget,
        );
        final saveButton = tester.widget<TextButton>(
          find.ancestor(
            of: find.text('Guardar original'),
            matching: find.byType(TextButton),
          ),
        );
        expect(
          saveButton.onPressed,
          isNotNull,
          reason:
              'a failed analysis never removes the original download affordance',
        );
        final shareButton = tester.widget<TextButton>(
          find.ancestor(
            of: find.text('Compartir'),
            matching: find.byType(TextButton),
          ),
        );
        expect(shareButton.onPressed, isNotNull);
        expect(
          find.text('Imagen original (HEIC/HEIF sin vista previa hasta su conversión).'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'unavailable originals disable export actions and display the fallback',
      (tester) async {
        final attachment = AssistantAttachment.fromJson(
          attachmentJson(
            id: 'att-lost',
            batchId: 'batch-1',
            clientFileId: 'cf-lost',
            downloadAvailable: false,
          ),
        );

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          StoredAttachmentCard(attachment),
        );

        expect(
          find.text('Original no disponible. No se sustituirá por una conversión.'),
          findsOneWidget,
        );
        final saveButton = tester.widget<TextButton>(
          find.ancestor(
            of: find.text('Guardar original'),
            matching: find.byType(TextButton),
          ),
        );
        expect(saveButton.onPressed, isNull);
        final shareButton = tester.widget<TextButton>(
          find.ancestor(
            of: find.text('Compartir'),
            matching: find.byType(TextButton),
          ),
        );
        expect(shareButton.onPressed, isNull);
      },
    );

    testWidgets('renders omitted coverage locators inside the expansion', (tester) async {
      _allowExpansionTileInkWarning();
      final attachment = AssistantAttachment.fromJson(
        attachmentJson(
          id: 'att-partial',
          batchId: 'batch-1',
          clientFileId: 'cf-partial',
          originalFilename: 'analisis Finanzas.pdf',
          processingStatus: 'partial',
          coverage: coverageJson(
            attachmentId: 'att-partial',
            status: 'partial',
            summary: 'Extracción parcial del PDF origen.',
            totals: [
              {'unit': 'pages', 'total': null, 'sheet': null},
            ],
            included: [
              {'kind': 'lines', 'start': 1, 'end': 40},
            ],
            omitted: [
              {
                'locator': {'kind': 'pages', 'start': 3, 'end': 5},
                'reason': 'processing_limit',
                'message': 'Presupuesto de páginas del proveedor de extracción.',
              },
            ],
            truncated: false,
          ),
        ),
      );

      await _pumpPanel(
        tester,
        _draftOverrides(const AttachmentDraft()),
        StoredAttachmentCard(attachment),
      );

      expect(find.text('Cobertura de extracción'), findsOneWidget);
      expect(
        find.textContaining('Extracción parcial del PDF origen'),
        findsOneWidget,
      );

      await tester.tap(find.text('Cobertura de extracción'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('páginas 3–5'),
        findsOneWidget,
        reason: 'omitted extents are reported with their locator',
      );
      expect(find.textContaining('processing_limit'), findsOneWidget);
      expect(find.textContaining('Presupuesto de páginas'), findsOneWidget);
      expect(find.textContaining('Extraído: líneas 1–40'), findsOneWidget);
      expect(find.textContaining('desconocido'), findsOneWidget);
      expect(
        find.textContaining('Extracción no equivale a contenido enviado'),
        findsOneWidget,
      );
    });

    testWidgets(
      'unavailable previews for images keep the HEIC alternative note without crashing',
      (tester) async {
        final attachment = AssistantAttachment.fromJson(
          attachmentJson(
            id: 'att-heic',
            batchId: 'batch-1',
            clientFileId: 'cf-heic',
            originalFilename: 'IMG_0004.HEIC',
            mediaType: null,
            category: 'image',
            lifecycle: 'ready',
            processingStatus: 'failed',
            thumbnailAvailable: false,
          ),
        );

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          StoredAttachmentCard(attachment),
        );

        expect(find.text('IMG_0004.HEIC'), findsOneWidget);
        expect(
          find.text('Imagen original (HEIC/HEIF sin vista previa hasta su conversión).'),
          findsOneWidget,
        );
        expect(find.byType(Image), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'empty preview responses keep a placeholder instead of crashing',
      (tester) async {
        final attachment = AssistantAttachment.fromJson(
          attachmentJson(
            id: 'att-thumb-empty',
            batchId: 'batch-1',
            clientFileId: 'cf-thumb-empty',
            thumbnailAvailable: true,
          ),
        );

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          StoredAttachmentCard(attachment),
        );
        await tester.pumpAndSettle();

        expect(
          find.text('Vista previa no disponible; el original se conserva.'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'renders decoded preview bytes when available',
      (tester) async {
        final attachment = AssistantAttachment.fromJson(
          attachmentJson(
            id: 'att-thumb-ok',
            batchId: 'batch-1',
            clientFileId: 'cf-thumb-ok',
            thumbnailAvailable: true,
          ),
        );

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft(), kTinyPng),
          StoredAttachmentCard(attachment),
        );
        await tester.pumpAndSettle();

        expect(find.byType(Image), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('AssistantMessageBubble partial output and context manifest', () {
    AssistantMessage bubbleMessage(Map<String, dynamic> overrides) =>
        AssistantMessageModel.fromJson({
          'id': 'ma-1',
          'sessionId': 'sess-1',
          'role': 'assistant',
          'content': 'Resumen parcial del informe adjunto.',
          'createdAt': '2026-10-01T10:05:00.000Z',
          ...overrides,
        });

    testWidgets('a partial output flag shows the default notice', (tester) async {
      await _pumpPanel(
        tester,
        _draftOverrides(const AttachmentDraft()),
        AssistantMessageBubble(bubbleMessage({'partialOutput': true})),
      );

      expect(
        find.text(
          'Respuesta parcial por límite de salida. No es una respuesta completa.',
        ),
        findsOneWidget,
      );
    });

    testWidgets(
      'custom partial notices and utf16 output accounting render truthfully',
      (tester) async {
        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          AssistantMessageBubble(
            bubbleMessage(const {
              'partialOutput': true,
              'partialOutputNotice': 'El límite de salida recortó la respuesta.',
              'outputAccounting': {
                'mode': 'utf16_units',
                'limit': 16000,
                'returnedUnits': 15998,
              },
            }),
          ),
        );

        expect(
          find.text('El límite de salida recortó la respuesta.'),
          findsOneWidget,
        );
        expect(
          find.textContaining('Salida: 15998/16000'),
          findsOneWidget,
        );
        expect(
          find.textContaining('unidades UTF-16 (no tokens)'),
          findsOneWidget,
          reason:
              'utf16 accounting is presented as non-token units, never as tokens',
        );
      },
    );

    testWidgets(
      'the manifest panel separates delivered sources from omissions',
      (tester) async {
        _allowExpansionTileInkWarning();
        final manifest = {
          'version': 1,
          'protocolVersion': 'kyrae-attachment-envelope-v1',
          'profileVersion': 'profile-1',
          'provider': 'hermes',
          'resolvedModel': 'hermes-test-model',
          'status': 'delivered',
          'cutoffMessageId': 'mu-1',
          'files': [
            {
              'attachmentId': 'att-1',
              'processingVersion': 1,
              'status': 'partial',
              'included': [
                {'kind': 'pages', 'start': 1, 'end': 2},
              ],
            },
          ],
          'selectedAttachmentIds': ['att-1'],
          'includedHistoryMessageIds': ['mu-1'],
          'omittedHistoryMessageIds': ['m0'],
          'omissions': [
            {
              'attachmentId': 'att-1',
              'locator': {'kind': 'pages', 'start': 3, 'end': 5},
              'reason': 'processing_limit',
            },
          ],
          'truncated': true,
          'budget': const {
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
          'accounting': {
            'textMode': 'verified_tokenizer',
            'imageMode': 'unavailable',
            'suppliedInputTokens': 1200,
            'imageTokens': null,
            'serializedRequestBytes': 51200,
            'combinedTextUtf16Units': 860,
          },
          'createdAt': '2026-10-01T10:05:00.000Z',
        };

        await _pumpPanel(
          tester,
          _draftOverrides(const AttachmentDraft()),
          AssistantMessageBubble(bubbleMessage({'contextManifest': manifest})),
        );

        await tester.tap(find.text('Fuentes enviadas al asistente'));
        await tester.pumpAndSettle();

        expect(find.textContaining('Entrega: delivered'), findsOneWidget);
        expect(find.textContaining('hermes-test-model'), findsOneWidget);
        expect(find.textContaining('att-1: partial'), findsOneWidget);
        expect(find.textContaining('Omitido att-1:'), findsOneWidget);
        expect(find.textContaining('historial no se envió'), findsOneWidget);
        expect(find.textContaining('Contexto parcial'), findsOneWidget);
        expect(find.textContaining('Contabilidad de entrada'), findsOneWidget);
      },
    );
  });

  group('AttachmentComposerPanel', () {
    DraftFile draftFile(
      LocalAttachment local, {
      AssistantAttachment? attachment,
      double progress = 0,
      bool uploading = false,
      String? error,
      bool removing = false,
    }) {
      final file = DraftFile(local, 'cf-${local.name}');
      file.attachment = attachment;
      file.progress = progress;
      file.uploading = uploading;
      file.error = error;
      file.removing = removing;
      return file;
    }

    testWidgets(
      'uploaded rows keep long original names inside an ellipsis and allow removal',
      (tester) async {
        const longName =
            'informe_presupuesto_consagrado_2026_con_nombres_largos_multilínea.pdf';
        const local = LocalAttachment(
          path: '/tmp/staged/$longName',
          name: longName,
          byteSize: 20971520,
        );
        final draft = AttachmentDraft(files: [
          draftFile(
            local,
            attachment: AssistantAttachment.fromJson(
              attachmentJson(
                id: 'att-1',
                batchId: 'batch-1',
                clientFileId: 'cf-$longName',
                byteSize: 20971520,
              ),
            ),
          ),
        ]);

        await _pumpPanel(
          tester,
          _draftOverrides(draft),
          const AttachmentComposerPanel(disabled: false),
        );

        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Text &&
                widget.data == '$longName · 20971520 bytes' &&
                widget.maxLines == 2 &&
                widget.overflow == TextOverflow.ellipsis,
          ),
          findsOneWidget,
          reason: 'very long original names are trimmed, never overflow',
        );
        expect(find.text('Original listo; aún no analizado'), findsOneWidget);
        final removeButton = tester.widget<IconButton>(
          find.ancestor(of: find.byTooltip('Retirar $longName'), matching: find.byType(IconButton)),
        );
        expect(removeButton.onPressed, isNotNull);
        expect(find.text('Cancelar lote'), findsOneWidget);
      },
    );

    testWidgets('uploading rows advertise visible transfer progress', (tester) async {
      const local = LocalAttachment(
        path: '/tmp/staged/documentos.xlsx',
        name: 'documentos.xlsx',
        byteSize: 4096,
      );
      final draft = AttachmentDraft(files: [
        draftFile(local, uploading: true, progress: 0.5),
      ]);

      await _pumpPanel(
        tester,
        _draftOverrides(draft),
        const AttachmentComposerPanel(disabled: false),
      );

      expect(
        find.text('50% transferido; esperando confirmación'),
        findsOneWidget,
      );
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      final removeButton = tester.widget<IconButton>(
        find.ancestor(of: find.byTooltip('Retirar documentos.xlsx'), matching: find.byType(IconButton)),
      );
      expect(removeButton.onPressed, isNotNull);
    });

    testWidgets(
      'failed rows expose a retry affordance and keep removal available',
      (tester) async {
        const local = LocalAttachment(
          path: '/tmp/staged/analisis.log',
          name: 'analisis.log',
          byteSize: 128,
        );
        final draft = AttachmentDraft(
          files: [
            draftFile(local, error: 'Archivo no disponible o sin acceso.'),
          ],
        );

        await _pumpPanel(
          tester,
          _draftOverrides(draft),
          const AttachmentComposerPanel(disabled: false),
        );

        final retryButton = tester.widget<IconButton>(
          find.ancestor(of: find.byTooltip('Reintentar analisis.log'), matching: find.byType(IconButton)),
        );
        expect(retryButton.onPressed, isNotNull);
        expect(find.text('Archivo no disponible o sin acceso.'), findsOneWidget);
        final removeButton = tester.widget<IconButton>(
          find.ancestor(of: find.byTooltip('Retirar analisis.log'), matching: find.byType(IconButton)),
        );
        expect(removeButton.onPressed, isNotNull);
      },
    );

    testWidgets(
      'locked drafts disable composer actions behind the pending submission',
      (tester) async {
        const local = LocalAttachment(
          path: '/tmp/staged/resumen.pdf',
          name: 'resumen.pdf',
          byteSize: 256,
        );
        final draft = AttachmentDraft(
          files: [
            draftFile(local, error: 'La instrucción queda pendiente de confirmación.'),
          ],
          locked: true,
          error:
              'No se confirmó el envío. Reintenta la misma instrucción: se recuperará la misma tarea sin duplicarla.',
        );

        await _pumpPanel(
          tester,
          _draftOverrides(draft),
          const AttachmentComposerPanel(disabled: false),
        );

        expect(
          find.text(
            'No se confirmó el envío. Reintenta la misma instrucción: se recuperará la misma tarea sin duplicarla.',
          ),
          findsOneWidget,
        );
        final pickFiles = tester.widget<TextButton>(
          find.ancestor(of: find.text('Archivos'), matching: find.byType(TextButton)),
        );
        expect(pickFiles.onPressed, isNull, reason: 'locked drafts reject new picks');
        final pickPhotos = tester.widget<TextButton>(
          find.ancestor(of: find.text('Fotos'), matching: find.byType(TextButton)),
        );
        expect(pickPhotos.onPressed, isNull);
        final retryButton = tester.widget<IconButton>(
          find.ancestor(of: find.byTooltip('Reintentar resumen.pdf'), matching: find.byType(IconButton)),
        );
        expect(retryButton.onPressed, isNull);
        final removeButton = tester.widget<IconButton>(
          find.ancestor(of: find.byTooltip('Retirar resumen.pdf'), matching: find.byType(IconButton)),
        );
        expect(removeButton.onPressed, isNull);
      },
    );

    testWidgets('unavailable capabilities keep the honest guidance visible', (tester) async {
      final draft = AttachmentDraft(
        capabilities: AttachmentCapabilities.fromJson(
          capabilitiesJson(
            available: false,
            unavailableReasons: ['worker_unavailable', 'profile_unverified'],
          ),
        ),
      );

      await _pumpPanel(
        tester,
        _draftOverrides(draft),
        const AttachmentComposerPanel(disabled: false),
      );

      expect(
        find.textContaining('worker_unavailable, profile_unverified'),
        findsOneWidget,
      );
      expect(find.textContaining('Puedes preparar originales'), findsOneWidget);
    });

    testWidgets('renders the policy guidance and the voice boundary hint', (tester) async {
      await _pumpPanel(
        tester,
        _draftOverrides(const AttachmentDraft()),
        const AttachmentComposerPanel(disabled: false),
      );

      expect(find.textContaining('Hasta 5 archivos · 20 MiB cada uno'), findsOneWidget);
      expect(find.textContaining('PDF, Office, texto, código e imágenes'), findsOneWidget);
    });
  });
}
