import 'package:kyrae_mobile/features/home/domain/entities/dashboard_info.dart';

class GetDashboardDataUseCase {
  Future<DashboardInfo> call() async {
    return const DashboardInfo(
      welcomeMessage: 'Bienvenido al panel mobile',
      pendingTasks: 0,
    );
  }
}
