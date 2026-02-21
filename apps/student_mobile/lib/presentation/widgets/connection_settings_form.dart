import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/core/config/app_config.dart';

class ConnectionSettingsForm extends ConsumerStatefulWidget {
  const ConnectionSettingsForm({super.key, required this.localScopeLabel});

  final String localScopeLabel;

  @override
  ConsumerState<ConnectionSettingsForm> createState() =>
      _ConnectionSettingsFormState();
}

class _ConnectionSettingsFormState
    extends ConsumerState<ConnectionSettingsForm> {
  final _baseUrlController = TextEditingController();
  final _projectKeyController = TextEditingController();
  String? _error;
  String? _message;
  bool _initialized = false;

  @override
  void dispose() {
    _baseUrlController.dispose();
    _projectKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final connectionState = ref.watch(syncConnectionControllerProvider);
    final effective = ref.watch(effectiveSyncConnectionProvider);
    final loading = connectionState.isLoading;

    if (!_initialized) {
      _baseUrlController.text = effective.baseUrl;
      _projectKeyController.text = effective.projectKey;
      _initialized = true;
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _baseUrlController,
          decoration: const InputDecoration(
            labelText: 'Backend URL',
            hintText: 'http://10.0.2.2:4000',
          ),
          onChanged: (_) {
            if (_error != null || _message != null) {
              setState(() {
                _error = null;
                _message = null;
              });
            }
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _projectKeyController,
          decoration: const InputDecoration(labelText: 'Project key'),
          onChanged: (_) {
            if (_error != null || _message != null) {
              setState(() {
                _error = null;
                _message = null;
              });
            }
          },
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            FilledButton(
              onPressed: loading
                  ? null
                  : () async {
                      try {
                        final saved = await ref
                            .read(syncConnectionControllerProvider.notifier)
                            .saveSyncConnectionOverride(
                              baseUrl: _baseUrlController.text,
                              projectKey: _projectKeyController.text,
                            );
                        setState(() {
                          _baseUrlController.text = saved.baseUrl;
                          _projectKeyController.text = saved.projectKey;
                          _error = null;
                          _message = 'Connection settings saved.';
                        });
                      } catch (e) {
                        setState(() {
                          _message = null;
                          _error = e is FormatException ? e.message : '$e';
                        });
                      }
                    },
              child: Text(loading ? 'Saving...' : 'Save'),
            ),
            OutlinedButton(
              onPressed: loading
                  ? null
                  : () async {
                      await ref
                          .read(syncConnectionControllerProvider.notifier)
                          .resetSyncConnectionOverride();
                      final updated = ref.read(effectiveSyncConnectionProvider);
                      setState(() {
                        _baseUrlController.text = updated.baseUrl;
                        _projectKeyController.text = updated.projectKey;
                        _error = null;
                        _message = 'Connection settings reset to defaults.';
                      });
                    },
              child: const Text('Reset to defaults'),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (_message != null) ...[const SizedBox(height: 8), Text(_message!)],
        const SizedBox(height: 12),
        Text(
          'Use full backend URL with protocol, e.g. ${AppConfig.defaultSyncApiBaseUrl}.',
        ),
        const SizedBox(height: 4),
        Text('Default endpoint is ${AppConfig.defaultSyncApiBaseUrl}.'),
        const SizedBox(height: 4),
        Text('Default project key is ${AppConfig.defaultSyncProjectKey}.'),
        const SizedBox(height: 4),
        Text(widget.localScopeLabel),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.push('/help/backend-integration'),
          child: const Text('Open backend integration guide'),
        ),
      ],
    );
  }
}
