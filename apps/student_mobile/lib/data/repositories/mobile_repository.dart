import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:somasmart/core/config/app_config.dart';
import 'package:somasmart/core/network/sync_api_session_store.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:somasmart/core/network/api_client.dart';
import 'package:somasmart/data/local/app_database.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/domain/repositories.dart';
import 'package:uuid/uuid.dart';

class MobileRepository implements AppRepository {
  MobileRepository({
    required this.apiClient,
    required this.db,
    required this.projectKey,
    SyncApiSessionStore? sessionStore,
  }) : _sessionStore = sessionStore ?? SyncApiSessionStore();

  final ApiClient apiClient;
  final AppDatabase db;
  final String projectKey;
  final SyncApiSessionStore _sessionStore;
  final _uuid = const Uuid();
  final _syncStatusController = StreamController<SyncStatus>.broadcast();

  bool _syncRunning = false;
  String? _syncError;

  static const _usersTable = 'users';
  static const _lessonsTable = 'lessons';
  static const _lessonContentsTable = 'lessonContents';
  static const _lessonAssetsTable = 'lessonAssets';
  static const _quizzesTable = 'quizzes';
  static const _progressTable = 'progress';
  static const _quizAttemptsTable = 'quizAttempts';
  static const _licenseGrantsTable = 'licenseGrants';
  static const _paymentsTable = 'payments';
  static const _notificationsTable = 'notifications';
  static const _messagesTable = 'messages';
  static const _couponsTable = 'coupons';
  static const _levelsTable = 'curriculumLevels';
  static const _classesTable = 'curriculumClasses';
  static const _subjectsTable = 'curriculumSubjects';

  @override
  Future<AppUser?> getCurrentUser() async {
    final userId = await db.getKeyValue('currentUserId');
    if (userId == null) return null;
    final row = await db.getJsonRecord(_usersTable, userId);
    if (row == null) return null;
    return AppUser.fromJson(parseJsonMap(row.json));
  }

  @override
  Future<AuthSession> login({
    required String username,
    required String password,
  }) async {
    final payload = await apiClient.postJson(
      '/auth/login',
      body: {
        'projectKey': projectKey,
        'username': username.trim(),
        'password': password,
        'deviceId': AppConfig.deviceId,
      },
    );

    final userMap = payload['user'] as Map<String, dynamic>?;
    if (userMap == null) {
      throw ApiException('Missing user in login response');
    }

    final user = AppUser.fromJson(userMap);
    if (user.role != 'student') {
      throw ApiException('Only student accounts are supported in this app.');
    }

    final accessToken = payload['accessToken'] as String?;
    final refreshToken = payload['refreshToken'] as String?;
    if (accessToken == null || refreshToken == null) {
      throw ApiException('Missing token in login response');
    }

    await _sessionStore.writeTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    await db.upsertJsonRecord(
      table: _usersTable,
      id: user.id,
      json: jsonEncode(user.toJson()),
      updatedAt: nowIso(),
    );
    await db.setKeyValue('currentUserId', user.id);
    await db.setKeyValue('runtimeUsername', username.trim());
    await db.setKeyValue('runtimePassword', password);
    await db.setKeyValue('runtimeDisplayName', user.displayName);
    await db.setKeyValue('runtimeRole', 'student');

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user,
    );
  }

  @override
  Future<AppUser> register(RegisterInput input) async {
    final registerPayload = {
      'projectKey': projectKey,
      'username': input.username.trim(),
      'password': input.password,
      'displayName': input.displayName.trim(),
      'role': 'student',
    };
    await apiClient.postJson('/auth/register', body: registerPayload);

    final session = await login(
      username: input.username,
      password: input.password,
    );
    final localUser = AppUser(
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: 'student',
      status: 'active',
      schoolId: input.schoolCode,
      isMinor: input.isMinor,
    );

    await db.upsertJsonRecord(
      table: _usersTable,
      id: localUser.id,
      json: jsonEncode(localUser.toJson()),
      updatedAt: nowIso(),
    );
    await _enqueueOutbox(
      type: 'user_register',
      payload: {
        'user': {
          ...localUser.toJson(),
          'createdAt': nowIso(),
          'kyc': {
            'mobile': input.mobile,
            'address': {
              'country': input.country,
              'region': input.region,
              'street': input.street,
            },
            'dateOfBirth': input.dateOfBirth,
            'studentLevel': input.studentLevel,
            'schoolName': input.schoolName,
            'guardianName': input.guardianName,
            'guardianMobile': input.guardianMobile,
            'updatedAt': nowIso(),
          },
        },
      },
    );

    return localUser;
  }

  @override
  Future<void> logout() async {
    await _sessionStore.clearTokens();
    await db.removeKey('currentUserId');
  }

  @override
  Future<List<Lesson>> listApprovedLessons() async {
    final rows = await db.listJsonRecords(_lessonsTable);
    final now = DateTime.now().toUtc();
    return rows.map((r) => Lesson.fromJson(parseJsonMap(r.json))).where((
      lesson,
    ) {
      if (lesson.deletedAt != null) return false;
      if (!lesson.isApproved) return false;
      if (lesson.expiresAt == null) return true;
      final expiry = DateTime.tryParse(lesson.expiresAt!);
      return expiry == null || expiry.isAfter(now);
    }).toList()..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  @override
  Future<LessonAccess> canAccessLesson({
    required String studentId,
    required Lesson lesson,
  }) async {
    final policy = lesson.accessPolicy ?? 'free';
    if (policy == 'free') return const LessonAccess(allowed: true);

    final now = DateTime.now().toUtc();
    final grantRows = await db.listJsonRecords(_licenseGrantsTable);
    final grants = grantRows
        .map((r) => parseJsonMap(r.json))
        .where((g) => g['studentId'] == studentId)
        .where((g) {
          final deletedAt = g['deletedAt'] as String?;
          if (deletedAt != null && deletedAt.isNotEmpty) return false;
          final validUntil = g['validUntil'] as String?;
          if (validUntil == null || validUntil.isEmpty) return true;
          final dt = DateTime.tryParse(validUntil);
          return dt == null || dt.isAfter(now);
        })
        .toList();

    for (final grant in grants) {
      final scope = grant['scope'];
      if (scope is! Map<String, dynamic>) continue;
      final type = scope['type'] as String?;
      if (type == 'full') return const LessonAccess(allowed: true);
      if (type == 'subject' && scope['subject'] == lesson.subject) {
        return const LessonAccess(allowed: true);
      }
      if (type == 'level' && scope['level'] == lesson.level) {
        return const LessonAccess(allowed: true);
      }
      if (type == 'curriculum_subject' &&
          scope['curriculumSubjectId'] == lesson.curriculumSubjectId) {
        return const LessonAccess(allowed: true);
      }
    }

    return const LessonAccess(
      allowed: false,
      reason: 'Locked. Redeem a coupon or voucher to unlock this lesson.',
    );
  }

  @override
  Future<List<CurriculumNode>> listLevels() async {
    final rows = await db.listJsonRecords(_levelsTable);
    return rows
        .map((r) => CurriculumNode.fromJson(parseJsonMap(r.json)))
        .toList();
  }

  @override
  Future<List<CurriculumNode>> listClasses() async {
    final rows = await db.listJsonRecords(_classesTable);
    return rows
        .map(
          (r) => CurriculumNode.fromJson(
            parseJsonMap(r.json),
            parentField: 'levelId',
          ),
        )
        .toList();
  }

  @override
  Future<List<CurriculumNode>> listSubjects() async {
    final rows = await db.listJsonRecords(_subjectsTable);
    return rows
        .map(
          (r) => CurriculumNode.fromJson(
            parseJsonMap(r.json),
            parentField: 'classId',
          ),
        )
        .toList();
  }

  @override
  Future<List<ProgressRecord>> listProgress(String studentId) async {
    final rows = await db.listJsonRecords(_progressTable);
    return rows
        .map((r) => ProgressRecord.fromJson(parseJsonMap(r.json)))
        .where((p) => p.studentId == studentId)
        .toList();
  }

  @override
  Future<List<QuizAttempt>> listQuizAttempts(String studentId) async {
    final rows = await db.listJsonRecords(_quizAttemptsTable);
    return rows
        .map((r) => QuizAttempt.fromJson(parseJsonMap(r.json)))
        .where((x) => x.studentId == studentId)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  @override
  Future<List<NotificationItem>> listNotifications(String userId) async {
    final rows = await db.listJsonRecords(_notificationsTable);
    final items = <NotificationItem>[];
    for (final row in rows) {
      final raw = parseJsonMap(row.json);
      final target = raw['userId'] as String?;
      if (target == userId || target == '*') {
        items.add(NotificationItem.fromJson(raw));
      }
    }
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  @override
  Future<void> markNotificationRead(String notificationId) async {
    final row = await db.getJsonRecord(_notificationsTable, notificationId);
    if (row == null) return;
    final map = parseJsonMap(row.json)..['readAt'] = nowIso();
    await db.upsertJsonRecord(
      table: _notificationsTable,
      id: notificationId,
      json: jsonEncode(map),
      updatedAt: nowIso(),
    );
  }

  @override
  Future<void> markAllNotificationsRead(String userId) async {
    final rows = await db.listJsonRecords(_notificationsTable);
    for (final row in rows) {
      final map = parseJsonMap(row.json);
      final target = map['userId'] as String?;
      if ((target == userId || target == '*') && map['readAt'] == null) {
        map['readAt'] = nowIso();
        await db.upsertJsonRecord(
          table: _notificationsTable,
          id: row.recordId,
          json: jsonEncode(map),
          updatedAt: nowIso(),
        );
      }
    }
  }

  @override
  Future<List<MessageItem>> listMessages(String userId, String peerId) async {
    final rows = await db.listJsonRecords(_messagesTable);
    return rows
        .map((r) => MessageItem.fromJson(parseJsonMap(r.json)))
        .where(
          (message) =>
              (message.fromUserId == userId && message.toUserId == peerId) ||
              (message.fromUserId == peerId && message.toUserId == userId),
        )
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Future<void> sendMessage(MessageItem message) async {
    await db.upsertJsonRecord(
      table: _messagesTable,
      id: message.id,
      json: jsonEncode(message.toJson()),
      updatedAt: message.createdAt,
    );
    await _enqueueOutbox(
      type: 'message_send',
      payload: {'message': message.toJson()},
    );
  }

  @override
  Future<void> recordPayment({
    required String studentId,
    required String reference,
    required String method,
  }) async {
    final paymentId = 'pay_${_uuid.v4()}';
    final payment = {
      'id': paymentId,
      'studentId': studentId,
      'method': method,
      'status': method == 'mobile_money' ? 'pending' : 'verified',
      'reference': reference,
      'createdAt': nowIso(),
    };
    await db.upsertJsonRecord(
      table: _paymentsTable,
      id: paymentId,
      json: jsonEncode(payment),
      updatedAt: nowIso(),
    );
    await _enqueueOutbox(
      type: 'payment_recorded',
      payload: {'payment': payment},
    );
  }

  @override
  Future<String> redeemCoupon({
    required String studentId,
    required CouponRedemptionInput input,
  }) async {
    final code = input.code.trim().toUpperCase();
    final couponRow = await db.getJsonRecord(_couponsTable, code);
    if (couponRow == null) return 'Invalid code.';

    final coupon = parseJsonMap(couponRow.json);
    if (coupon['active'] == false || coupon['deletedAt'] != null) {
      return 'Coupon inactive.';
    }

    final redeemedBy = (coupon['redeemedByStudentIds'] as List<dynamic>? ?? [])
        .map((e) => '$e')
        .toList();
    if (redeemedBy.contains(studentId)) return 'Coupon already redeemed.';

    final maxRedemptions = coupon['maxRedemptions'] as int? ?? 0;
    if (maxRedemptions > 0 && redeemedBy.length >= maxRedemptions) {
      return 'Coupon redemption limit reached.';
    }

    final now = DateTime.now().toUtc();
    final validFrom = DateTime.tryParse('${coupon['validFrom']}');
    final validUntil = DateTime.tryParse('${coupon['validUntil']}');
    if (validFrom != null && now.isBefore(validFrom)) {
      return 'Coupon not active yet.';
    }
    if (validUntil != null && now.isAfter(validUntil)) return 'Coupon expired.';

    redeemedBy.add(studentId);
    coupon['redeemedByStudentIds'] = redeemedBy;
    await db.upsertJsonRecord(
      table: _couponsTable,
      id: code,
      json: jsonEncode(coupon),
      updatedAt: nowIso(),
    );

    final grantId = 'grant_${_uuid.v4()}';
    final paymentId = 'pay_${_uuid.v4()}';
    final grant = {
      'id': grantId,
      'studentId': studentId,
      'scope': coupon['scope'],
      'sourcePaymentId': paymentId,
      'createdAt': nowIso(),
      'validUntil': coupon['validUntil'],
    };
    final payment = {
      'id': paymentId,
      'studentId': studentId,
      'method': input.method,
      'status': 'verified',
      'reference': code,
      'createdAt': nowIso(),
    };

    await db.upsertJsonRecord(
      table: _licenseGrantsTable,
      id: grantId,
      json: jsonEncode(grant),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _paymentsTable,
      id: paymentId,
      json: jsonEncode(payment),
      updatedAt: nowIso(),
    );

    await _enqueueOutbox(
      type: 'coupon_redeemed',
      payload: {'code': code, 'studentId': studentId},
    );
    await _enqueueOutbox(
      type: 'payment_recorded',
      payload: {'payment': payment, 'grant': grant},
    );
    return 'Access unlocked offline.';
  }

  @override
  Future<List<LessonStep>> getLessonSteps(String lessonId) async {
    final contentRow = await db.getJsonRecord(_lessonContentsTable, lessonId);
    if (contentRow == null) return const [];

    final content = parseJsonMap(contentRow.json);
    final blocks = (content['blocksV2'] as List<dynamic>? ?? []);
    final steps = <LessonStep>[];

    for (final blockRaw in blocks) {
      final block = blockRaw as Map<String, dynamic>;
      final blockTitle = (block['title'] ?? 'Lesson step') as String;
      final components = (block['components'] as List<dynamic>? ?? []);
      for (final componentRaw in components) {
        final component = componentRaw as Map<String, dynamic>;
        final type = component['type'] as String? ?? 'text';
        if (type == 'text') {
          steps.add(
            LessonStep(
              key: '${block['id']}_${component['id']}',
              type: 'text',
              title: blockTitle,
              text: component['text'] as String? ?? '',
            ),
          );
        } else {
          final mediaType = component['mediaType'] as String? ?? 'media';
          final assetId = component['assetId'] as String? ?? '';
          final media = await _resolveLessonMedia(
            assetId: assetId,
            kind: mediaType,
            name: component['name'] as String? ?? mediaType,
            mime: component['mime'] as String? ?? 'application/octet-stream',
          );
          steps.add(
            LessonStep(
              key: '${block['id']}_${component['id']}',
              type: mediaType,
              title: '$blockTitle (${mediaType.toUpperCase()})',
              text: component['name'] as String? ?? 'Media',
              media: media,
            ),
          );
        }
      }

      if (block['quizGate'] is Map<String, dynamic>) {
        final gate = block['quizGate'] as Map<String, dynamic>;
        final quizId = gate['quizId'] as String?;
        if (quizId != null) {
          final quizRow = await db.getJsonRecord(_quizzesTable, quizId);
          if (quizRow != null) {
            final quizJson = parseJsonMap(quizRow.json);
            final questionsRaw =
                (quizJson['questions'] as List<dynamic>? ?? []);
            final questions = questionsRaw.map((item) {
              final question = item as Map<String, dynamic>;
              return QuizQuestion(
                id: question['id'] as String,
                prompt: question['prompt'] as String? ?? '',
                options: (question['options'] as List<dynamic>? ?? const [])
                    .map((x) => '$x')
                    .toList(),
                correctOptionIndex:
                    (question['correctOptionIndex'] as int?) ?? 0,
                explanation: question['explanation'] as String?,
              );
            }).toList();
            steps.add(
              LessonStep(
                key: '${block['id']}_quiz_$quizId',
                type: 'quiz',
                title: blockTitle,
                quiz: LessonQuiz(
                  id: quizId,
                  questions: questions,
                  passScorePct: (gate['passScorePct'] as int?) ?? 60,
                ),
              ),
            );
          }
        }
      }
    }

    return steps;
  }

  Future<LessonMedia> _resolveLessonMedia({
    required String assetId,
    required String kind,
    required String name,
    required String mime,
  }) async {
    if (assetId.isEmpty) {
      return LessonMedia(assetId: '', kind: kind, name: name, mime: mime);
    }

    final row = await db.getJsonRecord(_lessonAssetsTable, assetId);
    if (row == null) {
      return LessonMedia(assetId: assetId, kind: kind, name: name, mime: mime);
    }

    final raw = parseJsonMap(row.json);
    final cid = (raw['cid'] ?? raw['blobCid'] ?? raw['contentCid']) as String?;
    String? localPath = raw['localPath'] as String?;

    if (cid != null && cid.isNotEmpty) {
      localPath = await _getCachedBlobPath(cid);
      if (localPath == null) {
        try {
          final token = await _ensureAccessToken(forceRefresh: false);
          localPath = await _downloadAndCacheBlob(cid, token);
          final updatedRaw = Map<String, dynamic>.from(raw)
            ..['localPath'] = localPath;
          await db.upsertJsonRecord(
            table: _lessonAssetsTable,
            id: assetId,
            json: jsonEncode(updatedRaw),
            updatedAt: nowIso(),
          );
        } catch (_) {
          // Keep step renderable without local blob.
        }
      }
    } else if (localPath != null && !File(localPath).existsSync()) {
      localPath = null;
    }

    return LessonMedia(
      assetId: assetId,
      kind: kind,
      name: (raw['name'] ?? name) as String,
      mime: (raw['mime'] ?? mime) as String,
      cid: cid,
      localPath: localPath,
    );
  }

  @override
  Future<void> upsertProgress(ProgressRecord progress) async {
    await db.upsertJsonRecord(
      table: _progressTable,
      id: progress.id,
      json: jsonEncode(progress.toJson()),
      updatedAt: progress.lastSeenAt,
    );
    await _enqueueOutbox(
      type: 'progress_updated',
      payload: {'progress': progress.toJson()},
    );
  }

  @override
  Future<void> saveQuizAttempt(QuizAttempt attempt) async {
    await db.upsertJsonRecord(
      table: _quizAttemptsTable,
      id: attempt.id,
      json: jsonEncode({
        'id': attempt.id,
        'studentId': attempt.studentId,
        'quizId': attempt.quizId,
        'score': attempt.score,
        'createdAt': attempt.createdAt,
      }),
      updatedAt: attempt.createdAt,
    );
    await _enqueueOutbox(
      type: 'progress_updated',
      payload: {
        'quizAttempt': {
          'id': attempt.id,
          'studentId': attempt.studentId,
          'quizId': attempt.quizId,
          'score': attempt.score,
          'createdAt': attempt.createdAt,
        },
      },
    );
  }

  @override
  Future<String> exportCsv(String studentId) async {
    final progress = await listProgress(studentId);
    final attempts = await listQuizAttempts(studentId);
    final lessonRows = await db.listJsonRecords(_lessonsTable);
    final lessonById = {
      for (final row in lessonRows)
        row.recordId: Lesson.fromJson(parseJsonMap(row.json)),
    };

    final lines = <String>[
      'type,lesson,completed_at,time_spent_sec,last_seen,score,attempted_at',
    ];
    for (final item in progress) {
      final lessonTitle = lessonById[item.lessonId]?.title ?? item.lessonId;
      lines.add(
        'progress,"$lessonTitle",${item.completedAt ?? ''},${item.timeSpentSec},${item.lastSeenAt},,',
      );
    }
    for (final attempt in attempts) {
      lines.add('quiz_attempt,,,,,${attempt.score},${attempt.createdAt}');
    }

    final dir = await getApplicationDocumentsDirectory();
    final path =
        '${dir.path}/somasmart_progress_${DateTime.now().millisecondsSinceEpoch}.csv';
    await File(path).writeAsString('${lines.join('\n')}\n');
    return path;
  }

  @override
  Future<String> exportPdf(String studentId) async {
    final progress = await listProgress(studentId);
    final attempts = await listQuizAttempts(studentId);
    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (context) => [
          pw.Header(level: 0, child: pw.Text('SomaSmart Progress Report')),
          pw.Text('Generated: ${DateTime.now()}'),
          pw.SizedBox(height: 8),
          pw.Text('Progress records: ${progress.length}'),
          pw.Text('Quiz attempts: ${attempts.length}'),
          pw.SizedBox(height: 12),
          pw.TableHelper.fromTextArray(
            headers: const [
              'Lesson ID',
              'Completed',
              'Time (sec)',
              'Last seen',
            ],
            data: progress
                .map(
                  (p) => [
                    p.lessonId,
                    p.completedAt != null ? 'Yes' : 'No',
                    '${p.timeSpentSec}',
                    p.lastSeenAt,
                  ],
                )
                .toList(),
          ),
          pw.SizedBox(height: 12),
          pw.TableHelper.fromTextArray(
            headers: const ['Quiz ID', 'Score', 'Created'],
            data: attempts
                .map((a) => [a.quizId, '${a.score}%', a.createdAt])
                .toList(),
          ),
        ],
      ),
    );

    final dir = await getApplicationDocumentsDirectory();
    final path =
        '${dir.path}/somasmart_progress_${DateTime.now().millisecondsSinceEpoch}.pdf';
    final file = File(path);
    await file.writeAsBytes(await pdf.save());
    return path;
  }

  @override
  Future<ThemeMode> getThemeMode() async {
    final value = await db.getKeyValue('themeMode');
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  @override
  Future<void> setThemeMode(ThemeMode mode) async {
    final value = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await db.setKeyValue('themeMode', value);
  }

  @override
  Future<SyncStatus> getStatus() async {
    final queued = await (db.select(
      db.outboxEvents,
    )..where((t) => t.syncStatus.equals('queued'))).get();
    final failed = await (db.select(
      db.outboxEvents,
    )..where((t) => t.syncStatus.equals('failed'))).get();
    final lastSyncAt = await db.getKeyValue('lastSyncAt');
    return SyncStatus(
      lastSyncAt: lastSyncAt,
      queuedCount: queued.length,
      failedCount: failed.length,
      running: _syncRunning,
      lastError: _syncError,
    );
  }

  @override
  Stream<SyncStatus> watchStatus() async* {
    yield await getStatus();
    yield* _syncStatusController.stream;
  }

  @override
  Future<void> syncNow(String? currentUserId) async {
    if (_syncRunning) return;
    _syncRunning = true;
    _syncError = null;
    await _emitSyncStatus();

    try {
      final accessToken = await _ensureAccessToken(forceRefresh: false);
      final events =
          await (db.select(db.outboxEvents)..where(
                (t) =>
                    t.syncStatus.equals('queued') |
                    t.syncStatus.equals('failed'),
              ))
              .get();

      final mappedEvents = <Map<String, dynamic>>[];
      final eventIdToOutboxId = <String, String>{};
      for (final event in events) {
        final converted = _toSyncEvents(event);
        for (final payload in converted) {
          mappedEvents.add(payload);
          eventIdToOutboxId[payload['eventId'] as String] = event.id;
        }
      }

      if (mappedEvents.isNotEmpty) {
        final push = await apiClient.postJson(
          '/sync/push',
          body: {
            'projectKey': projectKey,
            'deviceId': AppConfig.deviceId,
            'batchId': 'batch_${DateTime.now().millisecondsSinceEpoch}',
            'events': mappedEvents,
          },
          bearer: accessToken,
        );

        final accepted = (push['accepted'] as List<dynamic>? ?? [])
            .map((x) => '$x')
            .toList();
        final rejected = (push['rejected'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();

        for (final eventId in accepted) {
          final outboxId = eventIdToOutboxId[eventId];
          if (outboxId == null) continue;
          await (db.update(
            db.outboxEvents,
          )..where((t) => t.id.equals(outboxId))).write(
            const OutboxEventsCompanion(
              syncStatus: drift.Value('synced'),
              lastError: drift.Value(null),
            ),
          );
        }

        for (final item in rejected) {
          final eventId = item['eventId'] as String?;
          if (eventId == null) continue;
          final outboxId = eventIdToOutboxId[eventId];
          if (outboxId == null) continue;
          final message =
              '${item['code'] ?? 'SYNC_REJECTED'}: ${item['message'] ?? ''}';
          await (db.update(
            db.outboxEvents,
          )..where((t) => t.id.equals(outboxId))).write(
            OutboxEventsCompanion(
              syncStatus: const drift.Value('failed'),
              lastError: drift.Value(message),
            ),
          );
        }
      }

      final checkpoint = await db.getKeyValue('checkpoint.default');
      final cursor = int.tryParse(checkpoint ?? '0') ?? 0;
      final pull = await apiClient.postJson(
        '/sync/pull',
        body: {
          'deviceId': AppConfig.deviceId,
          'checkpoints': {'default': cursor},
        },
        bearer: accessToken,
      );

      final changes = (pull['changes'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      for (final change in changes) {
        final entityType = change['entityType'] as String?;
        final entityId = change['entityId'] as String?;
        final op = change['op'] as String?;
        final data = (change['data'] as Map<String, dynamic>?);
        if (entityType == null || entityId == null || op == null) continue;

        if (op == 'delete') {
          await db.deleteJsonRecord(entityType, entityId);
          continue;
        }
        if (data != null) {
          await db.upsertJsonRecord(
            table: entityType,
            id: entityId,
            json: jsonEncode(data),
            updatedAt:
                (data['updatedAt'] ?? data['createdAt'] ?? nowIso()) as String,
          );
        }
      }

      await _prefetchMissingBlobs(accessToken);

      final checkpoints =
          (pull['nextCheckpoints'] as Map<String, dynamic>? ?? {});
      final next = checkpoints['default'];
      if (next is int) {
        await db.setKeyValue('checkpoint.default', '$next');
      }

      await db.setKeyValue('lastSyncAt', nowIso());
      _syncError = null;
    } on ApiException catch (e) {
      if (e.code == 'AUTH_INVALID' || e.code == 'FORBIDDEN_TOKEN_CLASS') {
        final token = await _ensureAccessToken(forceRefresh: true);
        await _sessionStore.writeAccessToken(token);
      }
      _syncError = e.message;
      rethrow;
    } finally {
      _syncRunning = false;
      await _emitSyncStatus();
    }
  }

  Future<void> _prefetchMissingBlobs(String accessToken) async {
    final rows = await db.listJsonRecords(_lessonAssetsTable);
    final cids = <String>{};
    for (final row in rows) {
      final raw = parseJsonMap(row.json);
      final cid =
          (raw['cid'] ?? raw['blobCid'] ?? raw['contentCid']) as String?;
      if (cid != null && cid.isNotEmpty) {
        final cachedPath = await _getCachedBlobPath(cid);
        if (cachedPath == null) cids.add(cid);
      }
    }

    if (cids.isEmpty) return;

    final needResponse = await apiClient.postJson(
      '/sync/blobs/need',
      body: {'cids': cids.toList()},
      bearer: accessToken,
    );
    final missingAtServer = (needResponse['missing'] as List<dynamic>? ?? [])
        .map((e) => '$e')
        .toSet();
    final available = cids.where((cid) => !missingAtServer.contains(cid));

    for (final cid in available) {
      final localPath = await _downloadAndCacheBlob(cid, accessToken);
      final assetRows = await db.listJsonRecords(_lessonAssetsTable);
      for (final row in assetRows) {
        final raw = parseJsonMap(row.json);
        final rowCid =
            (raw['cid'] ?? raw['blobCid'] ?? raw['contentCid']) as String?;
        if (rowCid == cid) {
          final updated = Map<String, dynamic>.from(raw)
            ..['localPath'] = localPath;
          await db.upsertJsonRecord(
            table: _lessonAssetsTable,
            id: row.recordId,
            json: jsonEncode(updated),
            updatedAt: nowIso(),
          );
        }
      }
    }
  }

  Future<void> _enqueueOutbox({
    required String type,
    required Map<String, dynamic> payload,
  }) async {
    await db
        .into(db.outboxEvents)
        .insertOnConflictUpdate(
          OutboxEventsCompanion.insert(
            id: 'evt_${_uuid.v4()}',
            type: type,
            payloadJson: jsonEncode(payload),
            createdAt: nowIso(),
            syncStatus: const drift.Value('queued'),
          ),
        );
    await _emitSyncStatus();
  }

  Future<void> _emitSyncStatus() async {
    _syncStatusController.add(await getStatus());
  }

  Future<String> _ensureAccessToken({required bool forceRefresh}) async {
    final access = await _sessionStore.readAccessToken();
    if (!forceRefresh && access != null && access.isNotEmpty) return access;

    final refresh = await _sessionStore.readRefreshToken();
    if (refresh != null && refresh.isNotEmpty) {
      final payload = await apiClient.postJson(
        '/auth/refresh',
        body: {'refreshToken': refresh},
      );
      final nextAccess = payload['accessToken'] as String?;
      final nextRefresh = payload['refreshToken'] as String?;
      if (nextAccess != null && nextRefresh != null) {
        await _sessionStore.writeTokens(
          accessToken: nextAccess,
          refreshToken: nextRefresh,
        );
        return nextAccess;
      }
    }

    final username = await db.getKeyValue('runtimeUsername');
    final password = await db.getKeyValue('runtimePassword');
    if (username == null || password == null) {
      throw ApiException(
        'Sync API credentials are missing. Please login again.',
      );
    }

    final session = await login(username: username, password: password);
    return session.accessToken;
  }

  Future<String?> _getCachedBlobPath(String cid) async {
    final file = await _blobFile(cid);
    if (file.existsSync()) return file.path;
    return null;
  }

  Future<File> _blobFile(String cid) async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/blob_cache');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }
    final safe = cid.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    return File('${dir.path}/$safe.bin');
  }

  Future<String> _downloadAndCacheBlob(String cid, String accessToken) async {
    final bytes = await apiClient.getBytes(
      '/sync/blob/$cid',
      bearer: accessToken,
    );
    final file = await _blobFile(cid);
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  List<Map<String, dynamic>> _toSyncEvents(OutboxEvent event) {
    final payload = jsonDecode(event.payloadJson) as Map<String, dynamic>;
    final out = <Map<String, dynamic>>[];

    void add({
      required String suffix,
      required String entityType,
      required String entityId,
      Map<String, dynamic>? data,
    }) {
      out.add({
        'eventId': '${event.id}_$suffix',
        'entityType': entityType,
        'entityId': entityId,
        'op': 'upsert',
        'data': data,
        'occurredAt': event.createdAt,
      });
    }

    if (event.type == 'user_register' ||
        event.type == 'user_update' ||
        event.type == 'user_delete') {
      final user = payload['user'] as Map<String, dynamic>?;
      if (user != null && user['id'] is String) {
        add(
          suffix: 'user',
          entityType: 'users',
          entityId: user['id'] as String,
          data: user,
        );
      }
      return out;
    }

    if (event.type == 'lesson_submit' ||
        event.type == 'lesson_upsert' ||
        event.type == 'lesson_upsert_full') {
      final lesson = payload['lesson'] as Map<String, dynamic>?;
      final content = payload['content'] as Map<String, dynamic>?;
      final quiz = payload['quiz'] as Map<String, dynamic>?;
      if (lesson != null && lesson['id'] is String) {
        add(
          suffix: 'lesson',
          entityType: 'lessons',
          entityId: lesson['id'] as String,
          data: lesson,
        );
      }
      if (content != null && content['lessonId'] is String) {
        add(
          suffix: 'content',
          entityType: 'lessonContents',
          entityId: content['lessonId'] as String,
          data: content,
        );
      }
      if (quiz != null && quiz['id'] is String) {
        add(
          suffix: 'quiz',
          entityType: 'quizzes',
          entityId: quiz['id'] as String,
          data: quiz,
        );
      }
      return out;
    }

    if (event.type == 'payment_recorded') {
      final payment = payload['payment'] as Map<String, dynamic>?;
      final grant = payload['grant'] as Map<String, dynamic>?;
      if (payment != null && payment['id'] is String) {
        add(
          suffix: 'payment',
          entityType: 'payments',
          entityId: payment['id'] as String,
          data: payment,
        );
      }
      if (grant != null && grant['id'] is String) {
        add(
          suffix: 'grant',
          entityType: 'licenseGrants',
          entityId: grant['id'] as String,
          data: grant,
        );
      }
      return out;
    }

    if (event.type == 'message_send') {
      final message = payload['message'] as Map<String, dynamic>?;
      if (message != null && message['id'] is String) {
        add(
          suffix: 'message',
          entityType: 'messages',
          entityId: message['id'] as String,
          data: message,
        );
      }
      return out;
    }

    if (event.type == 'progress_updated') {
      final progress = payload['progress'] as Map<String, dynamic>?;
      final attempt = payload['quizAttempt'] as Map<String, dynamic>?;
      if (progress != null && progress['id'] is String) {
        add(
          suffix: 'progress',
          entityType: 'progress',
          entityId: progress['id'] as String,
          data: progress,
        );
      }
      if (attempt != null && attempt['id'] is String) {
        add(
          suffix: 'attempt',
          entityType: 'quizAttempts',
          entityId: attempt['id'] as String,
          data: attempt,
        );
      }
      return out;
    }

    if (event.type == 'coupon_redeemed') {
      return out;
    }

    return out;
  }

  Future<void> seedIfEmpty() async {
    final lessons = await db.listJsonRecords(_lessonsTable);
    if (lessons.isNotEmpty) return;

    final lessonFree = {
      'id': 'lesson_seed_numbers',
      'title': 'Numbers Basics',
      'description': 'Understand whole numbers and simple operations.',
      'subject': 'Mathematics',
      'level': 'Primary',
      'language': 'en',
      'status': 'approved',
      'updatedAt': nowIso(),
      'curriculumLevelId': 'lvl_primary',
      'curriculumClassId': 'class_p3',
      'curriculumSubjectId': 'sub_math',
      'accessPolicy': 'free',
    };

    final lessonCoupon = {
      'id': 'lesson_seed_science_locked',
      'title': 'Science Explorer',
      'description': 'Learn about plants and living things.',
      'subject': 'Science',
      'level': 'Primary',
      'language': 'en',
      'status': 'approved',
      'updatedAt': nowIso(),
      'curriculumLevelId': 'lvl_primary',
      'curriculumClassId': 'class_p3',
      'curriculumSubjectId': 'sub_science',
      'accessPolicy': 'coupon',
    };

    final content = {
      'lessonId': 'lesson_seed_numbers',
      'version': 2,
      'blocksV2': [
        {
          'id': 'blk_1',
          'title': 'Introduction',
          'components': [
            {
              'id': 'cmp_1',
              'type': 'text',
              'variant': 'heading',
              'text': 'What are numbers?',
            },
            {
              'id': 'cmp_2',
              'type': 'text',
              'variant': 'body',
              'text': 'Numbers help us count and compare quantities.',
            },
          ],
        },
        {
          'id': 'blk_2',
          'title': 'Quick check',
          'components': [
            {
              'id': 'cmp_3',
              'type': 'text',
              'variant': 'body',
              'text': 'Answer the quiz to continue.',
            },
          ],
          'quizGate': {
            'quizId': 'quiz_seed_numbers',
            'requiredToContinue': true,
            'passScorePct': 60,
          },
        },
      ],
    };

    final contentLocked = {
      'lessonId': 'lesson_seed_science_locked',
      'version': 2,
      'blocksV2': [
        {
          'id': 'sblk_1',
          'title': 'Plants',
          'components': [
            {
              'id': 'scmp_1',
              'type': 'text',
              'variant': 'body',
              'text': 'Plants make food through photosynthesis.',
            },
          ],
        },
      ],
    };

    final quiz = {
      'id': 'quiz_seed_numbers',
      'lessonId': 'lesson_seed_numbers',
      'questions': [
        {
          'id': 'q1',
          'prompt': 'What comes after 4?',
          'options': ['3', '5', '7', '2'],
          'correctOptionIndex': 1,
          'explanation': '5 follows 4 in counting order.',
        },
        {
          'id': 'q2',
          'prompt': 'How many apples are in a pair?',
          'options': ['1', '2', '3', '4'],
          'correctOptionIndex': 1,
          'explanation': 'A pair means two.',
        },
      ],
    };

    await db.upsertJsonRecord(
      table: _lessonsTable,
      id: lessonFree['id'] as String,
      json: jsonEncode(lessonFree),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _lessonsTable,
      id: lessonCoupon['id'] as String,
      json: jsonEncode(lessonCoupon),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _lessonContentsTable,
      id: content['lessonId'] as String,
      json: jsonEncode(content),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _lessonContentsTable,
      id: contentLocked['lessonId'] as String,
      json: jsonEncode(contentLocked),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _quizzesTable,
      id: quiz['id'] as String,
      json: jsonEncode(quiz),
      updatedAt: nowIso(),
    );

    await db.upsertJsonRecord(
      table: _levelsTable,
      id: 'lvl_primary',
      json: jsonEncode({
        'id': 'lvl_primary',
        'name': 'Primary',
        'sortOrder': 1,
      }),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _classesTable,
      id: 'class_p3',
      json: jsonEncode({
        'id': 'class_p3',
        'name': 'Class 3',
        'levelId': 'lvl_primary',
        'sortOrder': 1,
      }),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _subjectsTable,
      id: 'sub_math',
      json: jsonEncode({
        'id': 'sub_math',
        'name': 'Mathematics',
        'classId': 'class_p3',
      }),
      updatedAt: nowIso(),
    );
    await db.upsertJsonRecord(
      table: _subjectsTable,
      id: 'sub_science',
      json: jsonEncode({
        'id': 'sub_science',
        'name': 'Science',
        'classId': 'class_p3',
      }),
      updatedAt: nowIso(),
    );

    await db.upsertJsonRecord(
      table: _couponsTable,
      id: 'FREE30',
      json: jsonEncode({
        'code': 'FREE30',
        'active': true,
        'scope': {'type': 'full'},
        'validFrom': DateTime.now()
            .subtract(const Duration(days: 1))
            .toUtc()
            .toIso8601String(),
        'validUntil': DateTime.now()
            .add(const Duration(days: 365))
            .toUtc()
            .toIso8601String(),
        'maxRedemptions': 100,
        'redeemedByStudentIds': <String>[],
      }),
      updatedAt: nowIso(),
    );
  }

  void dispose() {
    _syncStatusController.close();
  }
}
