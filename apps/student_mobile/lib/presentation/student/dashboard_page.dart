import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);

    if (auth == null) return const SizedBox.shrink();

    return FutureBuilder(
      future: Future.wait([
        repo.listApprovedLessons(),
        repo.listProgress(auth.id),
        repo.listQuizAttempts(auth.id),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final lessons = snapshot.data![0] as List<Lesson>;
        final progress = snapshot.data![1] as List<ProgressRecord>;
        final attempts = snapshot.data![2] as List<QuizAttempt>;

        final progressByLesson = {for (final p in progress) p.lessonId: p};
        final continueLessons = lessons.where((l) => progressByLesson[l.id]?.completedAt == null && progressByLesson.containsKey(l.id)).toList();
        final recommended = lessons.take(8).toList();

        return RefreshIndicator(
          onRefresh: () async {
            await ref.read(mobileRepositoryProvider).syncNow(auth.id);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Hello, ${auth.displayName}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _MetricCard(title: 'Lessons', value: '${lessons.length}', subtitle: 'Approved and available'),
                  _MetricCard(title: 'Completed', value: '${progress.where((p) => p.completedAt != null).length}', subtitle: 'Lessons completed'),
                  _MetricCard(title: 'Quiz attempts', value: '${attempts.length}', subtitle: 'Self-tests done'),
                  _MetricCard(title: 'In progress', value: '${continueLessons.length}', subtitle: 'Continue learning'),
                ],
              ),
              const SizedBox(height: 16),
              _SectionCard(
                title: 'Continue learning',
                child: continueLessons.isEmpty
                    ? const Text('Start a lesson to see it here.')
                    : Column(
                        children: continueLessons
                            .take(3)
                            .map(
                              (lesson) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(lesson.title),
                                subtitle: Text('${lesson.subject} • ${lesson.level}'),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => context.go('/lessons/${lesson.id}'),
                              ),
                            )
                            .toList(),
                      ),
              ),
              const SizedBox(height: 16),
              _SectionCard(
                title: 'Recommended lessons',
                child: Column(
                  children: recommended
                      .map(
                        (lesson) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(lesson.title),
                          subtitle: Text('${lesson.subject} • ${lesson.language}'),
                          trailing: const Icon(Icons.play_circle_outline),
                          onTap: () => context.go('/lessons/${lesson.id}'),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.title, required this.value, required this.subtitle});

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 4),
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8), child]),
      ),
    );
  }
}
