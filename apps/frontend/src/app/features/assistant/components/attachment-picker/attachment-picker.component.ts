import { Component, inject, input } from '@angular/core';
import { AssistantAttachmentsService } from '../../services/assistant-attachments.service';

@Component({
  selector: 'app-attachment-picker',
  standalone: true,
  templateUrl: './attachment-picker.component.html',
  styleUrl: './attachment-picker.component.css',
})
export class AttachmentPickerComponent {
  readonly uploads = inject(AssistantAttachmentsService);
  readonly disabled = input(false);
  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.uploads.select(Array.from(input.files ?? []));
    input.value = '';
  }
}
