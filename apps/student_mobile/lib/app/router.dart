import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:somasmart/domain/models.dart';
import 'package:somasmart/presentation/auth/login_page.dart';
import 'package:somasmart/presentation/auth/register_page.dart';
import 'package:somasmart/presentation/help/backend_integration_page.dart';
import 'package:somasmart/presentation/public/connection_settings_page.dart';
import 'package:somasmart/presentation/student/account_connection_settings_page.dart';
import 'package:somasmart/presentation/student/appearance_page.dart';
import 'package:somasmart/presentation/student/dashboard_page.dart';
import 'package:somasmart/presentation/student/home_shell.dart';
import 'package:somasmart/presentation/student/lesson_page.dart';
import 'package:somasmart/presentation/student/lessons_page.dart';
import 'package:somasmart/presentation/student/notifications_page.dart';
import 'package:somasmart/presentation/student/payments_page.dart';
import 'package:somasmart/presentation/student/progress_page.dart';
import 'package:somasmart/presentation/student/support_page.dart';
import 'package:somasmart/presentation/student/sync_page.dart';

GoRouter buildRouter(Ref ref, AsyncValue<AppUser?> authValue) {
  final user = authValue.valueOrNull;
  const publicRoutes = {
    '/login',
    '/register',
    '/connection-settings',
    '/help/backend-integration',
  };

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggingIn =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      if (user == null) {
        if (publicRoutes.contains(state.matchedLocation)) return null;
        final next = Uri.encodeComponent(state.uri.toString());
        return '/login?next=$next';
      }
      if (!user.isStudent) return '/login';
      if (loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) =>
            LoginPage(next: state.uri.queryParameters['next']),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) =>
            RegisterPage(next: state.uri.queryParameters['next']),
      ),
      GoRoute(
        path: '/connection-settings',
        builder: (context, state) => const PublicConnectionSettingsPage(),
      ),
      GoRoute(
        path: '/help/backend-integration',
        builder: (context, state) => const BackendIntegrationPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const DashboardPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/lessons',
                builder: (context, state) => const LessonsPage(),
                routes: [
                  GoRoute(
                    path: ':lessonId',
                    builder: (context, state) =>
                        LessonPage(lessonId: state.pathParameters['lessonId']!),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/progress',
                builder: (context, state) => const ProgressPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/payments',
                builder: (context, state) => const PaymentsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/account',
                builder: (context, state) => const AccountIndexPage(),
                routes: [
                  GoRoute(
                    path: 'support',
                    builder: (context, state) => const SupportPage(),
                  ),
                  GoRoute(
                    path: 'notifications',
                    builder: (context, state) => const NotificationsPage(),
                  ),
                  GoRoute(
                    path: 'sync',
                    builder: (context, state) => const SyncPage(),
                  ),
                  GoRoute(
                    path: 'appearance',
                    builder: (context, state) => const AppearancePage(),
                  ),
                  GoRoute(
                    path: 'connection-settings',
                    builder: (context, state) =>
                        const AccountConnectionSettingsPage(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
