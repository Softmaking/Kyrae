import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-table.component.html',
})
export class AppTableComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly total = input.required<number>();
  readonly paginationMode = input<'page' | 'cursor'>('page');
  readonly pageSize = input(10);
  readonly currentPage = input(1);
  readonly pageSizeOptions = input([5, 8, 10]);
  readonly searchTerm = input('');
  readonly loading = input(false);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly emptyMessage = input('No se encontraron registros');

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly searchChange = output<string>();
  readonly loadMore = output<void>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly startIndex = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.total()));

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onPageSizeChange(value: string): void {
    this.pageSizeChange.emit(Number(value));
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }

  onLoadMore(): void {
    if (this.hasMore() && !this.loadingMore()) {
      this.loadMore.emit();
    }
  }
}
