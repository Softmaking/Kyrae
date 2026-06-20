import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PublicHomeComponent } from './public-home.component';

describe('PublicHomeComponent', () => {
  let fixture: ComponentFixture<PublicHomeComponent>;
  let component: PublicHomeComponent;

  const mockActivatedRoute = {
    fragment: of('inicio'),
  };

  beforeEach(async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();

    await TestBed.configureTestingModule({
      imports: [PublicHomeComponent],
      providers: [{ provide: ActivatedRoute, useValue: mockActivatedRoute }],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should have current year as a signal', () => {
    expect(component.currentYear()).toBe(new Date().getFullYear());
  });

  it('should have 5 clients', () => {
    expect(component.clients().length).toBe(5);
  });

  it('should have 2 services', () => {
    expect(component.services().length).toBe(2);
  });

  it('should toggle menuOpen', () => {
    expect(component.menuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('should close menu on closeMenu', () => {
    component.menuOpen.set(true);
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('should scroll to section on scrollToSection', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-section';
    document.body.appendChild(mockElement);

    component.scrollToSection('test-section');
    expect(mockElement.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(mockElement);
  });

  it('should update navbarSolid on scroll', () => {
    expect(component.navbarSolid()).toBe(false);
    window.scrollY = 100;
    component.onWindowScroll();
    expect(component.navbarSolid()).toBe(true);

    window.scrollY = 0;
    component.onWindowScroll();
    expect(component.navbarSolid()).toBe(false);
  });

  it('should disconnect observer on destroy', () => {
    const disconnectSpy = vi.fn();
    component['revealObserver'] = { disconnect: disconnectSpy } as unknown as IntersectionObserver;

    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
