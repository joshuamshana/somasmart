import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/core/config/app_config.dart';
import 'package:somasmart/core/config/sync_connection_config.dart';

void main() {
  test('defaults resolve when no env/runtime override is present', () {
    final effective = getEffectiveSyncConnection(
      hasApiBaseUrlEnvOverride: false,
      hasProjectKeyEnvOverride: false,
    );

    expect(effective.baseUrl, AppConfig.defaultSyncApiBaseUrl);
    expect(effective.projectKey, AppConfig.defaultSyncProjectKey);
    expect(effective.hasRuntimeOverride, isFalse);
  });

  test('env values resolve when present', () {
    final effective = getEffectiveSyncConnection(
      envBaseUrlOverride: 'https://example.com/api',
      envProjectKeyOverride: 'tenant_env',
      hasApiBaseUrlEnvOverride: true,
      hasProjectKeyEnvOverride: true,
    );

    expect(effective.baseUrl, 'https://example.com/api');
    expect(effective.projectKey, 'tenant_env');
    expect(effective.hasRuntimeOverride, isFalse);
  });

  test('runtime override takes precedence over env values', () {
    final runtime = normalizeSyncConnectionOverride(
      baseUrl: 'http://10.0.2.2:4000/custom',
      projectKey: 'tenant_override',
    );
    final effective = getEffectiveSyncConnection(
      runtimeOverride: runtime,
      envBaseUrlOverride: 'https://example.com/api',
      envProjectKeyOverride: 'tenant_env',
      hasApiBaseUrlEnvOverride: true,
      hasProjectKeyEnvOverride: true,
    );

    expect(effective.baseUrl, 'http://10.0.2.2:4000/custom');
    expect(effective.projectKey, 'tenant_override');
    expect(effective.hasRuntimeOverride, isTrue);
  });

  test('rejects invalid base URL and accepts absolute http(s) URL', () {
    expect(
      () => normalizeSyncConnectionOverride(
        baseUrl: '/api',
        projectKey: 'tenant_a',
      ),
      throwsFormatException,
    );
    expect(
      () => normalizeSyncConnectionOverride(
        baseUrl: 'localhost:80',
        projectKey: 'tenant_a',
      ),
      throwsFormatException,
    );
    expect(
      () => normalizeSyncConnectionOverride(
        baseUrl: 'ftp://example.com',
        projectKey: 'tenant_a',
      ),
      throwsFormatException,
    );

    final normalized = normalizeSyncConnectionOverride(
      baseUrl: 'http://10.0.2.2:4000/path/',
      projectKey: 'tenant_a',
    );
    expect(normalized.baseUrl, 'http://10.0.2.2:4000/path');
  });
}
