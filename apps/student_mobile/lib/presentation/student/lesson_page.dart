import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:just_audio/just_audio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/domain/repositories.dart';
import 'package:uuid/uuid.dart';
import 'package:video_player/video_player.dart';

class LessonPage extends ConsumerStatefulWidget {
  const LessonPage({super.key, required this.lessonId});

  final String lessonId;

  @override
  ConsumerState<LessonPage> createState() => _LessonPageState();
}

class _LessonPageState extends ConsumerState<LessonPage> {
  int currentStep = 0;
  final selectedAnswers = <String, int>{};
  int? quizScore;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    return FutureBuilder(
      future: Future.wait([
        repo.listApprovedLessons(),
        repo.getLessonSteps(widget.lessonId),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator()));

        final lessons = snapshot.data![0] as List<Lesson>;
        final steps = snapshot.data![1] as List<LessonStep>;
        final lesson = lessons.where((l) => l.id == widget.lessonId).firstOrNull;

        if (lesson == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Lesson unavailable')));
        }

        return FutureBuilder<LessonAccess>(
          future: repo.canAccessLesson(studentId: auth.id, lesson: lesson),
          builder: (context, accessSnapshot) {
            if (!accessSnapshot.hasData) {
              return Scaffold(appBar: AppBar(title: Text(lesson.title)), body: const Center(child: CircularProgressIndicator()));
            }

            final access = accessSnapshot.data!;
            if (!access.allowed) {
              return Scaffold(
                appBar: AppBar(title: Text(lesson.title)),
                body: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(access.reason ?? 'Lesson locked', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 12),
                          const Text('Redeem a coupon or voucher to unlock this lesson.'),
                          const SizedBox(height: 16),
                          FilledButton(onPressed: () => context.go('/payments'), child: const Text('Go to payments')),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }

            if (steps.isEmpty) {
              return Scaffold(appBar: AppBar(title: Text(lesson.title)), body: const Center(child: Text('No lesson content available.')));
            }

            final step = steps[currentStep.clamp(0, steps.length - 1)];

            return Scaffold(
              appBar: AppBar(title: Text(lesson.title)),
              body: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LinearProgressIndicator(value: (currentStep + 1) / steps.length),
                    const SizedBox(height: 12),
                    Text('Step ${currentStep + 1} of ${steps.length}', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 8),
                    Text(step.title, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 12),
                    Expanded(child: _buildStepContent(context, auth.id, step, repo)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        OutlinedButton(
                          onPressed: currentStep == 0 ? null : () => setState(() => currentStep -= 1),
                          child: const Text('Back'),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () async {
                            if (step.isQuiz && !await _handleQuiz(auth.id, step, repo)) return;

                            if (currentStep < steps.length - 1) {
                              setState(() => currentStep += 1);
                              return;
                            }

                            final progress = ProgressRecord(
                              id: 'prog_${const Uuid().v4()}',
                              studentId: auth.id,
                              lessonId: widget.lessonId,
                              timeSpentSec: 600,
                              lastSeenAt: nowIso(),
                              completedAt: nowIso(),
                            );
                            await repo.upsertProgress(progress);
                            if (!mounted) return;
                            context.go('/progress');
                          },
                          child: Text(currentStep == steps.length - 1 ? 'Finish lesson' : 'Next'),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStepContent(BuildContext context, String studentId, LessonStep step, AppRepository repo) {
    if (step.isMedia && step.media != null) {
      return _LessonMediaView(media: step.media!);
    }

    if (!step.isQuiz) {
      return SingleChildScrollView(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(step.text ?? 'Content unavailable for ${step.type}.', style: Theme.of(context).textTheme.bodyLarge),
          ),
        ),
      );
    }

    final quiz = step.quiz!;
    return ListView(
      children: [
        Text('Quiz gate (${quiz.passScorePct}% required)', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        ...quiz.questions.map(
          (question) => Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(question.prompt, style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  ...List.generate(
                    question.options.length,
                    (index) => RadioListTile<int>(
                      value: index,
                      groupValue: selectedAnswers[question.id],
                      onChanged: (value) => setState(() => selectedAnswers[question.id] = value ?? 0),
                      title: Text(question.options[index]),
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
        if (quizScore != null) Text('Latest score: $quizScore%', style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }

  Future<bool> _handleQuiz(String studentId, LessonStep step, AppRepository repo) async {
    final quiz = step.quiz!;
    if (quiz.questions.any((q) => selectedAnswers[q.id] == null)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Answer all quiz questions first.')));
      return false;
    }

    var correct = 0;
    for (final q in quiz.questions) {
      if (selectedAnswers[q.id] == q.correctOptionIndex) correct += 1;
    }

    final score = ((correct / quiz.questions.length) * 100).round();
    setState(() => quizScore = score);

    await repo.saveQuizAttempt(QuizAttempt(
      id: 'qa_${const Uuid().v4()}',
      studentId: studentId,
      quizId: quiz.id,
      score: score,
      createdAt: nowIso(),
    ));

    if (score < quiz.passScorePct) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Score $score%. Minimum ${quiz.passScorePct}% required. Retry.')),
      );
      return false;
    }

    return true;
  }
}

class _LessonMediaView extends StatefulWidget {
  const _LessonMediaView({required this.media});

  final LessonMedia media;

  @override
  State<_LessonMediaView> createState() => _LessonMediaViewState();
}

class _LessonMediaViewState extends State<_LessonMediaView> {
  AudioPlayer? _audioPlayer;
  VideoPlayerController? _videoController;
  bool _videoReady = false;

  @override
  void initState() {
    super.initState();
    _initMedia();
  }

  Future<void> _initMedia() async {
    final path = widget.media.localPath;
    if (path == null || path.isEmpty) return;

    if (widget.media.kind == 'audio') {
      final player = AudioPlayer();
      await player.setFilePath(path);
      setState(() {
        _audioPlayer = player;
      });
      return;
    }

    if (widget.media.kind == 'video') {
      final controller = VideoPlayerController.file(File(path));
      await controller.initialize();
      setState(() {
        _videoController = controller;
        _videoReady = true;
      });
    }
  }

  @override
  void dispose() {
    _audioPlayer?.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = widget.media;
    final filePath = media.localPath;

    if (filePath == null || filePath.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${media.kind.toUpperCase()} asset', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text('${media.name}\nAsset is not cached yet. Sync to download lesson blobs.'),
            ],
          ),
        ),
      );
    }

    if (media.kind == 'image') {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Image.file(File(filePath), fit: BoxFit.contain),
        ),
      );
    }

    if (media.kind == 'audio') {
      final player = _audioPlayer;
      if (player == null) {
        return const Center(child: CircularProgressIndicator());
      }

      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: StreamBuilder<PlayerState>(
            stream: player.playerStateStream,
            builder: (context, snapshot) {
              final state = snapshot.data;
              final playing = state?.playing ?? false;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(media.name, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      FilledButton.icon(
                        onPressed: () async {
                          if (playing) {
                            await player.pause();
                          } else {
                            await player.play();
                          }
                        },
                        icon: Icon(playing ? Icons.pause : Icons.play_arrow),
                        label: Text(playing ? 'Pause' : 'Play'),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      );
    }

    if (media.kind == 'video') {
      if (!_videoReady || _videoController == null) {
        return const Center(child: CircularProgressIndicator());
      }

      return Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              AspectRatio(
                aspectRatio: _videoController!.value.aspectRatio,
                child: VideoPlayer(_videoController!),
              ),
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: () {
                  if (_videoController!.value.isPlaying) {
                    _videoController!.pause();
                  } else {
                    _videoController!.play();
                  }
                  setState(() {});
                },
                icon: Icon(_videoController!.value.isPlaying ? Icons.pause : Icons.play_arrow),
                label: Text(_videoController!.value.isPlaying ? 'Pause' : 'Play'),
              ),
            ],
          ),
        ),
      );
    }

    if (media.kind == 'pdf' || media.kind == 'pptx') {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(media.name, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () => OpenFilex.open(filePath),
                child: Text('Open ${media.kind.toUpperCase()}'),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text('Unsupported media type: ${media.kind}'),
      ),
    );
  }
}
