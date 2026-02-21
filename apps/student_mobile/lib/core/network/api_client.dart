import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<Map<String, dynamic>> postJson(
    String path, {
    required Map<String, dynamic> body,
    String? bearer,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl$path'),
      headers: {
        'content-type': 'application/json',
        if (bearer != null) 'authorization': 'Bearer $bearer',
      },
      body: jsonEncode(body),
    );

    if (response.body.isEmpty) {
      if (response.statusCode >= 200 && response.statusCode < 300) return {};
      throw ApiException('HTTP ${response.statusCode}: Empty response');
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw ApiException('Invalid response payload from $path');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final code = decoded['code'];
    final message = decoded['message'];
    throw ApiException('${code ?? 'REQUEST_FAILED'}${message != null ? ': $message' : ''}', code: code as String?);
  }

  Future<Uint8List> getBytes(String path, {String? bearer}) async {
    final response = await _client.get(
      Uri.parse('$baseUrl$path'),
      headers: {
        if (bearer != null) 'authorization': 'Bearer $bearer',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.bodyBytes;
    }

    String? code;
    String? message;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        code = decoded['code'] as String?;
        message = decoded['message'] as String?;
      }
    } catch (_) {
      // Non-json error bodies are valid fallback.
    }

    throw ApiException('${code ?? 'REQUEST_FAILED'}${message != null ? ': $message' : ''}', code: code);
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}
