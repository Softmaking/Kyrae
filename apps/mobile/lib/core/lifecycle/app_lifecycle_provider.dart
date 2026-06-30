import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final appLifecycleProvider =
    NotifierProvider<AppLifecycleController, AppLifecycleState>(
      AppLifecycleController.new,
    );

class AppLifecycleController extends Notifier<AppLifecycleState>
    with WidgetsBindingObserver {
  @override
  AppLifecycleState build() {
    final binding = WidgetsBinding.instance;
    binding.addObserver(this);
    ref.onDispose(() => binding.removeObserver(this));
    return binding.lifecycleState ?? AppLifecycleState.resumed;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    this.state = state;
  }
}
