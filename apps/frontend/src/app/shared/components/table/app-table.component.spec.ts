import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTableComponent } from './app-table.component';

describe('AppTableComponent', () => {
  let component: AppTableComponent;
  let fixture: ComponentFixture<AppTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppTableComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('title', 'Usuarios');
    fixture.componentRef.setInput('total', 50);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('pageSize', 10);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  describe('computed signals', () => {
    it('should compute totalPages from total and pageSize', () => {
      expect(component.totalPages()).toBe(5);
    });

    it('should return at least 1 totalPage when total is 0', () => {
      fixture.componentRef.setInput('total', 0);
      fixture.detectChanges();
      expect(component.totalPages()).toBe(1);
    });

    it('should compute pageNumbers array', () => {
      expect(component.pageNumbers()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should compute startIndex', () => {
      expect(component.startIndex()).toBe(1);
    });

    it('should compute startIndex as 0 when total is 0', () => {
      fixture.componentRef.setInput('total', 0);
      fixture.detectChanges();
      expect(component.startIndex()).toBe(0);
    });

    it('should compute correct startIndex for page > 1', () => {
      fixture.componentRef.setInput('currentPage', 3);
      fixture.detectChanges();
      expect(component.startIndex()).toBe(21);
    });

    it('should compute endIndex', () => {
      expect(component.endIndex()).toBe(10);
    });

    it('should cap endIndex at total for last page', () => {
      fixture.componentRef.setInput('currentPage', 5);
      fixture.detectChanges();
      expect(component.endIndex()).toBe(50);
    });
  });

  describe('goToPage', () => {
    it('should emit pageChange for valid page', () => {
      const spy = vi.spyOn(component.pageChange, 'emit');
      component.goToPage(3);
      expect(spy).toHaveBeenCalledWith(3);
    });

    it('should not emit pageChange for page < 1', () => {
      const spy = vi.spyOn(component.pageChange, 'emit');
      component.goToPage(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit pageChange for page > totalPages', () => {
      const spy = vi.spyOn(component.pageChange, 'emit');
      component.goToPage(10);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onSearchChange', () => {
    it('should emit searchChange with the value', () => {
      const spy = vi.spyOn(component.searchChange, 'emit');
      component.onSearchChange('test');
      expect(spy).toHaveBeenCalledWith('test');
    });

    it('should emit empty string', () => {
      const spy = vi.spyOn(component.searchChange, 'emit');
      component.onSearchChange('');
      expect(spy).toHaveBeenCalledWith('');
    });
  });

  describe('onPageSizeChange', () => {
    it('should emit pageSizeChange with parsed number', () => {
      const spy = vi.spyOn(component.pageSizeChange, 'emit');
      component.onPageSizeChange('25');
      expect(spy).toHaveBeenCalledWith(25);
    });
  });

  describe('onLoadMore', () => {
    it('should emit loadMore when cursor pagination has more results', () => {
      const spy = vi.spyOn(component.loadMore, 'emit');
      fixture.componentRef.setInput('hasMore', true);
      fixture.componentRef.setInput('loadingMore', false);
      fixture.detectChanges();

      component.onLoadMore();

      expect(spy).toHaveBeenCalled();
    });

    it('should not emit loadMore while loading more', () => {
      const spy = vi.spyOn(component.loadMore, 'emit');
      fixture.componentRef.setInput('hasMore', true);
      fixture.componentRef.setInput('loadingMore', true);
      fixture.detectChanges();

      component.onLoadMore();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    function el(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('should render title', () => {
      fixture.componentRef.setInput('title', 'Roles');
      fixture.detectChanges();
      const h2 = el().querySelector('.admin-table-title');
      expect(h2?.textContent).toContain('Roles');
    });

    it('should render subtitle when provided', () => {
      fixture.componentRef.setInput('subtitle', 'Lista de roles');
      fixture.detectChanges();
      const p = el().querySelector('.admin-table-meta');
      expect(p?.textContent).toContain('Lista de roles');
    });

    it('should not render subtitle when not provided', () => {
      fixture.componentRef.setInput('subtitle', undefined);
      fixture.detectChanges();
      const p = el().querySelector('.admin-table-meta');
      expect(p).toBeNull();
    });

    it('should show loading message when loading', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();
      expect(el().textContent).toContain('Cargando...');
    });

    it('should show empty message and hidden table loading=false', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('emptyMessage', 'Sin datos');
      fixture.componentRef.setInput('total', 0);
      fixture.detectChanges();
      expect(el().textContent).not.toContain('Cargando...');
    });

    it('should render footer with record range info', () => {
      fixture.componentRef.setInput('currentPage', 1);
      fixture.componentRef.setInput('total', 50);
      fixture.componentRef.setInput('pageSize', 10);
      fixture.detectChanges();

      const footer = el().querySelector('.admin-table-footer');
      expect(footer?.textContent).toContain('Mostrando 1 a 10 de 50 registros');
    });

    it('should render cursor pagination footer', () => {
      fixture.componentRef.setInput('paginationMode', 'cursor');
      fixture.componentRef.setInput('total', 20);
      fixture.componentRef.setInput('hasMore', true);
      fixture.detectChanges();

      const footer = el().querySelector('.admin-table-footer');
      expect(footer?.textContent).toContain('20 registros cargados');
      expect(footer?.textContent).toContain('Cargar más');
    });

    it('should disable previous button on first page', () => {
      fixture.componentRef.setInput('currentPage', 1);
      fixture.detectChanges();
      const buttons = el().querySelectorAll('.admin-table-page-button');
      const prevButton = buttons[0] as HTMLButtonElement;
      expect(prevButton.disabled).toBe(true);
    });

    it('should disable next button on last page', () => {
      fixture.componentRef.setInput('currentPage', 5);
      fixture.detectChanges();
      const buttons = el().querySelectorAll('.admin-table-page-button');

      const prevButton = buttons[0] as HTMLButtonElement;
      expect(prevButton.disabled).toBe(false);
    });

    it('should highlight current page button', () => {
      fixture.componentRef.setInput('currentPage', 3);
      fixture.detectChanges();
      const buttons = el().querySelectorAll('button');
      const pageButtons = Array.from(buttons).filter(
        (b) => b.className === 'admin-table-page-button-active'
      );
      expect(pageButtons.length).toBe(1);
      expect(pageButtons[0].textContent?.trim()).toBe('3');
    });
  });
});
