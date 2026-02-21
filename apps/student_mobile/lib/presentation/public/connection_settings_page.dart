import 'package:flutter/material.dart';
import 'package:somasmart/presentation/widgets/connection_settings_form.dart';

class PublicConnectionSettingsPage extends StatelessWidget {
  const PublicConnectionSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connection settings')),
      body: ConnectionSettingsForm(
        localScopeLabel: 'This setting is local to this device/app.',
      ),
    );
  }
}
