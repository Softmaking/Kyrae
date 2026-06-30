import 'package:kyrae_mobile/core/constants/api_constants.dart';
import 'package:kyrae_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

typedef AssistantRealtimeHandler = void Function(Map<String, dynamic> event);

class AssistantRealtimeDataSource {
  AssistantRealtimeDataSource(this._authLocalDataSource);

  final AuthLocalDataSource _authLocalDataSource;
  io.Socket? _socket;
  String? _activeSessionId;
  AssistantRealtimeHandler? _handler;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect() async {
    if (_socket?.connected ?? false) return;

    if (_socket != null) {
      _socket!.connect();
      return;
    }

    final token = await _authLocalDataSource.getAccessToken();
    if (token == null || token.isEmpty) return;

    _socket = io.io(
      ApiConstants.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    _bindEvents(_socket!);
    _socket!.connect();
  }

  Future<void> joinSession(String sessionId) async {
    _activeSessionId = sessionId;
    await connect();
    _socket?.emit('assistant.session.join', {'sessionId': sessionId});
  }

  void setHandler(AssistantRealtimeHandler handler) {
    _handler = handler;
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _activeSessionId = null;
    _handler = null;
  }

  void _bindEvents(io.Socket socket) {
    socket.onConnect((_) {
      final sessionId = _activeSessionId;
      if (sessionId != null) {
        socket.emit('assistant.session.join', {'sessionId': sessionId});
      }
    });

    for (final eventName in _eventNames) {
      socket.on(eventName, (payload) {
        if (payload is Map) {
          _handler?.call(Map<String, dynamic>.from(payload));
        }
      });
    }
  }
}

const _eventNames = [
  'assistant.message.received',
  'assistant.agent.processing',
  'assistant.agent.completed',
  'assistant.agent.failed',
  'assistant.session.updated',
];
