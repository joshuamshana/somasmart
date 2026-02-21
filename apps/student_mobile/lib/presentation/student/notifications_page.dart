import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:somasmart/application/providers.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    return FutureBuilder(
      future: repo.listNotifications(auth.id),
      builder: (context, snapshot) {
        final items = snapshot.data ?? const [];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Expanded(child: Text('Notifications', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
                FilledButton.tonal(
                  onPressed: () async {
                    await repo.markAllNotificationsRead(auth.id);
                    if (context.mounted) (context as Element).markNeedsBuild();
                  },
                  child: const Text('Mark all read'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...items.map(
              (item) => Card(
                child: ListTile(
                  title: Text(item.title),
                  subtitle: Text('${item.body ?? ''}\n${DateFormat.yMMMd().add_jm().format(DateTime.parse(item.createdAt).toLocal())}'),
                  isThreeLine: true,
                  trailing: item.readAt == null
                      ? TextButton(
                          onPressed: () async {
                            await repo.markNotificationRead(item.id);
                            if (context.mounted) (context as Element).markNeedsBuild();
                          },
                          child: const Text('Mark read'),
                        )
                      : const Text('Read'),
                ),
              ),
            ),
            if (items.isEmpty) const Text('No notifications yet.'),
          ],
        );
      },
    );
  }
}
