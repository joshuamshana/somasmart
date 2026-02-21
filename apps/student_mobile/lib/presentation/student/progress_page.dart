import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';

class ProgressPage extends ConsumerWidget {
  const ProgressPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    return FutureBuilder(
      future: Future.wait([
        repo.listProgress(auth.id),
        repo.listQuizAttempts(auth.id),
        repo.listApprovedLessons(),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        final progress = snapshot.data![0] as List<ProgressRecord>;
        final attempts = snapshot.data![1] as List<QuizAttempt>;
        final lessons = snapshot.data![2] as List<Lesson>;
        final lessonById = {for (final l in lessons) l.id: l};

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Expanded(child: Text('Progress', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
                FilledButton.tonal(
                  onPressed: () async {
                    final path = await repo.exportCsv(auth.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('CSV saved: $path')));
                    }
                  },
                  child: const Text('Export CSV'),
                ),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: () async {
                    final path = await repo.exportPdf(auth.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('PDF saved: $path')));
                    }
                  },
                  child: const Text('Export PDF'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: progress
                      .map(
                        (item) => ListTile(
                          title: Text(lessonById[item.lessonId]?.title ?? item.lessonId),
                          subtitle: Text('Time: ${(item.timeSpentSec / 60).round()} min • Last seen: ${_fmt(item.lastSeenAt)}'),
                          trailing: Text(item.completedAt != null ? 'Completed' : 'In progress'),
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Quiz attempts', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...attempts.map((a) => ListTile(title: Text('Quiz ${a.quizId}'), subtitle: Text(_fmt(a.createdAt)), trailing: Text('${a.score}%'))),
                  ],
                ),
              ),
            )
          ],
        );
      },
    );
  }

  static String _fmt(String value) {
    final dt = DateTime.tryParse(value);
    if (dt == null) return value;
    return DateFormat.yMMMd().add_jm().format(dt.toLocal());
  }
}
