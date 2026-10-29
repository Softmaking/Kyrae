import { Component, input } from '@angular/core';
import type {
  AssistantContextManifestDto,
  AttachmentCoverageDto,
  AttachmentSourceLocator,
} from '../../models/attachment.model';

@Component({
  selector: 'app-attachment-coverage',
  standalone: true,
  templateUrl: './attachment-coverage.component.html',
  styleUrl: './attachment-coverage.component.css',
})
export class AttachmentCoverageComponent {
  readonly coverage = input<AttachmentCoverageDto | null>();
  readonly manifest = input<AssistantContextManifestDto | null>();
  locator(value: AttachmentSourceLocator | null): string {
    if (!value) return 'Extensión desconocida';
    switch (value.kind) {
      case 'sheet':
        return `Hoja ${value.sheet}, filas ${value.startRow}–${value.endRow}${value.hidden ? ' (oculta)' : ''}`;
      case 'image':
        return `Imagen ${value.frame}`;
      case 'document':
        return `${value.section}: ${value.start}–${value.end}`;
      case 'pages':
        return `Páginas ${value.start}–${value.end}`;
      case 'lines':
        return `Líneas ${value.start}–${value.end}`;
    }
  }
}
