import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { PublicNotFoundComponent } from './public-not-found.component';

describe('PublicNotFoundComponent', () => {
  let fixture: ComponentFixture<PublicNotFoundComponent>;
  let component: PublicNotFoundComponent;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicNotFoundComponent],
      providers: [Location],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicNotFoundComponent);
    component = fixture.componentInstance;
    location = TestBed.inject(Location);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should render 404 heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('404');
    expect(compiled.textContent).toContain('Página no encontrada');
  });

  it('should render back button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button).toBeDefined();
    expect(button?.textContent).toContain('Volver atrás');
  });

  it('should call location.back on goBack', () => {
    const backSpy = vi.spyOn(location, 'back');
    component.goBack();
    expect(backSpy).toHaveBeenCalled();
  });
});
