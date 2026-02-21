import 'package:flutter/material.dart';

ThemeData lightTheme() {
  final base = ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0E7490), brightness: Brightness.light),
    useMaterial3: true,
  );
  return base.copyWith(scaffoldBackgroundColor: const Color(0xFFF5F7FB));
}

ThemeData darkTheme() {
  final base = ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF22D3EE), brightness: Brightness.dark),
    useMaterial3: true,
  );
  return base.copyWith(scaffoldBackgroundColor: const Color(0xFF0F172A));
}
