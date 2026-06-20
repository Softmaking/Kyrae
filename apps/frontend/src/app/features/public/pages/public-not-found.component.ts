import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-public-not-found',
  standalone: true,
  imports: [],
  templateUrl: './public-not-found.component.html',
  styleUrl: './public-not-found.component.css',
})
export class PublicNotFoundComponent {
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
