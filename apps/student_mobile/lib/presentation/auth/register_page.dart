import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key, this.next});

  final String? next;

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _displayName = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _mobile = TextEditingController();
  final _country = TextEditingController(text: 'Tanzania');
  final _region = TextEditingController();
  final _street = TextEditingController();
  final _dob = TextEditingController();
  final _schoolCode = TextEditingController();
  final _schoolName = TextEditingController();
  final _guardianName = TextEditingController();
  final _guardianMobile = TextEditingController();
  String _studentLevel = 'primary';
  bool _isMinor = false;
  String? _error;

  @override
  void dispose() {
    _displayName.dispose();
    _username.dispose();
    _password.dispose();
    _mobile.dispose();
    _country.dispose();
    _region.dispose();
    _street.dispose();
    _dob.dispose();
    _schoolCode.dispose();
    _schoolName.dispose();
    _guardianName.dispose();
    _guardianMobile.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authControllerProvider).isLoading;

    return Scaffold(
      appBar: AppBar(title: const Text('Register student')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _displayName,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _username,
                  decoration: const InputDecoration(labelText: 'Username'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _mobile,
                  decoration: const InputDecoration(labelText: 'Mobile'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _country,
                  decoration: const InputDecoration(labelText: 'Country'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _region,
                  decoration: const InputDecoration(labelText: 'Region'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _street,
                  decoration: const InputDecoration(labelText: 'Street'),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _dob,
                  decoration: const InputDecoration(
                    labelText: 'Date of birth (YYYY-MM-DD)',
                  ),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _studentLevel,
                  decoration: const InputDecoration(labelText: 'Level'),
                  items: const [
                    DropdownMenuItem(value: 'primary', child: Text('Primary')),
                    DropdownMenuItem(
                      value: 'secondary',
                      child: Text('Secondary'),
                    ),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                    DropdownMenuItem(value: 'college', child: Text('College')),
                    DropdownMenuItem(value: 'uni', child: Text('Uni')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) =>
                      setState(() => _studentLevel = value ?? 'primary'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _schoolCode,
                  decoration: const InputDecoration(
                    labelText: 'School code (optional)',
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _schoolName,
                  decoration: const InputDecoration(
                    labelText: 'School name (if no code)',
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Student is a minor'),
                  value: _isMinor,
                  onChanged: (value) => setState(() => _isMinor = value),
                ),
                if (_isMinor) ...[
                  TextFormField(
                    controller: _guardianName,
                    decoration: const InputDecoration(
                      labelText: 'Guardian name',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _guardianMobile,
                    decoration: const InputDecoration(
                      labelText: 'Guardian mobile',
                    ),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: loading
                      ? null
                      : () async {
                          if (!_formKey.currentState!.validate()) return;
                          final input = RegisterInput(
                            displayName: _displayName.text,
                            username: _username.text,
                            password: _password.text,
                            mobile: _mobile.text,
                            country: _country.text,
                            region: _region.text,
                            street: _street.text,
                            dateOfBirth: _dob.text,
                            studentLevel: _studentLevel,
                            schoolCode: _schoolCode.text.isEmpty
                                ? null
                                : _schoolCode.text,
                            schoolName: _schoolName.text.isEmpty
                                ? null
                                : _schoolName.text,
                            isMinor: _isMinor,
                            guardianName: _guardianName.text.isEmpty
                                ? null
                                : _guardianName.text,
                            guardianMobile: _guardianMobile.text.isEmpty
                                ? null
                                : _guardianMobile.text,
                          );
                          setState(() => _error = null);
                          try {
                            await ref
                                .read(authControllerProvider.notifier)
                                .register(input);
                            if (!mounted) return;
                            final next = widget.next;
                            if (next != null && next.startsWith('/')) {
                              context.go(Uri.decodeComponent(next));
                            } else {
                              context.go('/');
                            }
                          } catch (e) {
                            setState(() => _error = '$e');
                          }
                        },
                  child: Text(loading ? 'Creating...' : 'Register'),
                ),
                TextButton(
                  onPressed: () => context.push('/connection-settings'),
                  child: const Text('Connection settings'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String? _required(String? value) =>
      (value == null || value.trim().isEmpty) ? 'Required' : null;
}
