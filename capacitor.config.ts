import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.canyougeo.app",
  appName: "Can You Geo",
  android: {
    loggingBehavior: "none"
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#000211",
      launchAutoHide: true,
      launchShowDuration: 1000,
      showSpinner: false
    }
  },
  webDir: "out"
};

export default config;
