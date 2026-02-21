import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';
import 'package:uuid/uuid.dart';

class SupportPage extends ConsumerStatefulWidget {
  const SupportPage({super.key});

  @override
  ConsumerState<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends ConsumerState<SupportPage> {
  final _teacherId = TextEditingController(text: 'teacher1');
  final _draft = TextEditingController();

  @override
  void dispose() {
    _teacherId.dispose();
    _draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    if (auth.isMinor == true) {
      return const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('Messaging for minors may be blocked by school settings.')));
    }

    return FutureBuilder(
      future: repo.listMessages(auth.id, _teacherId.text),
      builder: (context, snapshot) {
        final messages = snapshot.data ?? <MessageItem>[];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Support messaging', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(controller: _teacherId, decoration: const InputDecoration(labelText: 'Teacher user id')),
            const SizedBox(height: 12),
            Card(
              child: SizedBox(
                height: 360,
                child: ListView(
                  padding: const EdgeInsets.all(8),
                  children: messages
                      .map(
                        (message) => Align(
                          alignment: message.fromUserId == auth.id ? Alignment.centerRight : Alignment.centerLeft,
                          child: Card(
                            color: message.fromUserId == auth.id ? Theme.of(context).colorScheme.secondaryContainer : null,
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(message.body),
                                  const SizedBox(height: 4),
                                  Text(message.status, style: Theme.of(context).textTheme.labelSmall),
                                ],
                              ),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextField(controller: _draft, minLines: 2, maxLines: 4, decoration: const InputDecoration(labelText: 'Message')),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () async {
                final message = MessageItem(
                  id: 'msg_${const Uuid().v4()}',
                  fromUserId: auth.id,
                  toUserId: _teacherId.text.trim(),
                  body: _draft.text.trim(),
                  createdAt: nowIso(),
                  status: 'queued',
                );
                await repo.sendMessage(message);
                _draft.clear();
                setState(() {});
              },
              child: const Text('Send'),
            )
          ],
        );
      },
    );
  }
}
