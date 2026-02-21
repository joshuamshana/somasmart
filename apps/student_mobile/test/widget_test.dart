import 'package:flutter_test/flutter_test.dart';
import 'package:somasmart/domain/models.dart';

void main() {
  test('lesson from json parses expected fields', () {
    final lesson = Lesson.fromJson({
      'id': 'l1',
      'title': 'Test Lesson',
      'description': 'Desc',
      'subject': 'Math',
      'level': 'Primary',
      'language': 'en',
      'status': 'approved',
      'updatedAt': '2026-01-01T00:00:00.000Z'
    });

    expect(lesson.id, 'l1');
    expect(lesson.isApproved, isTrue);
  });
}
