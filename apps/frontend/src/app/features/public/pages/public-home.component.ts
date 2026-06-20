import { AfterViewInit, Component, HostListener, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-public-home',
  standalone: true,
  templateUrl: './public-home.component.html',
  styleUrl: './public-home.component.css',
})
export class PublicHomeComponent implements AfterViewInit, OnDestroy {
  readonly currentYear = signal(new Date().getFullYear());
  readonly menuOpen = signal(false);
  readonly navbarSolid = signal(false);

  private revealObserver?: IntersectionObserver;
  private fragmentSubscription?: Subscription;

  readonly clients = signal([
    {
      name: 'Capmar',
      description: 'Empresa de capacitación marítima',
      logoUrl: '/assets/img/clients/capmar-logo.png',
      siteUrl: 'https://nuevacapmar.cl',
    },
    {
      name: 'RK3',
      description: 'Empresa de cálculo estructural',
      logoUrl: '/assets/img/clients/rk3-logo.png',
      siteUrl: 'https://rk3.cl/',
    },
    {
      name: 'JEIT',
      description: 'Negocio de venta de condimentos',
      logoUrl: '/assets/img/clients/jeit-logo.png',
      siteUrl: '#',
    },
    {
      name: 'Colegio Robles',
      description: 'Corporación educacional Colegio Robles',
      logoUrl: '/assets/img/clients/logo-colegio-robles-logo.png',
      siteUrl: 'https://www.colegiorobles.cl',
    },
    {
      name: 'Red Cruz del Mar',
      description: 'Empresa de servicios de ambulancia',
      logoUrl: '/assets/img/clients/redcruzmar-logo.png',
      siteUrl: 'https://www.redcruzdelmar.cl',
    },
  ]);

  readonly services = signal([
    {
      title: 'OpenClaw',
      description:
        'Agente principal previsto para coordinar conversaciones, acciones y flujos de asistencia en la plataforma Kyrae.',
      variant: 'dark',
    },
    {
      title: 'Voz',
      description:
        'Capacidad objetivo para interacción hablada en frontend y mobile, documentada por ahora sin implementación funcional.',
      variant: 'blue',
    },
  ]);

  constructor(private readonly route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    window.setTimeout(() => this.observeRevealElements(), 0);

    this.fragmentSubscription = this.route.fragment.subscribe((fragment) => {
      if (!fragment) {
        return;
      }

      window.setTimeout(() => this.scrollToSection(fragment), 0);
    });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.fragmentSubscription?.unsubscribe();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  scrollToSection(sectionId: string): void {
    this.closeMenu();

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.navbarSolid.set(window.scrollY > 24);
  }

  private observeRevealElements(): void {
    const elements = document.querySelectorAll<HTMLElement>(
      '.reveal-up, .reveal-left, .reveal-scale'
    );
    if (!elements.length) {
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      }
    );

    elements.forEach((element) => this.revealObserver?.observe(element));
  }
}
