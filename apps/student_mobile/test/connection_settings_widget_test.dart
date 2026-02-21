import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/app/app.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/core/network/sync_api_session_store.dart';
import 'package:somasmart/data/local/app_database.dart';
import 'package:somasmart/presentation/public/connection_settings_page.dart';

import '../integration_test/helpers/fake_app_repository.dart';

class InMemorySecureTokenStorage implements SecureTokenStorage {
  final Map<String, String> _values = {};

  @override
  Future<void> delete(String key) async => _values.remove(key);

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async => _values[key] = value;
}

void main() {
  testWidgets('public connection settings save/reset and validation', (
    tester,
  ) async {
    final db = AppDatabase(NativeDatabase.memory());
    final sessionStore = SyncApiSessionStore(
      storage: InMemorySecureTokenStorage(),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appDatabaseProvider.overrideWithValue(db),
          syncApiSessionStoreProvider.overrideWithValue(sessionStore),
        ],
        child: const MaterialApp(home: PublicConnectionSettingsPage()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '/api');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Backend URL must be an absolute URL with protocol, e.g. http://10.0.2.2:4000.',
      ),
      findsOneWidget,
    );

    await tester.enterText(
      find.byType(TextField).at(0),
      'http://10.0.2.2:4000/customapi/',
    );
    await tester.enterText(find.byType(TextField).at(1), 'tenant_mobile');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Connection settings saved.'), findsOneWidget);
    expect(
      await db.getKeyValue('sync.connection.base_url'),
      'http://10.0.2.2:4000/customapi',
    );
    expect(
      await db.getKeyValue('sync.connection.project_key'),
      'tenant_mobile',
    );

    await tester.tap(find.text('Reset to defaults'));
    await tester.pumpAndSettle();
    expect(find.text('Connection settings reset to defaults.'), findsOneWidget);
    expect(await db.getKeyValue('sync.connection.base_url'), isNull);
    expect(await db.getKeyValue('sync.connection.project_key'), isNull);

    await db.close();
  });

  testWidgets('login and register pages expose connection settings entry', (
    tester,
  ) async {
    final repo = FakeAppRepository();
    final db = AppDatabase(NativeDatabase.memory());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          mobileRepositoryProvider.overrideWithValue(repo),
          appDatabaseProvider.overrideWithValue(db),
          syncApiSessionStoreProvider.overrideWithValue(
            SyncApiSessionStore(storage: InMemorySecureTokenStorage()),
          ),
        ],
        child: const SomaSmartApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Connection settings'), findsOneWidget);
    await tester.tap(find.text('Create student account'));
    await tester.pumpAndSettle();
    expect(find.text('Connection settings'), findsOneWidget);

    repo.dispose();
    await db.close();
  });

  testWidgets('account menu and sync page show connection settings summary', (
    tester,
  ) async {
    final repo = FakeAppRepository();
    final db = AppDatabase(NativeDatabase.memory());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          mobileRepositoryProvider.overrideWithValue(repo),
          appDatabaseProvider.overrideWithValue(db),
          syncApiSessionStoreProvider.overrideWithValue(
            SyncApiSessionStore(storage: InMemorySecureTokenStorage()),
          ),
        ],
        child: const SomaSmartApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create student account'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Full name'),
      'Student Test',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Username'),
      'student_conn',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'password123',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Mobile'),
      '+255700000000',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Country'),
      'Tanzania',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'Region'), 'Dar');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Street'),
      'Main St',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Date of birth (YYYY-MM-DD)'),
      '2010-01-01',
    );
    final scrollable = find.byType(Scrollable).first;
    await tester.dragUntilVisible(
      find.text('Register'),
      scrollable,
      const Offset(0, -300),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Account').last);
    await tester.pumpAndSettle();
    expect(find.text('Connection settings'), findsOneWidget);

    await tester.tap(find.text('Sync status'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Endpoint:'), findsOneWidget);
    expect(find.textContaining('Project key:'), findsOneWidget);
    expect(find.textContaining('Source:'), findsOneWidget);

    repo.dispose();
    await db.close();
  });
}
