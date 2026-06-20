import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-form-modal',
  standalone: true,
  imports: [],
  templateUrl: './form-modal.component.html',
  styleUrl: './form-modal.component.css',
})
export class FormModalComponent {
  @Input({ required: true }) title = '';
  @Input() widthClass = 'max-w-lg';

  @Output() close = new EventEmitter<void>();
}
