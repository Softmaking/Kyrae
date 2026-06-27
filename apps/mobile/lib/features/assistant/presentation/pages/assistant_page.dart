import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/app/di/providers.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';
import 'package:kyrae_mobile/core/lifecycle/app_lifecycle_provider.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

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
    if (!mounted) return;

    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (_scrollController.hasClients) {
      await _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(appLifecycleProvider);
    final state = ref.watch(assistantControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('Asistente')),
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
                  if (state.messages.isEmpty) const _EmptyState(),
                  ...state.messages.map(_MessageBubble.new),
                  if (state.isSending) const _ThinkingBubble(),
                  if (state.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: state.errorMessage!),
                  ],
                ],
              ),
            ),
            _MessageComposer(
              controller: _controller,
              isSending: state.isSending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
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
    required this.onSend,
  });

  final TextEditingController controller;
  final bool isSending;
  final VoidCallback onSend;

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
              enabled: !isSending,
              decoration: const InputDecoration(
                hintText: 'Escribe una instrucción...',
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            height: 52,
            width: 52,
            child: FilledButton(
              onPressed: isSending ? null : onSend,
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
