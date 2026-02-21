import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:somasmart/application/providers.dart';

class SyncPage extends ConsumerWidget {
  const SyncPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final status = ref.watch(syncStatusProvider);
    final connection = ref.watch(effectiveSyncConnectionProvider);
    final repo = ref.read(mobileRepositoryProvider);

    if (auth == null) return const SizedBox.shrink();

    return Scaffold(
      appBar: AppBar(title: const Text('Sync status')),
      body: status.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status: ${value.running ? 'Syncing' : 'Idle'}'),
                    const SizedBox(height: 6),
                    Text(
                      'Last sync: ${value.lastSyncAt == null ? 'Never' : DateFormat.yMMMd().add_jm().format(DateTime.parse(value.lastSyncAt!).toLocal())}',
                    ),
                    Text('Outbox queued: ${value.queuedCount}'),
                    Text('Outbox failed: ${value.failedCount}'),
                    if (value.lastError != null)
                      Text(
                        'Error: ${value.lastError}',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    const SizedBox(height: 10),
                    FilledButton(
                      onPressed: value.running
                          ? null
                          : () async {
                              try {
                                await repo.syncNow(auth.id);
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Sync failed: $e')),
                                  );
                                }
                              }
                            },
                      child: Text(value.running ? 'Syncing...' : 'Sync now'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Backend connection',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text('Endpoint: ${connection.baseUrl}'),
                    Text('Project key: ${connection.projectKey}'),
                    Text('Source: ${connection.sourceLabel}'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
