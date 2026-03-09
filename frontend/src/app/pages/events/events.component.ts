import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventsService } from '../../core/services/events.service';
import { LanguageService } from '../../core/services/language.service';
import { EventFeedbackQuestion, EventItem } from '../../core/models/types';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './events.component.html'
})
export class EventsPageComponent implements OnInit {
  showCreateForm = false;
  events: EventItem[] = [];
  message = '';
  selectedImageFile: File | null = null;
  generatedCode = '';
  generatedEventId: number | null = null;
  generatedEventTitle = '';
  editingEventId: number | null = null;
  selectedEditImageFile: File | null = null;
  editForm = {
    title: '',
    description: '',
    eventDate: '',
    endDate: '',
    location: '',
    imageUrl: ''
  };
  useCustomForm = false;
  customQuestions: EventFeedbackQuestion[] = [];
  questionForm = {
    label: '',
    type: 'text' as 'text' | 'radio' | 'checkbox',
    required: false,
    optionsText: ''
  };
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToastOverlay = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  pendingDeleteEvent: EventItem | null = null;
  showDeleteDialog = false;
  deletingEventId: number | null = null;

  form = {
    title: '',
    description: '',
    eventDate: '',
    endDate: '',
    location: '',
    imageUrl: ''
  };

  constructor(
    private eventsService: EventsService,
    private route: ActivatedRoute,
    private languageService: LanguageService
  ) {}

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  get isSwahili(): boolean {
    return this.languageService.isSwahili;
  }

  ngOnInit(): void {
    const mode = String(this.route.snapshot.queryParamMap.get('mode') || '').toLowerCase();
    this.showCreateForm = mode === 'create';
    this.loadEvents();
  }

  openCreateForm() {
    this.showCreateForm = true;
  }

  closeCreateForm() {
    this.showCreateForm = false;
  }

  loadEvents() {
    this.eventsService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load events.';
      }
    });
  }

  createEvent() {
    this.message = '';
    this.generatedCode = '';
    this.generatedEventId = null;
    this.generatedEventTitle = '';

    const createWithPayload = (payload: typeof this.form) => {
      const customFormSchema = this.useCustomForm && this.customQuestions.length
        ? { version: 1, questions: this.customQuestions }
        : null;

      this.eventsService.createEvent({ ...payload, customFormSchema }).subscribe({
        next: (event) => {
          this.events = [{ ...event, feedback_count: 0 }, ...this.events];
          this.form = {
            title: '',
            description: '',
            eventDate: '',
            endDate: '',
            location: '',
            imageUrl: ''
          };
          this.useCustomForm = false;
          this.customQuestions = [];
          this.questionForm = { label: '', type: 'text', required: false, optionsText: '' };
          this.selectedImageFile = null;
        this.generatedCode = event.event_code;
        this.generatedEventId = event.id;
        this.generatedEventTitle = event.title || 'event';
        this.message = 'Event created successfully.';
        this.showToast('Event created successfully.', 'success');
        this.showCreateForm = false;
      },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to create event.';
          this.showToast(this.message, 'error');
        }
      });
    };

    if (this.selectedImageFile) {
      this.eventsService.uploadEventImage(this.selectedImageFile).subscribe({
        next: ({ imageUrl }) => {
          createWithPayload({ ...this.form, imageUrl });
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to upload image.';
          this.showToast(this.message, 'error');
        }
      });
      return;
    }

    createWithPayload({ ...this.form });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedImageFile = file;
  }

  addCustomQuestion() {
    const label = this.questionForm.label.trim();
    if (!label) {
      this.message = 'Question label is required';
      return;
    }

    let options: string[] | undefined;
    if (this.questionForm.type === 'radio' || this.questionForm.type === 'checkbox') {
      options = this.questionForm.optionsText
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (!options.length) {
        this.message = 'Options are required for radio/checkbox question';
        return;
      }
    }

    const question: EventFeedbackQuestion = {
      id: `q_${Date.now()}_${this.customQuestions.length + 1}`,
      label,
      type: this.questionForm.type,
      required: this.questionForm.required,
      options,
    };

    this.customQuestions = [...this.customQuestions, question];
    this.questionForm = { label: '', type: 'text', required: false, optionsText: '' };
    this.useCustomForm = true;
    this.message = '';
  }

  removeCustomQuestion(index: number) {
    this.customQuestions = this.customQuestions.filter((_, i) => i !== index);
  }

  startEdit(event: EventItem) {
    this.editingEventId = event.id;
    this.selectedEditImageFile = null;
    this.editForm = {
      title: event.title || '',
      description: event.description || '',
      eventDate: event.event_date ? String(event.event_date).slice(0, 10) : '',
      endDate: event.end_date ? String(event.end_date).slice(0, 10) : '',
      location: event.location || '',
      imageUrl: event.image_url || ''
    };
  }

  cancelEdit() {
    this.editingEventId = null;
    this.selectedEditImageFile = null;
    this.editForm = { title: '', description: '', eventDate: '', endDate: '', location: '', imageUrl: '' };
  }

  onEditImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedEditImageFile = file;
  }

  saveEdit(eventId: number) {
    const submitUpdate = (imageUrl?: string) => {
      const payload = imageUrl ? { ...this.editForm, imageUrl } : { ...this.editForm };
      this.eventsService.updateEvent(eventId, payload).subscribe({
        next: (updated) => {
          this.events = this.events.map((event) => (event.id === eventId ? { ...event, ...updated } : event));
          this.message = 'Event updated successfully.';
          this.showToast('Event updated successfully.', 'success');
          this.cancelEdit();
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to update event.';
          this.showToast(this.message, 'error');
        }
      });
    };

    if (this.selectedEditImageFile) {
      this.eventsService.uploadEventImage(this.selectedEditImageFile).subscribe({
        next: ({ imageUrl }) => submitUpdate(imageUrl),
        error: (error) => {
          this.message = error?.error?.message || 'Failed to upload edit image.';
          this.showToast(this.message, 'error');
        }
      });
      return;
    }

    submitUpdate();
  }

  downloadEventPdf(event: EventItem) {
    this.eventsService.downloadEventCodePdf(event.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        link.href = url;
        link.download = `${safeTitle}-${event.event_code || 'code'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to download QR PDF';
        this.showToast(this.message, 'error');
      }
    });
  }

  removeImage(event: EventItem) {
    this.eventsService.removeEventImage(event.id).subscribe({
      next: (updated) => {
        this.events = this.events.map((item) => (item.id === event.id ? { ...item, ...updated } : item));
        if (this.editingEventId === event.id) {
          this.editForm.imageUrl = '';
          this.selectedEditImageFile = null;
        }
        this.message = 'Event image removed successfully.';
        this.showToast('Event image removed successfully.', 'success');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to remove event image.';
        this.showToast(this.message, 'error');
      }
    });
  }

  deleteEvent(event: EventItem) {
    this.pendingDeleteEvent = event;
    this.showDeleteDialog = true;
  }

  confirmDeleteEvent() {
    if (!this.pendingDeleteEvent) {
      return;
    }
    const target = this.pendingDeleteEvent;
    this.deletingEventId = target.id;
    this.eventsService.deleteEvent(target.id).subscribe({
      next: () => {
        this.events = this.events.filter((item) => item.id !== target.id);
        if (this.editingEventId === target.id) {
          this.cancelEdit();
        }
        this.message = 'Event deleted successfully.';
        this.showToast('Event deleted successfully.', 'success');
        this.resetDeleteDialog();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to delete event.';
        this.showToast(this.message, 'error');
        this.resetDeleteDialog();
      }
    });
  }

  cancelDeleteEvent() {
    this.resetDeleteDialog();
  }

  private resetDeleteDialog() {
    this.pendingDeleteEvent = null;
    this.showDeleteDialog = false;
    this.deletingEventId = null;
  }

  downloadGeneratedEventPdf() {
    if (!this.generatedEventId) {
      this.message = 'Create event first to download PDF';
      return;
    }

    this.eventsService.downloadEventCodePdf(this.generatedEventId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = this.generatedEventTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event';
        link.href = url;
        link.download = `${safeTitle}-${this.generatedCode || 'code'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to download PDF';
        this.showToast(this.message, 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastOverlay = true;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.showToastOverlay = false;
    }, 3000);
  }

  isExpired(event: EventItem): boolean {
    if (event.is_expired !== undefined) {
      return Boolean(event.is_expired);
    }
    if (!event.end_date) {
      return false;
    }
    return new Date(event.end_date).getTime() < new Date(new Date().toDateString()).getTime();
  }
}
