import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:somasmart/application/providers.dart';

class AppearancePage extends ConsumerWidget {
  const AppearancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Appearance')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          RadioListTile<ThemeMode>(
            value: ThemeMode.light,
            groupValue: current,
            title: const Text('Light'),
            onChanged: (value) => ref.read(themeModeProvider.notifier).setThemeMode(value!),
          ),
          RadioListTile<ThemeMode>(
            value: ThemeMode.dark,
            groupValue: current,
            title: const Text('Dark'),
            onChanged: (value) => ref.read(themeModeProvider.notifier).setThemeMode(value!),
          ),
          RadioListTile<ThemeMode>(
            value: ThemeMode.system,
            groupValue: current,
            title: const Text('Auto (system)'),
            onChanged: (value) => ref.read(themeModeProvider.notifier).setThemeMode(value!),
          ),
        ],
      ),
    );
  }
}
