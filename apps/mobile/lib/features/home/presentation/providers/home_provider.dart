import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kyrae_mobile/features/home/domain/entities/dashboard_info.dart';
import 'package:kyrae_mobile/features/home/domain/usecases/get_dashboard_data_usecase.dart';

final getDashboardDataUseCaseProvider = Provider<GetDashboardDataUseCase>((
  ref,
) {
  return GetDashboardDataUseCase();
});

final homeProvider = FutureProvider<DashboardInfo>((ref) async {
  final useCase = ref.watch(getDashboardDataUseCaseProvider);
  return useCase();
});
