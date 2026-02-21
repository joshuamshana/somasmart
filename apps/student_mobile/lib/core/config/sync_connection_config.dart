import 'package:somasmart/core/config/app_config.dart';

enum SyncConnectionSource { runtimeOverride, env, defaultValue }

class SyncConnectionOverride {
  const SyncConnectionOverride({
    required this.baseUrl,
    required this.projectKey,
  });

  final String baseUrl;
  final String projectKey;
}

class EffectiveSyncConnection {
  const EffectiveSyncConnection({
    required this.baseUrl,
    required this.projectKey,
    required this.baseUrlSource,
    required this.projectKeySource,
    required this.hasRuntimeOverride,
  });

  final String baseUrl;
  final String projectKey;
  final SyncConnectionSource baseUrlSource;
  final SyncConnectionSource projectKeySource;
  final bool hasRuntimeOverride;

  String get sourceLabel =>
      hasRuntimeOverride ? 'runtime override' : 'env/default';
}

const projectKeyPattern = r'^[a-zA-Z0-9_-]{2,64}$';

String normalizeSyncBaseUrl(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    throw const FormatException('Backend URL is required.');
  }

  final uri = Uri.tryParse(trimmed);
  if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
    throw const FormatException(
      'Backend URL must be an absolute URL with protocol, e.g. http://10.0.2.2:4000.',
    );
  }
  if (uri.scheme != 'http' && uri.scheme != 'https') {
    throw const FormatException(
      'Backend URL must use http or https protocol (e.g. http://10.0.2.2:4000).',
    );
  }

  return trimmed.replaceAll(RegExp(r'/+$'), '');
}

String normalizeSyncProjectKey(String value) {
  final trimmed = value.trim();
  final regex = RegExp(projectKeyPattern);
  if (!regex.hasMatch(trimmed)) {
    throw const FormatException(
      'Project key must be 2-64 characters: letters, numbers, underscore, or hyphen.',
    );
  }
  return trimmed;
}

SyncConnectionOverride normalizeSyncConnectionOverride({
  required String baseUrl,
  required String projectKey,
}) {
  return SyncConnectionOverride(
    baseUrl: normalizeSyncBaseUrl(baseUrl),
    projectKey: normalizeSyncProjectKey(projectKey),
  );
}

EffectiveSyncConnection getEffectiveSyncConnection({
  SyncConnectionOverride? runtimeOverride,
  String? envBaseUrlOverride,
  String? envProjectKeyOverride,
  bool? hasApiBaseUrlEnvOverride,
  bool? hasProjectKeyEnvOverride,
}) {
  final hasApiBaseUrlEnv =
      hasApiBaseUrlEnvOverride ?? AppConfig.hasApiBaseUrlEnv;
  final hasProjectKeyEnv =
      hasProjectKeyEnvOverride ?? AppConfig.hasProjectKeyEnv;
  final envBaseUrlRaw = envBaseUrlOverride ?? AppConfig.apiBaseUrl;
  final envProjectKeyRaw = envProjectKeyOverride ?? AppConfig.projectKey;

  String? envBaseUrl;
  if (hasApiBaseUrlEnv) {
    try {
      envBaseUrl = normalizeSyncBaseUrl(envBaseUrlRaw);
    } catch (_) {
      envBaseUrl = null;
    }
  }

  String? envProjectKey;
  if (hasProjectKeyEnv) {
    try {
      envProjectKey = normalizeSyncProjectKey(envProjectKeyRaw);
    } catch (_) {
      envProjectKey = null;
    }
  }

  final baseUrl =
      runtimeOverride?.baseUrl ?? envBaseUrl ?? AppConfig.defaultSyncApiBaseUrl;
  final projectKey =
      runtimeOverride?.projectKey ??
      envProjectKey ??
      AppConfig.defaultSyncProjectKey;
  return EffectiveSyncConnection(
    baseUrl: baseUrl,
    projectKey: projectKey,
    baseUrlSource: runtimeOverride != null
        ? SyncConnectionSource.runtimeOverride
        : envBaseUrl != null
        ? SyncConnectionSource.env
        : SyncConnectionSource.defaultValue,
    projectKeySource: runtimeOverride != null
        ? SyncConnectionSource.runtimeOverride
        : envProjectKey != null
        ? SyncConnectionSource.env
        : SyncConnectionSource.defaultValue,
    hasRuntimeOverride: runtimeOverride != null,
  );
}
