import 'package:flutter_test/flutter_test.dart';
import 'package:kyrae_mobile/features/assistant/data/models/assistant_message_model.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

import '../../../../helpers/assistant_attachment_fixtures.dart';

void main() {
  group('AssistantMessageModel tolerant readers', () {
    test('legacy assistant_message rows without attachment fields default safely', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm1',
        'sessionId': 'sess-1',
        'role': 'user',
        'content': 'Resumir el informe',
        'createdAt': '2026-10-01T10:00:00.000Z',
      });

      expect(message.id, 'm1');
      expect(message.conversationId, 'sess-1');
      expect(message.role, AssistantMessageRole.user);
      expect(message.attachments, isEmpty);
      expect(message.contextManifest, isNull);
      expect(message.partialOutput, isNull);
      expect(message.partialOutputReason, isNull);
      expect(message.partialOutputNotice, isNull);
      expect(message.outputAccounting, isNull);
    });

    test('legacy rows keep the conversationId alias working', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm2',
        'conversationId': 'conv-legacy',
        'role': 'assistant',
        'content': 'Listo',
        'createdAt': '2026-10-01T10:01:00.000Z',
      });

      expect(message.conversationId, 'conv-legacy');
      expect(message.attachments, isEmpty);
    });

    test('canonical rows parse attachments with coverage and omissions', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm3',
        'sessionId': 'sess-1',
        'role': 'assistant',
        'content': 'Aquí está el resumen',
        'createdAt': '2026-10-01T10:02:00.000Z',
        'attachments': [
          attachmentJson(
            id: 'att-1',
            clientFileId: 'cf-1',
            messageId: 'm3',
            sessionId: 'sess-1',
            processingStatus: 'partial',
            thumbnailAvailable: true,
            coverage: coverageJson(
              status: 'partial',
              summary: 'Extracción parcial',
              included: [
                {'kind': 'pages', 'start': 1, 'end': 2},
              ],
              omitted: [
                {
                  'locator': {'kind': 'pages', 'start': 3, 'end': 5},
                  'reason': 'processing_limit',
                  'message': 'presupuesto de página',
                },
              ],
              truncated: true,
            ),
          ),
        ],
      });

      expect(message.attachments.single.id, 'att-1');
      expect(message.attachments.single.messageId, 'm3');
      final coverage = message.attachments.single.coverage!;
      expect(coverage.status, 'partial');
      expect(coverage.summary, 'Extracción parcial');
      expect(coverage.included.single, {
        'kind': 'pages',
        'start': 1,
        'end': 2,
      });
      final omission = coverage.omitted.single;
      expect(omission['reason'], 'processing_limit');
      expect(omission['message'], 'presupuesto de página');
      expect(coverage.truncated, isTrue);
    });

    test('partial output metadata survives sync/task/history wire shapes', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm4',
        'sessionId': 'sess-1',
        'role': 'assistant',
        'content': 'Respuesta parcial…',
        'createdAt': '2026-10-01T10:03:00.000Z',
        'partialOutput': true,
        'partialOutputReason': 'output_text_limit',
        'partialOutputNotice': 'El límite de salida recortó la respuesta.',
        'outputAccounting': {
          'mode': 'utf16_units',
          'limit': 16000,
          'returnedUnits': 15998,
        },
      });

      expect(message.partialOutput, isTrue);
      expect(message.partialOutputReason, 'output_text_limit');
      expect(message.partialOutputNotice, 'El límite de salida recortó la respuesta.');
      expect(message.outputAccounting!['mode'], 'utf16_units');
      expect(message.outputAccounting!['returnedUnits'], 15998);
    });

    test('null partialOutput flags keep absent metadata rather than asserting completeness', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm5',
        'sessionId': 'sess-1',
        'role': 'assistant',
        'content': 'Completa',
        'createdAt': '2026-10-01T10:04:00.000Z',
        'partialOutput': false,
      });

      expect(message.partialOutput, isFalse);
      expect(message.partialOutputReason, isNull);
    });

    test('unknown role strings degrade to assistant without crashing', () {
      final message = AssistantMessageModel.fromJson({
        'id': 'm6',
        'sessionId': 'sess-1',
        'role': 'unfamiliar-role',
        'content': 'datos',
        'createdAt': '2026-10-01T10:05:00.000Z',
      });

      expect(message.role, AssistantMessageRole.assistant);
    });
  });

  group('AssistantMessageTaskModel tolerant readers', () {
    test('pending tasks parse without an assistant message or attachments', () {
      final task = AssistantMessageTaskModel.fromJson({
        'id': 'task-1',
        'status': 'pending',
        'sessionId': 'sess-1',
        'userMessage': {
          'id': 'mu-1',
          'sessionId': 'sess-1',
          'role': 'user',
          'content': 'cifras',
          'createdAt': '2026-10-01T10:00:00.000Z',
        },
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T10:00:01.000Z',
      });

      expect(task.status, AssistantTaskStatus.pending);
      expect(task.assistantMessage, isNull);
      expect(task.errorMessage, isNull);
      expect(task.completedAt, isNull);
      expect(task.userMessage.attachments, isEmpty);
    });

    test('completed attachments-backed tasks keep canonical metadata', () {
      final task = AssistantMessageTaskModel.fromJson({
        'id': 'task-2',
        'status': 'completed',
        'sessionId': 'sess-1',
        'userMessage': {
          'id': 'mu-2',
          'sessionId': 'sess-1',
          'role': 'user',
          'content': 'cifras',
          'createdAt': '2026-10-01T10:00:00.000Z',
          'attachments': [
            attachmentJson(
              id: 'att-1',
              clientFileId: 'cf-1',
              messageId: 'mu-2',
              sessionId: 'sess-1',
            ),
          ],
        },
        'assistantMessage': {
          'id': 'ma-2',
          'sessionId': 'sess-1',
          'role': 'assistant',
          'content': 'Resumen listo',
          'createdAt': '2026-10-01T10:00:05.000Z',
          'partialOutput': true,
          'partialOutputReason': 'output_token_limit',
          'outputAccounting': {
            'mode': 'utf16_units',
            'limit': 16000,
            'returnedUnits': 16001,
          },
        },
        'errorMessage': null,
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T10:00:06.000Z',
        'completedAt': '2026-10-01T10:00:06.000Z',
      });

      expect(task.status, AssistantTaskStatus.completed);
      expect(task.userMessage.attachments.single.id, 'att-1');
      expect(task.assistantMessage!.partialOutput, isTrue);
      expect(task.assistantMessage!.partialOutputReason, 'output_token_limit');
      expect(task.completedAt!.year, 2026);
    });

    test('failed tasks surface their stable error message', () {
      final task = AssistantMessageTaskModel.fromJson({
        'id': 'task-3',
        'status': 'failed',
        'sessionId': 'sess-1',
        'userMessage': {
          'id': 'mu-3',
          'sessionId': 'sess-1',
          'role': 'user',
          'content': 'cifras',
          'createdAt': '2026-10-01T10:00:00.000Z',
        },
        'errorMessage': 'ATTACHMENT_PROCESSING_FAILED',
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T10:00:03.000Z',
      });

      expect(task.status, AssistantTaskStatus.failed);
      expect(task.errorMessage, 'ATTACHMENT_PROCESSING_FAILED');
    });

    test('unknown task statuses degrade to failed without crashing', () {
      final task = AssistantMessageTaskModel.fromJson({
        'id': 'task-4',
        'status': 'not-a-known-phase',
        'sessionId': 'sess-1',
        'userMessage': {
          'id': 'mu-4',
          'sessionId': 'sess-1',
          'role': 'user',
          'content': 'cifras',
          'createdAt': '2026-10-01T10:00:00.000Z',
        },
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T10:00:01.000Z',
      });

      expect(task.status, AssistantTaskStatus.failed);
    });

    test('legacy conversationId alias still identifies the session', () {
      final task = AssistantMessageTaskModel.fromJson({
        'id': 'task-5',
        'status': 'running',
        'conversationId': 'conv-legacy',
        'userMessage': {
          'id': 'mu-5',
          'conversationId': 'conv-legacy',
          'role': 'user',
          'content': 'cifras',
          'createdAt': '2026-10-01T10:00:00.000Z',
        },
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T10:00:01.000Z',
      });

      expect(task.status, AssistantTaskStatus.running);
      expect(task.conversationId, 'conv-legacy');
    });
  });
}
