import 'package:flutter/material.dart';
import 'package:somasmart/domain/models.dart';

abstract class AuthRepository {
  Future<AppUser?> getCurrentUser();
  Future<AuthSession> login({required String username, required String password});
  Future<AppUser> register(RegisterInput input);
  Future<void> logout();
}

abstract class StudentRepository {
  Future<List<Lesson>> listApprovedLessons();
  Future<List<CurriculumNode>> listLevels();
  Future<List<CurriculumNode>> listClasses();
  Future<List<CurriculumNode>> listSubjects();
  Future<List<ProgressRecord>> listProgress(String studentId);
  Future<List<QuizAttempt>> listQuizAttempts(String studentId);
  Future<List<NotificationItem>> listNotifications(String userId);
  Future<void> markNotificationRead(String notificationId);
  Future<void> markAllNotificationsRead(String userId);
  Future<List<MessageItem>> listMessages(String userId, String peerId);
  Future<void> sendMessage(MessageItem message);
  Future<void> recordPayment({required String studentId, required String reference, required String method});
  Future<String> redeemCoupon({required String studentId, required CouponRedemptionInput input});
  Future<List<LessonStep>> getLessonSteps(String lessonId);
  Future<void> upsertProgress(ProgressRecord progress);
  Future<void> saveQuizAttempt(QuizAttempt attempt);
  Future<String> exportCsv(String studentId);
  Future<String> exportPdf(String studentId);
  Future<LessonAccess> canAccessLesson({required String studentId, required Lesson lesson});
}

abstract class SyncRepository {
  Future<SyncStatus> getStatus();
  Future<void> syncNow(String? currentUserId);
  Stream<SyncStatus> watchStatus();
}

abstract class ThemeRepository {
  Future<ThemeMode> getThemeMode();
  Future<void> setThemeMode(ThemeMode mode);
}

abstract class AppRepository implements AuthRepository, StudentRepository, SyncRepository, ThemeRepository {}
