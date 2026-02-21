import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/app/router.dart';
import 'package:somasmart/core/config/sync_connection_config.dart';
import 'package:somasmart/core/config/sync_connection_store.dart';
import 'package:somasmart/core/network/api_client.dart';
import 'package:somasmart/core/network/sync_api_session_store.dart';
import 'package:somasmart/data/local/app_database.dart';
import 'package:somasmart/data/repositories/mobile_repository.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/domain/repositories.dart';

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final syncConnectionStoreProvider = Provider<SyncConnectionStore>(
  (ref) => SyncConnectionStore(db: ref.watch(appDatabaseProvider)),
);

final syncApiSessionStoreProvider = Provider<SyncApiSessionStore>(
  (ref) => SyncApiSessionStore(),
);

class SyncConnectionController
    extends StateNotifier<AsyncValue<EffectiveSyncConnection>> {
  SyncConnectionController(this.ref) : super(const AsyncValue.loading()) {
    unawaited(_load());
  }

  final Ref ref;
  SyncConnectionOverride? _override;

  Future<void> _load() async {
    try {
      _override = await ref.read(syncConnectionStoreProvider).loadOverride();
      state = AsyncValue.data(
        getEffectiveSyncConnection(runtimeOverride: _override),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  EffectiveSyncConnection get current =>
      state.valueOrNull ??
      getEffectiveSyncConnection(runtimeOverride: _override);

  Future<SyncConnectionOverride> saveSyncConnectionOverride({
    required String baseUrl,
    required String projectKey,
  }) async {
    final saved = await ref
        .read(syncConnectionStoreProvider)
        .saveOverride(baseUrl: baseUrl, projectKey: projectKey);
    _override = saved;
    await ref.read(syncApiSessionStoreProvider).clearTokens();
    state = AsyncValue.data(
      getEffectiveSyncConnection(runtimeOverride: _override),
    );
    return saved;
  }

  Future<void> resetSyncConnectionOverride() async {
    await ref.read(syncConnectionStoreProvider).clearOverride();
    _override = null;
    await ref.read(syncApiSessionStoreProvider).clearTokens();
    state = AsyncValue.data(getEffectiveSyncConnection(runtimeOverride: null));
  }
}

final syncConnectionControllerProvider =
    StateNotifierProvider<
      SyncConnectionController,
      AsyncValue<EffectiveSyncConnection>
    >((ref) => SyncConnectionController(ref));

final effectiveSyncConnectionProvider = Provider<EffectiveSyncConnection>((
  ref,
) {
  final current = ref.watch(syncConnectionControllerProvider).valueOrNull;
  return current ?? getEffectiveSyncConnection();
});

final apiClientProvider = Provider<ApiClient>(
  (ref) =>
      ApiClient(baseUrl: ref.watch(effectiveSyncConnectionProvider).baseUrl),
);

final mobileRepositoryProvider = Provider<AppRepository>((ref) {
  final connection = ref.watch(effectiveSyncConnectionProvider);
  final repo = MobileRepository(
    apiClient: ref.watch(apiClientProvider),
    db: ref.watch(appDatabaseProvider),
    projectKey: connection.projectKey,
    sessionStore: ref.watch(syncApiSessionStoreProvider),
  );
  unawaited(repo.seedIfEmpty());
  ref.onDispose(repo.dispose);
  return repo;
});

class AuthController extends StateNotifier<AsyncValue<AppUser?>> {
  AuthController(this.ref) : super(const AsyncValue.loading()) {
    _bootstrap();
  }

  final Ref ref;

  Future<void> _bootstrap() async {
    final user = await ref.read(mobileRepositoryProvider).getCurrentUser();
    state = AsyncValue.data(user);
  }

  Future<void> login(String username, String password) async {
    state = const AsyncValue.loading();
    try {
      final session = await ref
          .read(mobileRepositoryProvider)
          .login(username: username, password: password);
      state = AsyncValue.data(session.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register(RegisterInput input) async {
    state = const AsyncValue.loading();
    try {
      final user = await ref.read(mobileRepositoryProvider).register(input);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    await ref.read(mobileRepositoryProvider).logout();
    state = const AsyncValue.data(null);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<AppUser?>>(
      (ref) => AuthController(ref),
    );

class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController(this.ref) : super(ThemeMode.system) {
    _load();
  }

  final Ref ref;

  Future<void> _load() async {
    state = await ref.read(mobileRepositoryProvider).getThemeMode();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await ref.read(mobileRepositoryProvider).setThemeMode(mode);
    state = mode;
  }
}

final themeModeProvider = StateNotifierProvider<ThemeModeController, ThemeMode>(
  (ref) => ThemeModeController(ref),
);

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

final syncStatusProvider = StreamProvider<SyncStatus>((ref) {
  return ref.read(mobileRepositoryProvider).watchStatus();
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  return buildRouter(ref, auth);
});
