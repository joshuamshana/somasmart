import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:somasmart/application/providers.dart';
import 'package:somasmart/domain/models.dart';

class PaymentsPage extends ConsumerStatefulWidget {
  const PaymentsPage({super.key});

  @override
  ConsumerState<PaymentsPage> createState() => _PaymentsPageState();
}

class _PaymentsPageState extends ConsumerState<PaymentsPage> {
  final _code = TextEditingController();
  final _reference = TextEditingController();
  String method = 'coupon';

  @override
  void dispose() {
    _code.dispose();
    _reference.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final repo = ref.read(mobileRepositoryProvider);
    if (auth == null) return const SizedBox.shrink();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Payments and access', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Redeem coupon or voucher'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: method,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: 'coupon', child: Text('Coupon')),
                    DropdownMenuItem(value: 'voucher', child: Text('Voucher')),
                  ],
                  onChanged: (value) => setState(() => method = value ?? 'coupon'),
                ),
                const SizedBox(height: 8),
                TextField(controller: _code, decoration: const InputDecoration(labelText: 'Code (e.g FREE30)')),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () async {
                    final message = await repo.redeemCoupon(
                      studentId: auth.id,
                      input: CouponRedemptionInput(code: _code.text, method: method),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
                    }
                  },
                  child: const Text('Redeem'),
                )
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Mobile money (pending verification)'),
              const SizedBox(height: 8),
              TextField(controller: _reference, decoration: const InputDecoration(labelText: 'Transaction reference')),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () async {
                  await repo.recordPayment(studentId: auth.id, reference: _reference.text.trim(), method: 'mobile_money');
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded as pending.')));
                  }
                },
                child: const Text('Save reference'),
              ),
            ]),
          ),
        )
      ],
    );
  }
}
