import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class JsonRecords extends Table {
  TextColumn get bucket => text()();
  TextColumn get recordId => text()();
  TextColumn get json => text()();
  TextColumn get updatedAt => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {bucket, recordId};
}

class OutboxEvents extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  TextColumn get payloadJson => text()();
  TextColumn get createdAt => text()();
  TextColumn get syncStatus => text().withDefault(const Constant('queued'))();
  TextColumn get lastError => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class Checkpoints extends Table {
  TextColumn get scope => text()();
  IntColumn get cursor => integer().withDefault(const Constant(0))();

  @override
  Set<Column<Object>> get primaryKey => {scope};
}

class KeyValues extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

@DriftDatabase(tables: [JsonRecords, OutboxEvents, Checkpoints, KeyValues])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? e]) : super(e ?? _openConnection());

  @override
  int get schemaVersion => 1;

  Future<void> upsertJsonRecord({
    required String table,
    required String id,
    required String json,
    String? updatedAt,
  }) {
    return into(jsonRecords).insertOnConflictUpdate(
      JsonRecordsCompanion.insert(
        bucket: table,
        recordId: id,
        json: json,
        updatedAt: Value(updatedAt),
      ),
    );
  }

  Future<void> deleteJsonRecord(String table, String id) {
    return (delete(jsonRecords)
          ..where((t) => t.bucket.equals(table) & t.recordId.equals(id)))
        .go();
  }

  Future<List<JsonRecord>> listJsonRecords(String table) {
    return (select(jsonRecords)..where((t) => t.bucket.equals(table))).get();
  }

  Future<JsonRecord?> getJsonRecord(String table, String id) {
    return (select(jsonRecords)
          ..where((t) => t.bucket.equals(table) & t.recordId.equals(id)))
        .getSingleOrNull();
  }

  Future<void> setKeyValue(String key, String value) {
    return into(keyValues).insertOnConflictUpdate(KeyValuesCompanion.insert(key: key, value: value));
  }

  Future<String?> getKeyValue(String key) async {
    final row = await (select(keyValues)..where((t) => t.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  Future<void> removeKey(String key) {
    return (delete(keyValues)..where((t) => t.key.equals(key))).go();
  }
}

QueryExecutor _openConnection() {
  return driftDatabase(name: 'somasmart_student_mobile');
}
