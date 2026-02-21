const REQUIRED_ENV_VARS = [
    "SEED_PROJECT_KEY",
    "SEED_PROJECT_NAME",
    "SEED_TENANT_ADMIN_USERNAME",
    "SEED_TENANT_ADMIN_PASSWORD",
    "SEED_PLATFORM_ADMIN_USERNAME",
    "SEED_PLATFORM_ADMIN_PASSWORD"
];
function readRequiredEnv(name, missing) {
    const value = process.env[name]?.trim();
    if (!value) {
        missing.push(name);
        return "";
    }
    return value;
}
export function getBootstrapSeedConfig() {
    const missing = [];
    const config = {
        projectKey: readRequiredEnv("SEED_PROJECT_KEY", missing).toLowerCase(),
        projectName: readRequiredEnv("SEED_PROJECT_NAME", missing),
        tenantAdminUsername: readRequiredEnv("SEED_TENANT_ADMIN_USERNAME", missing).toLowerCase(),
        tenantAdminPassword: readRequiredEnv("SEED_TENANT_ADMIN_PASSWORD", missing),
        platformAdminUsername: readRequiredEnv("SEED_PLATFORM_ADMIN_USERNAME", missing).toLowerCase(),
        platformAdminPassword: readRequiredEnv("SEED_PLATFORM_ADMIN_PASSWORD", missing)
    };
    if (missing.length > 0) {
        throw new Error(`Missing required seed env vars: ${missing.join(", ")}`);
    }
    return config;
}
