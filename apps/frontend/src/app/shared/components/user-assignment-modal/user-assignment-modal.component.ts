import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface AssignableUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-user-assignment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-assignment-modal.component.html',
  styleUrl: './user-assignment-modal.component.css',
})
export class UserAssignmentModalComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) assignedUsers: AssignableUser[] = [];
  @Input({ required: true }) availableUsers: AssignableUser[] = [];

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  selectedUserId = '';

  get unassignedUsers(): AssignableUser[] {
    const assignedIds = new Set(this.assignedUsers.map((u) => u.id));
    return this.availableUsers.filter((u) => !assignedIds.has(u.id));
  }

  onAdd(): void {
    if (this.selectedUserId) {
      this.add.emit(this.selectedUserId);
      this.selectedUserId = '';
    }
  }

  onRemove(userId: string): void {
    this.remove.emit(userId);
  }
}
