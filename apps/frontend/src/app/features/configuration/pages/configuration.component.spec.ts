/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ConfigurationComponent } from './configuration.component';
import { AuthService } from '../../auth/services/auth.service';
import { ConfigurationService } from '../services/configuration.service';

const mockConfigs = [
  {
    id: 'c-1',
    key: 'APP_NAME',
    value: 'Kyrae',
    description: 'App name',
    category: 'general',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c-2',
    key: 'MAX_USERS',
    value: 100,
    description: null,
    category: 'limits',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('ConfigurationComponent', () => {
  let fixture: ComponentFixture<ConfigurationComponent>;
  let component: ConfigurationComponent;
  let configService: ConfigurationService;

  const mockAuthService: Pick<AuthService, 'user' | 'hasPermission'> = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      firstName: 'Admin',
      firstSurname: 'User',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['CONFIGURATION_CREATE'],
    }),
    hasPermission: (perm: string) => perm === 'CONFIGURATION_CREATE',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationComponent],
      providers: [ConfigurationService, { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    configService = TestBed.inject(ConfigurationService);
    configService.configs.set(mockConfigs);
    configService.total.set(2);
    configService.loading.set(false);
    vi.spyOn(configService, 'load').mockResolvedValue();

    fixture = TestBed.createComponent(ConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display configs in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nueva configuracion" button when has CONFIGURATION_CREATE permission', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const hasCreateButton = Array.from(buttons).some((b) =>
      (b as HTMLButtonElement).textContent?.includes('Nueva configuracion')
    );
    expect(hasCreateButton).toBe(true);
  });

  it('should display value as JSON string', () => {
    const displayVal = component.displayValue('Kyrae');
    expect(typeof displayVal).toBe('string');
  });

  it('should call configService.create on submit', async () => {
    const createSpy = vi.spyOn(configService, 'create').mockResolvedValue(mockConfigs[0]);
    vi.spyOn(component, 'loadConfigs').mockResolvedValue();

    component.formData = {
      key: 'NEW_KEY',
      value: 'test',
      description: '',
      category: '',
      isActive: true,
    };
    component.formValueText = '"test"';
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalled();
    expect(component.showCreateModal()).toBe(false);
  });

  it('should start and cancel edit mode', () => {
    component.startEdit(mockConfigs[0]);
    expect(component.editingId()).toBe('c-1');

    component.cancelEdit();
    expect(component.editingId()).toBeNull();
    expect(component.editFormData).toBeNull();
  });

  it('should build activeFilters correctly', () => {
    expect(component.activeFilters.page).toBe(1);
    expect(component.activeFilters.pageSize).toBe(10);

    component.selectedCategory.set('general');
    const filters = component.activeFilters;
    expect(filters.category).toBe('general');
  });

  it('should handle state filter change', async () => {
    const loadSpy = vi.spyOn(configService, 'load').mockResolvedValue();
    await component.onStateFilterChange('active');
    expect(component.selectedState()).toBe('active');
    expect(component.currentPage()).toBe(1);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should parse value input as JSON or plain string', () => {
    const textValue = component['parseValueInput']('plain string');
    expect(textValue).toBe('plain string');

    const jsonValue = component['parseValueInput']('{"key":"value"}');
    expect(jsonValue).toEqual({ key: 'value' });

    const emptyValue = component['parseValueInput']('');
    expect(emptyValue).toBe('');
  });

  it('should format dates correctly', () => {
    const result = component.formatDate('2025-03-15T10:30:00Z');
    expect(result).toContain('2025');
  });
});
