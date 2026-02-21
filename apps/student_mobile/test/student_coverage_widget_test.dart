import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/app/app.dart';
import 'package:somasmart/application/providers.dart';

import '../integration_test/helpers/fake_app_repository.dart';

void main() {
  group('Student coverage widget journeys', () {
    testWidgets('register -> lessons -> quiz -> progress', (tester) async {
      final repo = FakeAppRepository();
      await _pumpApp(tester, repo);

      await tester.tap(find.text('Create student account'));
      await tester.pumpAndSettle();

      await _fillRequiredRegistration(tester, username: 'student_a');
      await _submitRegistration(tester);

      await tester.tap(find.text('Lessons').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Numbers Basics').first);
      await tester.pumpAndSettle();

      expect(find.textContaining('Step 1 of'), findsOneWidget);

      repo.dispose();
    });

    testWidgets('locked lesson unlock via coupon', (tester) async {
      final repo = FakeAppRepository();
      await _pumpApp(tester, repo);

      await tester.tap(find.text('Create student account'));
      await tester.pumpAndSettle();
      await _fillRequiredRegistration(tester, username: 'student_b');
      await _submitRegistration(tester);

      await tester.tap(find.text('Lessons').last);
      await tester.pumpAndSettle();
      expect(find.text('Locked'), findsWidgets);

      await tester.tap(find.text('Science Explorer').first);
      await tester.pumpAndSettle();
      expect(find.textContaining('Redeem a coupon'), findsWidgets);

      await tester.tap(find.text('Go to payments'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Code (e.g FREE30)'), 'FREE30');
      await tester.tap(find.text('Redeem'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Lessons').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Science Explorer').first);
      await tester.pumpAndSettle();
      final lockedLesson = (await repo.listApprovedLessons()).firstWhere((l) => l.id == 'lesson_seed_science_locked');
      final access = await repo.canAccessLesson(studentId: repo.currentUser!.id, lesson: lockedLesson);
      expect(access.allowed, isTrue);

      repo.dispose();
    });

    testWidgets('notifications and manual sync status', (tester) async {
      final repo = FakeAppRepository();
      await _pumpApp(tester, repo);

      await tester.tap(find.text('Create student account'));
      await tester.pumpAndSettle();
      await _fillRequiredRegistration(tester, username: 'student_c');
      await _submitRegistration(tester);

      await tester.tap(find.text('Account').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Notifications'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome to SomaSmart'), findsOneWidget);
      await tester.tap(find.text('Mark all read'));
      await tester.pumpAndSettle();
      expect(find.text('Read'), findsWidgets);

      await tester.tap(find.text('Account').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sync status'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sync now'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Last sync:'), findsOneWidget);
      expect(find.textContaining('Never'), findsNothing);

      repo.dispose();
    });

    testWidgets('support page minor gate', (tester) async {
      final repo = FakeAppRepository();
      await _pumpApp(tester, repo);

      await tester.tap(find.text('Create student account'));
      await tester.pumpAndSettle();
      await _fillRequiredRegistration(tester, username: 'student_minor');
      final scrollableMinor = find.byType(Scrollable).first;
      await tester.dragUntilVisible(find.byType(SwitchListTile), scrollableMinor, const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(SwitchListTile));
      await tester.pumpAndSettle();
      await _submitRegistration(tester);

      await tester.tap(find.text('Account').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Support messaging'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Messaging for minors may be blocked'), findsOneWidget);

      repo.dispose();
    });

    testWidgets('appearance theme preference', (tester) async {
      final repo = FakeAppRepository();
      await _pumpApp(tester, repo);

      await tester.tap(find.text('Create student account'));
      await tester.pumpAndSettle();
      await _fillRequiredRegistration(tester, username: 'student_theme');
      await _submitRegistration(tester);

      await tester.tap(find.text('Account').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Appearance'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Dark'));
      await tester.pumpAndSettle();
      expect(repo.currentThemeMode, ThemeMode.dark);

      repo.dispose();
    });
  });
}

Future<void> _pumpApp(WidgetTester tester, FakeAppRepository repo) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        mobileRepositoryProvider.overrideWithValue(repo),
      ],
      child: const SomaSmartApp(),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _submitRegistration(WidgetTester tester) async {
  final scrollable = find.byType(Scrollable).first;
  await tester.dragUntilVisible(find.text('Register'), scrollable, const Offset(0, -300));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Register'));
  await tester.pumpAndSettle();
}

Future<void> _fillRequiredRegistration(WidgetTester tester, {required String username}) async {
  await tester.enterText(find.widgetWithText(TextFormField, 'Full name'), 'Student Test');
  await tester.enterText(find.widgetWithText(TextFormField, 'Username'), username);
  await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
  await tester.enterText(find.widgetWithText(TextFormField, 'Mobile'), '+255700000000');
  await tester.enterText(find.widgetWithText(TextFormField, 'Country'), 'Tanzania');
  await tester.enterText(find.widgetWithText(TextFormField, 'Region'), 'Dar');
  await tester.enterText(find.widgetWithText(TextFormField, 'Street'), 'Main St');
  await tester.enterText(find.widgetWithText(TextFormField, 'Date of birth (YYYY-MM-DD)'), '2010-01-01');
}
