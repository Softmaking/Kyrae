# Kyrae Mobile

Flutter mobile client for Kyrae.

## Backend URL

The mobile app calls the Kyrae backend only. Configure the backend URL at build
time with `KYRAE_API_BASE_URL`; the existing Cloudflare URL is used when no
override is provided.

For local development through Tailscale, expose the Kyrae backend from the
machine running on port `3000`:

```bash
tailscale serve --https=443 http://127.0.0.1:3000
tailscale serve status
```

Run the app with the HTTPS Tailscale hostname returned by `tailscale serve`:

```bash
flutter run --dart-define=KYRAE_API_BASE_URL=https://<machine>.<tailnet>.ts.net
```

The mobile device must be authenticated to the same Tailscale network. The
configured URL is shared by REST requests and Socket.IO realtime events.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
