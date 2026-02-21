import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class SecureTokenStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class FlutterSecureTokenStorage implements SecureTokenStorage {
  FlutterSecureTokenStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> delete(String key) => _storage.delete(key: key);

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);
}

class SyncApiSessionStore {
  SyncApiSessionStore({SecureTokenStorage? storage})
    : _storage = storage ?? FlutterSecureTokenStorage();

  final SecureTokenStorage _storage;

  static const accessTokenKey = 'sync_access_token';
  static const refreshTokenKey = 'sync_refresh_token';

  Future<String?> readAccessToken() => _storage.read(accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(refreshTokenKey);

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(accessTokenKey, accessToken);
    await _storage.write(refreshTokenKey, refreshToken);
  }

  Future<void> writeAccessToken(String token) =>
      _storage.write(accessTokenKey, token);

  Future<void> clearTokens() async {
    await _storage.delete(accessTokenKey);
    await _storage.delete(refreshTokenKey);
  }
}
