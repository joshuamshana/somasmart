import type { Role, User } from "@/shared/types";

export function getHomePathForRole(role: Role) {
  if (role === "student") return "/";
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  if (role === "school_admin") return "/school";
  return "/";
}

export function getHomePathForUser(user: User) {
  return getHomePathForRole(user.role);
}
