# ADORA mobile

Expo SDK 58 / React Native 0.88 application using Expo Router, TanStack Query, Zod, and SecureStore.
Run from the repository root with `corepack pnpm@12.16.1 dev:mobile`.

Install native dependencies with Expo's SDK-aware installer:

```powershell
corepack pnpm@12.16.1 --filter @adora/mobile exec expo install <package>
```

`EXPO_PUBLIC_API_BASE_URL` is public build-time configuration. iOS native builds require macOS;
Android device/emulator runtime verification is separate from static checks and web export.
