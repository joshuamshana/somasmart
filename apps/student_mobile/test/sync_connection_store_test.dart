import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/core/config/sync_connection_store.dart';
import 'package:somasmart/data/local/app_database.dart';

void main() {
  test('save/load/clear override round trip', () async {
    final db = AppDatabase(NativeDatabase.memory());
    final store = SyncConnectionStore(db: db);

    final saved = await store.saveOverride(
      baseUrl: 'http://10.0.2.2:4000/custom',
      projectKey: 'tenant_mobile',
    );
    expect(saved.baseUrl, 'http://10.0.2.2:4000/custom');
    expect(saved.projectKey, 'tenant_mobile');

    final loaded = await store.loadOverride();
    expect(loaded, isNotNull);
    expect(loaded!.baseUrl, 'http://10.0.2.2:4000/custom');
    expect(loaded.projectKey, 'tenant_mobile');

    await store.clearOverride();
    expect(await store.loadOverride(), isNull);

    await db.close();
  });
}
