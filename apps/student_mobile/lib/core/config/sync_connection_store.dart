import 'package:somasmart/core/config/sync_connection_config.dart';
import 'package:somasmart/data/local/app_database.dart';

class SyncConnectionStore {
  SyncConnectionStore({required this.db});

  final AppDatabase db;

  static const baseUrlKey = 'sync.connection.base_url';
  static const projectKeyKey = 'sync.connection.project_key';

  Future<SyncConnectionOverride?> loadOverride() async {
    final baseUrl = await db.getKeyValue(baseUrlKey);
    final projectKey = await db.getKeyValue(projectKeyKey);
    if (baseUrl == null || projectKey == null) return null;
    try {
      return normalizeSyncConnectionOverride(
        baseUrl: baseUrl,
        projectKey: projectKey,
      );
    } on FormatException {
      return null;
    }
  }

  Future<SyncConnectionOverride> saveOverride({
    required String baseUrl,
    required String projectKey,
  }) async {
    final normalized = normalizeSyncConnectionOverride(
      baseUrl: baseUrl,
      projectKey: projectKey,
    );
    await db.setKeyValue(baseUrlKey, normalized.baseUrl);
    await db.setKeyValue(projectKeyKey, normalized.projectKey);
    return normalized;
  }

  Future<void> clearOverride() async {
    await db.removeKey(baseUrlKey);
    await db.removeKey(projectKeyKey);
  }
}
