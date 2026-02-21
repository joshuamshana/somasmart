import 'dart:convert';

String nowIso() => DateTime.now().toUtc().toIso8601String();

Map<String, dynamic> parseJsonMap(String source) => jsonDecode(source) as Map<String, dynamic>;

class AuthSession {
  const AuthSession({required this.accessToken, required this.refreshToken, required this.user});

  final String accessToken;
  final String refreshToken;
  final AppUser user;
}

class AppUser {
  const AppUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.role,
    required this.status,
    this.schoolId,
    this.isMinor,
  });

  final String id;
  final String username;
  final String displayName;
  final String role;
  final String status;
  final String? schoolId;
  final bool? isMinor;

  bool get isStudent => role == 'student';

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: (json['displayName'] ?? json['username']) as String,
        role: (json['role'] ?? 'student') as String,
        status: (json['status'] ?? 'active') as String,
        schoolId: json['schoolId'] as String?,
        isMinor: json['isMinor'] as bool?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'displayName': displayName,
        'role': role,
        'status': status,
        'schoolId': schoolId,
        'isMinor': isMinor,
      };
}

class RegisterInput {
  const RegisterInput({
    required this.displayName,
    required this.username,
    required this.password,
    required this.mobile,
    required this.country,
    required this.region,
    required this.street,
    required this.dateOfBirth,
    required this.studentLevel,
    this.schoolCode,
    this.schoolName,
    this.isMinor = false,
    this.guardianName,
    this.guardianMobile,
  });

  final String displayName;
  final String username;
  final String password;
  final String mobile;
  final String country;
  final String region;
  final String street;
  final String dateOfBirth;
  final String studentLevel;
  final String? schoolCode;
  final String? schoolName;
  final bool isMinor;
  final String? guardianName;
  final String? guardianMobile;
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    required this.description,
    required this.subject,
    required this.level,
    required this.language,
    required this.status,
    required this.updatedAt,
    this.curriculumLevelId,
    this.curriculumClassId,
    this.curriculumSubjectId,
    this.accessPolicy,
    this.deletedAt,
    this.expiresAt,
  });

  final String id;
  final String title;
  final String description;
  final String subject;
  final String level;
  final String language;
  final String status;
  final String updatedAt;
  final String? curriculumLevelId;
  final String? curriculumClassId;
  final String? curriculumSubjectId;
  final String? accessPolicy;
  final String? deletedAt;
  final String? expiresAt;

  bool get isApproved => status == 'approved';

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
        id: json['id'] as String,
        title: (json['title'] ?? '') as String,
        description: (json['description'] ?? '') as String,
        subject: (json['subject'] ?? '') as String,
        level: (json['level'] ?? '') as String,
        language: (json['language'] ?? '') as String,
        status: (json['status'] ?? 'draft') as String,
        updatedAt: (json['updatedAt'] ?? nowIso()) as String,
        curriculumLevelId: json['curriculumLevelId'] as String?,
        curriculumClassId: json['curriculumClassId'] as String?,
        curriculumSubjectId: json['curriculumSubjectId'] as String?,
        accessPolicy: json['accessPolicy'] as String?,
        deletedAt: json['deletedAt'] as String?,
        expiresAt: json['expiresAt'] as String?,
      );
}

class LessonAccess {
  const LessonAccess({required this.allowed, this.reason});

  final bool allowed;
  final String? reason;
}

class ProgressRecord {
  const ProgressRecord({
    required this.id,
    required this.studentId,
    required this.lessonId,
    required this.timeSpentSec,
    required this.lastSeenAt,
    this.completedAt,
  });

  final String id;
  final String studentId;
  final String lessonId;
  final int timeSpentSec;
  final String lastSeenAt;
  final String? completedAt;

  factory ProgressRecord.fromJson(Map<String, dynamic> json) => ProgressRecord(
        id: json['id'] as String,
        studentId: json['studentId'] as String,
        lessonId: json['lessonId'] as String,
        timeSpentSec: (json['timeSpentSec'] ?? 0) as int,
        lastSeenAt: (json['lastSeenAt'] ?? nowIso()) as String,
        completedAt: json['completedAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'studentId': studentId,
        'lessonId': lessonId,
        'timeSpentSec': timeSpentSec,
        'lastSeenAt': lastSeenAt,
        'completedAt': completedAt,
      };
}

class QuizAttempt {
  const QuizAttempt({required this.id, required this.studentId, required this.quizId, required this.score, required this.createdAt});

  final String id;
  final String studentId;
  final String quizId;
  final int score;
  final String createdAt;

  factory QuizAttempt.fromJson(Map<String, dynamic> json) => QuizAttempt(
        id: json['id'] as String,
        studentId: json['studentId'] as String,
        quizId: json['quizId'] as String,
        score: (json['score'] ?? 0) as int,
        createdAt: (json['createdAt'] ?? nowIso()) as String,
      );
}

class CouponRedemptionInput {
  const CouponRedemptionInput({required this.code, required this.method});
  final String code;
  final String method;
}

class NotificationItem {
  const NotificationItem({required this.id, required this.title, required this.createdAt, this.body, this.readAt});

  final String id;
  final String title;
  final String createdAt;
  final String? body;
  final String? readAt;

  factory NotificationItem.fromJson(Map<String, dynamic> json) => NotificationItem(
        id: json['id'] as String,
        title: (json['title'] ?? '') as String,
        createdAt: (json['createdAt'] ?? nowIso()) as String,
        body: json['body'] as String?,
        readAt: json['readAt'] as String?,
      );
}

class MessageItem {
  const MessageItem({
    required this.id,
    required this.fromUserId,
    required this.toUserId,
    required this.body,
    required this.createdAt,
    required this.status,
  });

  final String id;
  final String fromUserId;
  final String toUserId;
  final String body;
  final String createdAt;
  final String status;

  factory MessageItem.fromJson(Map<String, dynamic> json) => MessageItem(
        id: json['id'] as String,
        fromUserId: json['fromUserId'] as String,
        toUserId: json['toUserId'] as String,
        body: (json['body'] ?? '') as String,
        createdAt: (json['createdAt'] ?? nowIso()) as String,
        status: (json['status'] ?? 'queued') as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'fromUserId': fromUserId,
        'toUserId': toUserId,
        'body': body,
        'createdAt': createdAt,
        'status': status,
      };
}

class SyncStatus {
  const SyncStatus({
    required this.lastSyncAt,
    required this.queuedCount,
    required this.failedCount,
    required this.running,
    this.lastError,
  });

  final String? lastSyncAt;
  final int queuedCount;
  final int failedCount;
  final bool running;
  final String? lastError;
}

class LessonMedia {
  const LessonMedia({
    required this.assetId,
    required this.kind,
    required this.name,
    required this.mime,
    this.cid,
    this.localPath,
  });

  final String assetId;
  final String kind;
  final String name;
  final String mime;
  final String? cid;
  final String? localPath;

  bool get hasLocalFile => localPath != null && localPath!.isNotEmpty;
}

class LessonStep {
  const LessonStep({required this.key, required this.type, required this.title, this.text, this.quiz, this.media});

  final String key;
  final String type;
  final String title;
  final String? text;
  final LessonQuiz? quiz;
  final LessonMedia? media;

  bool get isQuiz => type == 'quiz';
  bool get isMedia => media != null;
}

class LessonQuiz {
  const LessonQuiz({required this.id, required this.questions, required this.passScorePct});

  final String id;
  final List<QuizQuestion> questions;
  final int passScorePct;
}

class QuizQuestion {
  const QuizQuestion({required this.id, required this.prompt, required this.options, required this.correctOptionIndex, this.explanation});

  final String id;
  final String prompt;
  final List<String> options;
  final int correctOptionIndex;
  final String? explanation;
}

class CurriculumNode {
  const CurriculumNode({required this.id, required this.name, this.parentId});

  final String id;
  final String name;
  final String? parentId;

  factory CurriculumNode.fromJson(Map<String, dynamic> json, {String? parentField}) => CurriculumNode(
        id: json['id'] as String,
        name: (json['name'] ?? '') as String,
        parentId: parentField == null ? null : json[parentField] as String?,
      );
}
