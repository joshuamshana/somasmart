class AppConfig {
  AppConfig._();

  static const defaultSyncApiBaseUrl = 'http://10.0.2.2:4000';
  static const defaultSyncProjectKey = 'somasmart';

  static const _missingSentinel = '__missing__';
  static const _apiBaseUrlRaw = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _missingSentinel,
  );
  static const _projectKeyRaw = String.fromEnvironment(
    'PROJECT_KEY',
    defaultValue: _missingSentinel,
  );

  static const hasApiBaseUrlEnv = _apiBaseUrlRaw != _missingSentinel;
  static const hasProjectKeyEnv = _projectKeyRaw != _missingSentinel;

  static const apiBaseUrl = hasApiBaseUrlEnv
      ? _apiBaseUrlRaw
      : defaultSyncApiBaseUrl;
  static const projectKey = hasProjectKeyEnv
      ? _projectKeyRaw
      : defaultSyncProjectKey;
  static const deviceId = String.fromEnvironment(
    'DEVICE_ID',
    defaultValue: 'android_student_mobile',
  );
}
