import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/core/network/sync_api_session_store.dart';

class InMemorySecureTokenStorage implements SecureTokenStorage {
  final Map<String, String> _values = {};

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }
}

void main() {
  test('clearTokens removes access and refresh token values', () async {
    final storage = InMemorySecureTokenStorage();
    final store = SyncApiSessionStore(storage: storage);

    await store.writeTokens(
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    );
    expect(await store.readAccessToken(), 'access_token');
    expect(await store.readRefreshToken(), 'refresh_token');

    await store.clearTokens();
    expect(await store.readAccessToken(), isNull);
    expect(await store.readRefreshToken(), isNull);
  });
}
