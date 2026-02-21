import 'package:flutter/material.dart';
import 'package:somasmart/presentation/widgets/connection_settings_form.dart';

class AccountConnectionSettingsPage extends StatelessWidget {
  const AccountConnectionSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connection settings')),
      body: ConnectionSettingsForm(
        localScopeLabel: 'Local device only; not synced.',
      ),
    );
  }
}
