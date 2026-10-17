export function assertSafeEmulatorEnvironment(env: Record<string, string | undefined> = process.env): string {
  const project = env.GCLOUD_PROJECT;
  const localHost = /^(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/;
  const validHost = (value?: string) => {
    const match = value?.match(localHost);
    return Boolean(match && Number(match[2]) <= 65535);
  };
  if (!project || !/^demo-[a-z0-9][a-z0-9-]*$/.test(project) ||
      !validHost(env.FIRESTORE_EMULATOR_HOST) || !validHost(env.FIREBASE_AUTH_EMULATOR_HOST) ||
      (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== project) ||
      (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== project) ||
      env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY || env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT: require matching demo project, local Auth/Firestore hosts and no service-account credentials");
  }
  return project;
}
