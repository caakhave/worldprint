export type BuildTargetEnv = {
  NEXT_PUBLIC_CGY_NATIVE_APP?: string;
};

export function isNativeAppBuild(env?: BuildTargetEnv): boolean {
  const nativeAppFlag = env ? env.NEXT_PUBLIC_CGY_NATIVE_APP : process.env.NEXT_PUBLIC_CGY_NATIVE_APP;
  return nativeAppFlag === "1";
}
