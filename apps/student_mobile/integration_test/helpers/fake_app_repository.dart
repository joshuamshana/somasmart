import 'dart:async';

import 'package:flutter/material.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/domain/repositories.dart';
import 'package:uuid/uuid.dart';

class FakeAppRepository implements AppRepository {
  FakeAppRepository() {
    _seed();
  }

  final _uuid = const Uuid();

  AppUser? _currentUser;
  ThemeMode _themeMode = ThemeMode.system;
  final List<Lesson> _lessons = [];
  final Map<String, List<LessonStep>> _stepsByLesson = {};
  final List<ProgressRecord> _progress = [];
  final List<QuizAttempt> _attempts = [];
  final List<NotificationItem> _notifications = [];
  final List<MessageItem> _messages = [];
  final Set<String> _unlockedLessons = {};
  final List<CurriculumNode> _levels = [];
  final List<CurriculumNode> _classes = [];
  final List<CurriculumNode> _subjects = [];

  final _syncController = StreamController<SyncStatus>.broadcast();
  SyncStatus _sync = const SyncStatus(lastSyncAt: null, queuedCount: 0, failedCount: 0, running: false);

  void _seed() {
    _levels.add(const CurriculumNode(id: 'lvl_primary', name: 'Primary'));
    _classes.add(const CurriculumNode(id: 'class_p3', name: 'Class 3', parentId: 'lvl_primary'));
    _subjects.add(const CurriculumNode(id: 'sub_math', name: 'Mathematics', parentId: 'class_p3'));
    _subjects.add(const CurriculumNode(id: 'sub_science', name: 'Science', parentId: 'class_p3'));

    _lessons.addAll([
      Lesson(
        id: 'lesson_seed_numbers',
        title: 'Numbers Basics',
        description: 'Understand whole numbers.',
        subject: 'Mathematics',
        level: 'Primary',
        language: 'en',
        status: 'approved',
        updatedAt: nowIso(),
        curriculumLevelId: 'lvl_primary',
        curriculumClassId: 'class_p3',
        curriculumSubjectId: 'sub_math',
        accessPolicy: 'free',
      ),
      Lesson(
        id: 'lesson_seed_science_locked',
        title: 'Science Explorer',
        description: 'Discover plants and life.',
        subject: 'Science',
        level: 'Primary',
        language: 'en',
        status: 'approved',
        updatedAt: nowIso(),
        curriculumLevelId: 'lvl_primary',
        curriculumClassId: 'class_p3',
        curriculumSubjectId: 'sub_science',
        accessPolicy: 'coupon',
      ),
    ]);

    _stepsByLesson['lesson_seed_numbers'] = [
      const LessonStep(key: 'step1', type: 'text', title: 'Introduction', text: 'What are numbers?'),
      LessonStep(
        key: 'step2',
        type: 'quiz',
        title: 'Quick check',
        quiz: LessonQuiz(
          id: 'quiz_numbers',
          passScorePct: 60,
          questions: const [
            QuizQuestion(id: 'q1', prompt: 'What comes after 4?', options: ['3', '5', '7', '2'], correctOptionIndex: 1),
            QuizQuestion(id: 'q2', prompt: 'How many apples are in a pair?', options: ['1', '2', '3', '4'], correctOptionIndex: 1),
          ],
        ),
      ),
    ];

    _stepsByLesson['lesson_seed_science_locked'] = [
      const LessonStep(key: 's1', type: 'text', title: 'Plants', text: 'Plants make food through photosynthesis.'),
    ];

    _notifications.add(NotificationItem(
      id: 'n1',
      title: 'Welcome to SomaSmart',
      body: 'Your student dashboard is ready.',
      createdAt: nowIso(),
    ));
  }

  @override
  Future<AppUser?> getCurrentUser() async => _currentUser;

  @override
  Future<AuthSession> login({required String username, required String password}) async {
    final user = _currentUser ??
        AppUser(
          id: 'student_1',
          username: username,
          displayName: 'Student User',
          role: 'student',
          status: 'active',
          isMinor: false,
        );
    _currentUser = user;
    return AuthSession(accessToken: 'token', refreshToken: 'refresh', user: user);
  }

  @override
  Future<AppUser> register(RegisterInput input) async {
    _currentUser = AppUser(
      id: 'student_${_uuid.v4()}',
      username: input.username,
      displayName: input.displayName,
      role: 'student',
      status: 'active',
      schoolId: input.schoolCode,
      isMinor: input.isMinor,
    );
    return _currentUser!;
  }

  @override
  Future<void> logout() async {
    _currentUser = null;
  }

  @override
  Future<List<Lesson>> listApprovedLessons() async => _lessons;

  @override
  Future<List<CurriculumNode>> listLevels() async => _levels;

  @override
  Future<List<CurriculumNode>> listClasses() async => _classes;

  @override
  Future<List<CurriculumNode>> listSubjects() async => _subjects;

  @override
  Future<List<ProgressRecord>> listProgress(String studentId) async => _progress.where((p) => p.studentId == studentId).toList();

  @override
  Future<List<QuizAttempt>> listQuizAttempts(String studentId) async => _attempts.where((a) => a.studentId == studentId).toList();

  @override
  Future<List<NotificationItem>> listNotifications(String userId) async => _notifications;

  @override
  Future<void> markNotificationRead(String notificationId) async {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index == -1) return;
    final current = _notifications[index];
    _notifications[index] = NotificationItem(
      id: current.id,
      title: current.title,
      body: current.body,
      createdAt: current.createdAt,
      readAt: nowIso(),
    );
  }

  @override
  Future<void> markAllNotificationsRead(String userId) async {
    for (var i = 0; i < _notifications.length; i++) {
      final current = _notifications[i];
      _notifications[i] = NotificationItem(
        id: current.id,
        title: current.title,
        body: current.body,
        createdAt: current.createdAt,
        readAt: nowIso(),
      );
    }
  }

  @override
  Future<List<MessageItem>> listMessages(String userId, String peerId) async {
    return _messages
        .where((m) => (m.fromUserId == userId && m.toUserId == peerId) || (m.fromUserId == peerId && m.toUserId == userId))
        .toList();
  }

  @override
  Future<void> sendMessage(MessageItem message) async {
    _messages.add(message);
  }

  @override
  Future<void> recordPayment({required String studentId, required String reference, required String method}) async {
    _sync = SyncStatus(
      lastSyncAt: _sync.lastSyncAt,
      queuedCount: _sync.queuedCount + 1,
      failedCount: _sync.failedCount,
      running: false,
    );
    _syncController.add(_sync);
  }

  @override
  Future<String> redeemCoupon({required String studentId, required CouponRedemptionInput input}) async {
    if (input.code.trim().toUpperCase() != 'FREE30') return 'Invalid code.';
    _unlockedLessons.add('lesson_seed_science_locked');
    return 'Access unlocked offline.';
  }

  @override
  Future<List<LessonStep>> getLessonSteps(String lessonId) async => _stepsByLesson[lessonId] ?? const [];

  @override
  Future<void> upsertProgress(ProgressRecord progress) async {
    final idx = _progress.indexWhere((p) => p.id == progress.id);
    if (idx == -1) {
      _progress.add(progress);
    } else {
      _progress[idx] = progress;
    }
  }

  @override
  Future<void> saveQuizAttempt(QuizAttempt attempt) async {
    _attempts.add(attempt);
  }

  @override
  Future<String> exportCsv(String studentId) async => '/tmp/somasmart_progress.csv';

  @override
  Future<String> exportPdf(String studentId) async => '/tmp/somasmart_progress.pdf';

  @override
  Future<LessonAccess> canAccessLesson({required String studentId, required Lesson lesson}) async {
    final policy = lesson.accessPolicy ?? 'free';
    if (policy == 'free') return const LessonAccess(allowed: true);
    if (_unlockedLessons.contains(lesson.id)) return const LessonAccess(allowed: true);
    return const LessonAccess(allowed: false, reason: 'Locked. Redeem a coupon or voucher to unlock this lesson.');
  }

  @override
  Future<SyncStatus> getStatus() async => _sync;

  @override
  Future<void> syncNow(String? currentUserId) async {
    _sync = SyncStatus(lastSyncAt: _sync.lastSyncAt, queuedCount: _sync.queuedCount, failedCount: _sync.failedCount, running: true);
    _syncController.add(_sync);
    await Future<void>.delayed(const Duration(milliseconds: 20));
    _sync = SyncStatus(lastSyncAt: nowIso(), queuedCount: 0, failedCount: 0, running: false);
    _syncController.add(_sync);
  }

  @override
  Stream<SyncStatus> watchStatus() async* {
    yield _sync;
    yield* _syncController.stream;
  }

  @override
  Future<ThemeMode> getThemeMode() async => _themeMode;

  @override
  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
  }

  void setCurrentUserForTest(AppUser user) {
    _currentUser = user;
  }

  ThemeMode get currentThemeMode => _themeMode;

  AppUser? get currentUser => _currentUser;

  void dispose() {
    _syncController.close();
  }
}
