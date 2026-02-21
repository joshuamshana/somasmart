import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/domain/repositories.dart';

class LessonsPage extends ConsumerStatefulWidget {
  const LessonsPage({super.key});

  @override
  ConsumerState<LessonsPage> createState() => _LessonsPageState();
}

class _LessonsPageState extends ConsumerState<LessonsPage> {
  String query = '';
  String levelId = '';
  String classId = '';
  String subjectId = '';
  String language = '';

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    return FutureBuilder(
      future: Future.wait([
        repo.listApprovedLessons(),
        repo.listLevels(),
        repo.listClasses(),
        repo.listSubjects(),
        repo.listProgress(auth.id),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        final lessons = snapshot.data![0] as List<Lesson>;
        final levels = snapshot.data![1] as List<CurriculumNode>;
        final classes = snapshot.data![2] as List<CurriculumNode>;
        final subjects = snapshot.data![3] as List<CurriculumNode>;
        final progress = snapshot.data![4] as List<ProgressRecord>;

        return FutureBuilder<Map<String, LessonAccess>>(
          future: _buildAccessMap(repo, auth.id, lessons),
          builder: (context, accessSnapshot) {
            final accessMap = accessSnapshot.data ?? <String, LessonAccess>{};
            final progressByLesson = {for (final p in progress) p.lessonId: p};

            final classesForLevel = levelId.isEmpty ? <CurriculumNode>[] : classes.where((c) => c.parentId == levelId).toList();
            final subjectsForClass = classId.isEmpty ? <CurriculumNode>[] : subjects.where((s) => s.parentId == classId).toList();

            final filtered = lessons.where((lesson) {
              if (levelId.isNotEmpty && lesson.curriculumLevelId != levelId) return false;
              if (classId.isNotEmpty && lesson.curriculumClassId != classId) return false;
              if (subjectId.isNotEmpty && lesson.curriculumSubjectId != subjectId) return false;
              if (language.isNotEmpty && lesson.language != language) return false;
              if (query.isNotEmpty) {
                final blob = '${lesson.title} ${lesson.description} ${lesson.subject}'.toLowerCase();
                if (!blob.contains(query.toLowerCase())) return false;
              }
              return true;
            }).toList();

            final languages = lessons.map((l) => l.language).toSet().toList()..sort();

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Lessons', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                TextField(
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Search lessons'),
                  onChanged: (value) => setState(() => query = value),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: levelId.isEmpty ? null : levelId,
                        decoration: const InputDecoration(labelText: 'Level'),
                        items: levels.map((l) => DropdownMenuItem(value: l.id, child: Text(l.name))).toList(),
                        onChanged: (value) => setState(() {
                          levelId = value ?? '';
                          classId = '';
                          subjectId = '';
                        }),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: classId.isEmpty ? null : classId,
                        decoration: const InputDecoration(labelText: 'Class'),
                        items: classesForLevel.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                        onChanged: (value) => setState(() {
                          classId = value ?? '';
                          subjectId = '';
                        }),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: subjectId.isEmpty ? null : subjectId,
                        decoration: const InputDecoration(labelText: 'Subject'),
                        items: subjectsForClass.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                        onChanged: (value) => setState(() => subjectId = value ?? ''),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: language.isEmpty ? null : language,
                        decoration: const InputDecoration(labelText: 'Language'),
                        items: languages.map((lng) => DropdownMenuItem(value: lng, child: Text(lng))).toList(),
                        onChanged: (value) => setState(() => language = value ?? ''),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('${filtered.length} lessons shown', style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 8),
                ...filtered.map(
                  (lesson) {
                    final progress = progressByLesson[lesson.id];
                    final stateLabel = progress == null ? 'New' : progress.completedAt == null ? 'In progress' : 'Completed';
                    final access = accessMap[lesson.id] ?? const LessonAccess(allowed: true);
                    final cta = !access.allowed ? 'Unlock' : progress == null ? 'Start' : progress.completedAt == null ? 'Continue' : 'Replay';
                    return Card(
                      child: ListTile(
                        title: Text(lesson.title),
                        subtitle: Text('${lesson.subject} • ${lesson.level} • ${lesson.language} • $stateLabel'),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: access.allowed ? Colors.green.withValues(alpha: 0.15) : Colors.orange.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(access.allowed ? 'Available' : 'Locked', style: const TextStyle(fontSize: 11)),
                            ),
                            const SizedBox(height: 4),
                            Text(cta),
                          ],
                        ),
                        onTap: () => context.go('/lessons/${lesson.id}'),
                      ),
                    );
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<Map<String, LessonAccess>> _buildAccessMap(AppRepository repo, String studentId, List<Lesson> lessons) async {
    final map = <String, LessonAccess>{};
    for (final lesson in lessons) {
      map[lesson.id] = await repo.canAccessLesson(studentId: studentId, lesson: lesson);
    }
    return map;
  }
}
