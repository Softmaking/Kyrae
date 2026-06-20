import 'package:equatable/equatable.dart';

class DashboardInfo extends Equatable {
  const DashboardInfo({
    required this.welcomeMessage,
    required this.pendingTasks,
  });

  final String welcomeMessage;
  final int pendingTasks;

  @override
  List<Object?> get props => [welcomeMessage, pendingTasks];
}
