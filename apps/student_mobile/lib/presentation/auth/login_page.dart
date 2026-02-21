import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/application/providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key, this.next});

  final String? next;

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _password = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authControllerProvider).isLoading;

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Student mobile access',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _username,
                  decoration: const InputDecoration(labelText: 'Username'),
                  validator: (value) => (value == null || value.trim().isEmpty)
                      ? 'Required'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  validator: (value) =>
                      (value == null || value.isEmpty) ? 'Required' : null,
                ),
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
                          setState(() => _error = null);
                          try {
                            await ref
                                .read(authControllerProvider.notifier)
                                .login(_username.text, _password.text);
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
                  child: Text(loading ? 'Logging in...' : 'Login'),
                ),
                TextButton(
                  onPressed: () => context.push(
                    '/register${widget.next != null ? '?next=${widget.next}' : ''}',
                  ),
                  child: const Text('Create student account'),
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
}
