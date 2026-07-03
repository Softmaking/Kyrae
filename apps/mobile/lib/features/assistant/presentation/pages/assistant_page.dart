import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';
import 'package:kyrae_mobile/core/lifecycle/app_lifecycle_provider.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';
import 'package:kyrae_mobile/features/assistant/presentation/providers/assistant_provider.dart';

class AssistantPage extends ConsumerStatefulWidget {
  const AssistantPage({super.key});

  @override
  ConsumerState<AssistantPage> createState() => _AssistantPageState();
}

class _AssistantPageState extends ConsumerState<AssistantPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(localNotificationServiceProvider).initialize();
      ref.read(assistantControllerProvider.notifier).loadSessions();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    _controller.clear();
    await ref.read(assistantControllerProvider.notifier).send(text);
    _scrollToBottom();
  }

  Future<void> _toggleVoiceRecording() async {
    final controller = ref.read(assistantControllerProvider.notifier);
    final state = ref.read(assistantControllerProvider);

    if (state.isRecording) {
      await controller.stopVoiceRecordingAndSend();
    } else {
      await controller.startVoiceRecording();
    }
    _scrollToBottom();
  }

  Future<void> _pauseSpokenResponse() async {
    await ref.read(assistantControllerProvider.notifier).pauseSpokenResponse();
  }

  Future<void> _resumeSpokenResponse() async {
    await ref.read(assistantControllerProvider.notifier).resumeSpokenResponse();
  }

  Future<void> _stopSpokenResponse() async {
    await ref.read(assistantControllerProvider.notifier).stopSpokenResponse();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _showHistory() async {
    await ref.read(assistantControllerProvider.notifier).loadSessions();
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _SessionHistorySheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(assistantControllerProvider, (previous, next) {
      final previousMessageCount = previous?.messages.length ?? 0;
      final messageCountChanged = previousMessageCount != next.messages.length;
      final sendingChanged = previous?.isSending != next.isSending;
      final historyChanged = previous?.conversationId != next.conversationId;

      if (messageCountChanged || sendingChanged || historyChanged) {
        _scrollToBottom();
      }
    });

    ref.watch(appLifecycleProvider);
    final state = ref.watch(assistantControllerProvider);
    final user = ref.watch(authControllerProvider).user;
    final canUseVoice = user?.permissions.contains('ASSISTANT_VOICE_USE') ?? false;
    final canUseVoiceOutput =
        user?.permissions.contains('ASSISTANT_VOICE_OUTPUT_USE') ?? false;

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: const Text('Asistente'),
        actions: [
          IconButton(
            tooltip: 'Historial',
            onPressed: _showHistory,
            icon: const Icon(Icons.history_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                children: [
                  const _AssistantHeader(),
                  const SizedBox(height: 16),
                  if (state.isLoadingHistory) const _HistoryLoadingBanner(),
                  if (state.messages.isEmpty) const _EmptyState(),
                  ...state.messages.map(_MessageBubble.new),
                  if (state.isRecording) const _VoiceStatusBubble(text: 'Grabando audio...'),
                  if (state.isTranscribing)
                    const _VoiceStatusBubble(text: 'Transcribiendo y enviando audio...'),
                  if (state.isSending) const _ThinkingBubble(),
                  if (state.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: state.errorMessage!),
                  ],
                ],
              ),
            ),
            if (canUseVoiceOutput)
              _VoiceOutputControls(
                isEnabled: state.isVoiceOutputEnabled,
                status: state.voiceOutputStatus,
                errorMessage: state.voiceOutputError,
                onToggle: () => ref
                    .read(assistantControllerProvider.notifier)
                    .toggleVoiceOutput(),
                onPause: _pauseSpokenResponse,
                onResume: _resumeSpokenResponse,
                onStop: _stopSpokenResponse,
              ),
            _MessageComposer(
              controller: _controller,
              isSending: state.isSending,
              isRecording: state.isRecording,
              isTranscribing: state.isTranscribing,
              canUseVoice: canUseVoice,
              onSend: _send,
              onVoice: _toggleVoiceRecording,
            ),
          ],
        ),
      ),
    );
  }
}

class _VoiceOutputControls extends StatelessWidget {
  const _VoiceOutputControls({
    required this.isEnabled,
    required this.status,
    required this.errorMessage,
    required this.onToggle,
    required this.onPause,
    required this.onResume,
    required this.onStop,
  });

  final bool isEnabled;
  final VoiceOutputStatus status;
  final String? errorMessage;
  final VoidCallback onToggle;
  final Future<void> Function() onPause;
  final Future<void> Function() onResume;
  final Future<void> Function() onStop;

  @override
  Widget build(BuildContext context) {
    final statusText = switch (status) {
      VoiceOutputStatus.synthesizing => 'Generando voz...',
      VoiceOutputStatus.playing => 'Reproduciendo respuesta...',
      VoiceOutputStatus.paused => 'Reproducción pausada.',
      VoiceOutputStatus.failed => errorMessage ?? 'No se pudo generar voz.',
      VoiceOutputStatus.idle => isEnabled
          ? 'Lista para leer la próxima respuesta.'
          : 'Respuesta hablada desactivada.',
    };

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      color: Colors.white,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.slate50,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.slate200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.volume_up_rounded, color: AppColors.brandPrimary, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Respuesta hablada',
                    style: TextStyle(
                      color: AppColors.slate900,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Switch(value: isEnabled, onChanged: (_) => onToggle()),
              ],
            ),
            Text(
              statusText,
              style: TextStyle(
                color: status == VoiceOutputStatus.failed
                    ? const Color(0xFFB91C1C)
                    : AppColors.slate600,
                fontSize: 12,
              ),
            ),
            if (status == VoiceOutputStatus.playing || status == VoiceOutputStatus.paused) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: status == VoiceOutputStatus.playing ? onPause : onResume,
                      icon: Icon(
                        status == VoiceOutputStatus.playing
                            ? Icons.pause_rounded
                            : Icons.play_arrow_rounded,
                      ),
                      label: Text(status == VoiceOutputStatus.playing ? 'Pausar' : 'Reanudar'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onStop,
                      icon: const Icon(Icons.stop_rounded),
                      label: const Text('Detener'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SessionHistorySheet extends ConsumerWidget {
  const _SessionHistorySheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(assistantControllerProvider);
    final controller = ref.read(assistantControllerProvider.notifier);

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.42,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.slate300,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Historial',
                      style: TextStyle(
                        color: AppColors.slate900,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      controller.newSession();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Nueva'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (state.isLoadingSessions)
                const _SessionLoadingItem()
              else if (state.sessions.isEmpty)
                const _EmptySessionsItem()
              else
                ...state.sessions.map(
                  (session) => _SessionListItem(
                    session: session,
                    isActive: state.conversationId == session.id,
                    onTap: () async {
                      await controller.openSession(session);
                      if (context.mounted) Navigator.of(context).pop();
                    },
                  ),
                ),
              if (state.sessionsNextCursor != null) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: state.isLoadingMoreSessions
                        ? null
                        : () => controller.loadMoreSessions(),
                    child: Text(
                      state.isLoadingMoreSessions ? 'Cargando...' : 'Ver más',
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _SessionListItem extends StatelessWidget {
  const _SessionListItem({
    required this.session,
    required this.isActive,
    required this.onTap,
  });

  final AssistantSession session;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final lastDate = session.lastMessageAt ?? session.updatedAt;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isActive ? AppColors.brandSoft : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isActive ? AppColors.brandPrimary : AppColors.slate200,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                session.title?.isNotEmpty == true
                    ? session.title!
                    : 'Sin título',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.slate900,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(
                    '${session.messageCount} mensajes',
                    style: const TextStyle(
                      color: AppColors.slate500,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('·', style: TextStyle(color: AppColors.slate400)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _formatShortDate(lastDate),
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        color: AppColors.slate400,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SessionLoadingItem extends StatelessWidget {
  const _SessionLoadingItem();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 24),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

class _EmptySessionsItem extends StatelessWidget {
  const _EmptySessionsItem();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200),
      ),
      child: const Text(
        'Todavía no hay conversaciones guardadas.',
        textAlign: TextAlign.center,
        style: TextStyle(color: AppColors.slate500, fontSize: 13),
      ),
    );
  }
}

class _HistoryLoadingBanner extends StatelessWidget {
  const _HistoryLoadingBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate200),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 10),
          Text(
            'Cargando historial...',
            style: TextStyle(color: AppColors.slate600, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

String _formatShortDate(DateTime value) {
  final local = value.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');

  return '$day/$month $hour:$minute';
}

class _AssistantHeader extends StatelessWidget {
  const _AssistantHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate200.withValues(alpha: 0.5),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ASISTENTE',
            style: TextStyle(
              color: AppColors.brandPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 2.4,
            ),
          ),
          SizedBox(height: 12),
          Text(
            'Centro de conversación',
            style: TextStyle(
              color: AppColors.slate900,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Envía instrucciones por texto. Kyrae mantiene seguridad, permisos e historial desde el backend.',
            style: TextStyle(
              color: AppColors.slate600,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.slate200),
      ),
      child: const Column(
        children: [
          Icon(Icons.chat_bubble_outline, color: AppColors.brandPrimary),
          SizedBox(height: 10),
          Text(
            'Inicia una conversación con el asistente',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.slate900,
              fontWeight: FontWeight.w700,
            ),
          ),
          SizedBox(height: 6),
          Text(
            'Escribe una instrucción y espera la respuesta en pantalla.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.slate500, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble(this.message);

  final AssistantMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == AssistantMessageRole.user;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 310),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? AppColors.blue600 : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: isUser ? null : Border.all(color: AppColors.slate200),
          boxShadow: [
            BoxShadow(
              color: AppColors.slate200.withValues(alpha: 0.45),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? 'Tú' : 'Asistente',
              style: TextStyle(
                color: isUser ? Colors.white70 : AppColors.slate500,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.content,
              style: TextStyle(
                color: isUser ? Colors.white : AppColors.slate800,
                fontSize: 14,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThinkingBubble extends StatelessWidget {
  const _ThinkingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.slate200),
        ),
        child: const Text(
          'El asistente está procesando la instrucción...',
          style: TextStyle(color: AppColors.slate600, fontSize: 13),
        ),
      ),
    );
  }
}

class _VoiceStatusBubble extends StatelessWidget {
  const _VoiceStatusBubble({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.brandSoft,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.brandPrimary.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.mic_rounded, color: AppColors.brandPrimary, size: 18),
            const SizedBox(width: 8),
            Text(text, style: const TextStyle(color: AppColors.slate700, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
      ),
    );
  }
}

class _MessageComposer extends StatelessWidget {
  const _MessageComposer({
    required this.controller,
    required this.isSending,
    required this.isRecording,
    required this.isTranscribing,
    required this.canUseVoice,
    required this.onSend,
    required this.onVoice,
  });

  final TextEditingController controller;
  final bool isSending;
  final bool isRecording;
  final bool isTranscribing;
  final bool canUseVoice;
  final VoidCallback onSend;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.slate200)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              enabled: !isSending && !isRecording && !isTranscribing,
              decoration: const InputDecoration(
                hintText: 'Escribe una instrucción...',
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 10),
          if (canUseVoice) ...[
            SizedBox(
              height: 52,
              width: 52,
              child: OutlinedButton(
                onPressed: isSending || isTranscribing ? null : onVoice,
                style: OutlinedButton.styleFrom(
                  padding: EdgeInsets.zero,
                  side: BorderSide(
                    color: isRecording ? AppColors.brandPrimary : AppColors.slate300,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Icon(
                  isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                  color: isRecording ? AppColors.brandPrimary : AppColors.slate600,
                ),
              ),
            ),
            const SizedBox(width: 10),
          ],
          SizedBox(
            height: 52,
            width: 52,
            child: FilledButton(
              onPressed: isSending || isRecording || isTranscribing ? null : onSend,
              style: FilledButton.styleFrom(
                padding: EdgeInsets.zero,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: isSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ),
        ],
      ),
    );
  }
}
