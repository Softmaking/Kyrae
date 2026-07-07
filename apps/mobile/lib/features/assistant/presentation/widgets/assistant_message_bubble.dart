import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:kyrae_mobile/app/theme/app_theme.dart';
import 'package:kyrae_mobile/features/assistant/domain/entities/assistant_message.dart';

class AssistantMessageBubble extends StatelessWidget {
  const AssistantMessageBubble(this.message, {super.key});

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
            if (isUser)
              Text(
                message.content,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  height: 1.35,
                ),
              )
            else
              MarkdownBody(
                data: message.content,
                styleSheet: MarkdownStyleSheet(
                  h3: const TextStyle(
                    color: AppColors.slate900,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                  p: const TextStyle(
                    color: AppColors.slate800,
                    fontSize: 14,
                    height: 1.35,
                  ),
                  listBullet: const TextStyle(
                    color: AppColors.slate800,
                    fontSize: 14,
                  ),
                  code: const TextStyle(
                    color: AppColors.slate100,
                    fontSize: 12,
                    backgroundColor: AppColors.slate900,
                  ),
                  codeblockDecoration: BoxDecoration(
                    color: AppColors.slate900,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  codeblockPadding: const EdgeInsets.all(12),

                ),
              ),
          ],
        ),
      ),
    );
  }
}
