import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserAuthService } from '../../core/services/user-auth.service';
import { UserDashboardService } from '../../core/services/user-dashboard.service';
import { EventsService } from '../../core/services/events.service';
import { EventFeedbackQuestion, EventItem, EventMaterial, UserFeedbackHistoryItem, UserPayment, UserProfile } from '../../core/models/types';

@Component({
  selector: 'app-user-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-dashboard.component.html'
})
export class UserDashboardPageComponent implements OnInit {
  activeSection:
    | 'overview'
    | 'create-event'
    | 'payments'
    | 'profile'
    | 'security'
    | 'events-feedback'
    | 'feedback-history'
    | 'payments-history'
    | 'materials' = 'overview';
  events: EventItem[] = [];
  payments: UserPayment[] = [];
  feedbackHistory: UserFeedbackHistoryItem[] = [];
  selectedFeedbackHistoryItem: UserFeedbackHistoryItem | null = null;
  selectedEventFeedback: any[] = [];
  selectedEventTitle = '';
  selectedEventFeedbackCount = 0;
  selectedEventId: number | null = null;
  editingUserEventId: number | null = null;
  selectedUserEditImageFile: File | null = null;
  userEventEditForm = {
    title: '',
    description: '',
    eventDate: '',
    endDate: '',
    location: '',
    imageUrl: ''
  };
  message = '';
  generatedCode = '';
  generatedEventId: number | null = null;
  generatedEventTitle = '';

  profile: UserProfile | null = null;
  profileForm = {
    name: '',
    organization: '',
    profileImageUrl: ''
  };

  passwordForm = {
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  materialsSearchTerm = '';
  selectedMaterialEvent: EventItem | null = null;
  selectedMaterialFile: File | null = null;
  selectedMaterialCategory = 'presentation';
  eventMaterials: EventMaterial[] = [];
  materialsLoading = false;
  materialsMessage = '';
  isUploadingMaterial = false;
  editingMaterialId: number | null = null;
  materialEditForm = {
    originalName: '',
    category: 'presentation'
  };

  eventForm = {
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

  selectedEventImageFile: File | null = null;
  selectedProfileImageFile: File | null = null;
  readonly eventImageMaxMb = 1.5;
  readonly profileImageMaxMb = 1.0;

  subscriptionAmount = 15;
  donationAmount = 10;
  currency = 'TZS';
  subscriptionPlan: 'weekly' | 'monthly' | 'yearly' = 'monthly';
  subscriptionPrices: Record<'weekly' | 'monthly' | 'yearly', number> = {
    weekly: 5000,
    monthly: 15000,
    yearly: 150000,
  };

  constructor(
    private auth: UserAuthService,
    private dashboard: UserDashboardService,
    private eventsService: EventsService
  ) {}

  get userName() {
    return this.auth.getUserName();
  }

  get isAdminRole() {
    return this.auth.isAdmin();
  }

  get userRole() {
    return this.auth.getRole();
  }

  get userInitials() {
    const parts = (this.profile?.name || this.userName || 'User').trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'U';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase();
  }

  get activeEventsCount(): number {
    return this.events.filter((event) => !this.isExpired(event)).length;
  }

  get hasActiveOverviewData(): boolean {
    return this.activeEventsCount > 0;
  }

  get eventPieSegments() {
    const activeWithFeedback = this.events.filter((event) => !this.isExpired(event) && Number(event.feedback_count || 0) > 0).length;
    const activeNoFeedback = this.events.filter((event) => !this.isExpired(event) && Number(event.feedback_count || 0) === 0).length;
    const expiredWithFeedback = this.events.filter((event) => this.isExpired(event) && Number(event.feedback_count || 0) > 0).length;
    const expiredNoFeedback = this.events.filter((event) => this.isExpired(event) && Number(event.feedback_count || 0) === 0).length;

    const colorPalette = ['#f97316', '#7dd3fc', '#22c55e', '#a78bfa', '#f472b6', '#facc15', '#94a3b8'];

    return [
      { label: 'Active + Feedback', value: activeWithFeedback, color: colorPalette[0] },
      { label: 'Active + No Feedback', value: activeNoFeedback, color: colorPalette[1] },
      { label: 'Expired + Feedback', value: expiredWithFeedback, color: colorPalette[2] },
      { label: 'Expired + No Feedback', value: expiredNoFeedback, color: colorPalette[3] },
    ].filter((segment) => segment.value > 0);
  }

  get eventPieStyle() {
    const segments = this.eventPieSegments;
    if (!segments.length) {
      return 'background:#e5e7eb;';
    }

    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let cursor = 0;
    const parts = segments.map((segment) => {
      const slice = (segment.value / total) * 100;
      const start = cursor;
      const end = cursor + slice;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    });

    return `background: conic-gradient(${parts.join(', ')});`;
  }

  ngOnInit(): void {
    this.load();
    this.loadFeedbackHistory();
  }

  setActiveSection(section: UserDashboardPageComponent['activeSection']) {
    if (this.activeSection === 'materials' && section !== 'materials') {
      this.resetMaterialsSection();
    }
    this.activeSection = section;
  }

  load() {
    this.dashboard.getDashboard().subscribe({
      next: (data) => {
        this.profile = data.profile;
        this.profileForm = {
          name: data.profile?.name || '',
          organization: data.profile?.organization || '',
          profileImageUrl: data.profile?.profile_image_url || ''
        };
        this.events = data.events;
        this.payments = data.payments;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load dashboard';
      }
    });
  }

  get filteredMaterialsEvents() {
    const term = this.materialsSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.events;
    }
    return this.events.filter((event) => {
      const title = (event.title || '').toLowerCase();
      const code = (event.event_code || '').toLowerCase();
      return title.includes(term) || code.includes(term);
    });
  }

  selectMaterialEvent(event: EventItem) {
    this.selectedMaterialEvent = event;
    this.selectedMaterialFile = null;
    this.materialsMessage = '';
    this.loadSelectedEventMaterials(event.id);
    this.cancelMaterialEdit();
  }

  loadSelectedEventMaterials(eventId: number) {
    this.materialsLoading = true;
    this.eventMaterials = [];
    this.eventsService.getEventMaterials(eventId).subscribe({
      next: (response) => {
        this.eventMaterials = response.materials || [];
        this.materialsLoading = false;
      },
      error: (error) => {
        this.materialsLoading = false;
        this.materialsMessage = error?.error?.message || 'Failed to load materials.';
      }
    });
  }

  onMaterialFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedMaterialFile = input.files?.[0] || null;
  }

  uploadSelectedEventMaterial(event: Event) {
    event.preventDefault();
    if (!this.selectedMaterialEvent) {
      this.materialsMessage = 'Select an event first';
      return;
    }
    if (!this.selectedMaterialFile) {
      this.materialsMessage = 'Choose a file first';
      return;
    }

    this.isUploadingMaterial = true;
    this.eventsService.uploadEventMaterial(
      this.selectedMaterialEvent.id,
      this.selectedMaterialFile,
      this.selectedMaterialCategory
    ).subscribe({
      next: (material) => {
        this.eventMaterials = [material, ...this.eventMaterials];
        this.materialsMessage = 'Material uploaded';
        this.selectedMaterialFile = null;
        this.isUploadingMaterial = false;
      },
      error: (error) => {
        this.isUploadingMaterial = false;
        this.materialsMessage = error?.error?.message || 'Failed to upload material.';
      }
    });
  }

  startEditingMaterial(material: EventMaterial) {
    this.editingMaterialId = material.id;
    this.materialEditForm = {
      originalName: material.original_name || '',
      category: material.category || 'presentation'
    };
    this.materialsMessage = '';
  }

  cancelMaterialEdit() {
    this.editingMaterialId = null;
    this.materialEditForm = {
      originalName: '',
      category: 'presentation'
    };
  }

  saveMaterialEdit(material: EventMaterial) {
    if (!this.selectedMaterialEvent) {
      return;
    }
    const trimmedName = (this.materialEditForm.originalName || '').trim();
    if (!trimmedName) {
      this.materialsMessage = 'Enter a material name';
      return;
    }
    this.eventsService.updateEventMaterial(
      this.selectedMaterialEvent.id,
      material.id,
      {
        original_name: trimmedName,
        category: this.materialEditForm.category
      }
    ).subscribe({
      next: (updated) => {
        this.eventMaterials = this.eventMaterials.map((item) => (item.id === updated.id ? updated : item));
        this.materialsMessage = 'Material updated';
        this.cancelMaterialEdit();
      },
      error: (error) => {
        this.materialsMessage = error?.error?.message || 'Failed to update material';
      }
    });
  }

  deleteMaterial(material: EventMaterial) {
    if (!this.selectedMaterialEvent) {
      return;
    }
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }
    this.eventsService.deleteEventMaterial(this.selectedMaterialEvent.id, material.id).subscribe({
      next: () => {
        this.eventMaterials = this.eventMaterials.filter((item) => item.id !== material.id);
        this.materialsMessage = 'Material deleted';
        if (this.editingMaterialId === material.id) {
          this.cancelMaterialEdit();
        }
      },
      error: (error) => {
        this.materialsMessage = error?.error?.message || 'Failed to delete material';
      }
    });
  }

  downloadMaterial(material: EventMaterial) {
    if (!material.file_url) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = material.file_url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  }

  resetMaterialsSection() {
    this.selectedMaterialEvent = null;
    this.selectedMaterialFile = null;
    this.eventMaterials = [];
    this.materialsLoading = false;
    this.materialsMessage = '';
    this.isUploadingMaterial = false;
    this.materialsSearchTerm = '';
    this.selectedMaterialCategory = 'presentation';
    this.cancelMaterialEdit();
  }

  loadFeedbackHistory() {
    this.dashboard.getFeedbackHistory().subscribe({
      next: (rows) => {
        this.feedbackHistory = rows;
        if (this.selectedFeedbackHistoryItem) {
          const matched = rows.find((item) => item.id === this.selectedFeedbackHistoryItem?.id) || null;
          this.selectedFeedbackHistoryItem = matched;
        }
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load feedback history';
      }
    });
  }

  viewFeedbackHistoryDetail(item: UserFeedbackHistoryItem) {
    if (this.selectedFeedbackHistoryItem?.id === item.id) {
      this.selectedFeedbackHistoryItem = null;
      return;
    }
    this.selectedFeedbackHistoryItem = item;
  }

  closeFeedbackHistoryDetail() {
    this.selectedFeedbackHistoryItem = null;
  }

  onEventImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) {
      this.selectedEventImageFile = null;
      return;
    }

    const maxBytes = this.eventImageMaxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      this.selectedEventImageFile = null;
      this.message = `Event image should be <= ${this.eventImageMaxMb}MB`;
      input.value = '';
      return;
    }

    this.selectedEventImageFile = file;
  }

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) {
      this.selectedProfileImageFile = null;
      return;
    }

    const maxBytes = this.profileImageMaxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      this.selectedProfileImageFile = null;
      this.message = `Profile image should be <= ${this.profileImageMaxMb}MB`;
      input.value = '';
      return;
    }

    this.selectedProfileImageFile = file;
  }

  createEvent() {
    this.message = '';
    this.generatedCode = '';
    this.generatedEventId = null;
    this.generatedEventTitle = '';

    const createWithPayload = (payload: typeof this.eventForm) => {
      const customFormSchema = this.useCustomForm && this.customQuestions.length
        ? { version: 1, questions: this.customQuestions }
        : null;

      this.dashboard.createEvent({ ...payload, customFormSchema }).subscribe({
        next: (event) => {
          this.message = 'Event created successfully';
          this.showToast('Event created successfully', 'success');
          this.generatedCode = event?.event_code || '';
          this.generatedEventId = event?.id || null;
          this.generatedEventTitle = event?.title || 'event';
          this.eventForm = { title: '', description: '', eventDate: '', endDate: '', location: '', imageUrl: '' };
          this.useCustomForm = false;
          this.customQuestions = [];
          this.questionForm = { label: '', type: 'text', required: false, optionsText: '' };
          this.selectedEventImageFile = null;
          this.load();
          this.loadFeedbackHistory();
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to create event';
          this.showToast(this.message, 'error');
        }
      });
    };

    if (this.selectedEventImageFile) {
      this.dashboard.uploadEventImage(this.selectedEventImageFile).subscribe({
        next: ({ imageUrl }) => {
          createWithPayload({ ...this.eventForm, imageUrl });
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to upload event image';
          this.showToast(this.message, 'error');
        }
      });
      return;
    }

    createWithPayload({ ...this.eventForm });
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

  viewEventFeedback(eventId: number) {
    if (this.selectedEventId === eventId) {
      this.selectedEventId = null;
      this.selectedEventTitle = '';
      this.selectedEventFeedback = [];
      this.selectedEventFeedbackCount = 0;
      return;
    }

    this.activeSection = 'events-feedback';
    this.selectedEventId = eventId;
    this.dashboard.getEventFeedback(eventId).subscribe({
      next: (res) => {
        this.selectedEventTitle = res.event?.title || '';
        this.selectedEventFeedback = res.feedback;
        this.selectedEventFeedbackCount = res.count;
      },
      error: (error) => {
        this.selectedEventId = null;
        this.message = error?.error?.message || 'Failed to load event feedback';
      }
    });
  }

  startUserEventEdit(event: EventItem) {
    this.editingUserEventId = event.id;
    this.selectedUserEditImageFile = null;
    this.userEventEditForm = {
      title: event.title || '',
      description: event.description || '',
      eventDate: event.event_date ? String(event.event_date).slice(0, 10) : '',
      endDate: event.end_date ? String(event.end_date).slice(0, 10) : '',
      location: event.location || '',
      imageUrl: event.image_url || ''
    };
  }

  cancelUserEventEdit() {
    this.editingUserEventId = null;
    this.selectedUserEditImageFile = null;
    this.userEventEditForm = { title: '', description: '', eventDate: '', endDate: '', location: '', imageUrl: '' };
  }

  onUserEditImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedUserEditImageFile = file;
  }

  saveUserEventEdit(eventId: number) {
    const submitUpdate = (imageUrl?: string) => {
      const payload = imageUrl ? { ...this.userEventEditForm, imageUrl } : { ...this.userEventEditForm };
      this.dashboard.updateEvent(eventId, payload).subscribe({
        next: (updated) => {
          this.events = this.events.map((event) => (event.id === eventId ? { ...event, ...updated } : event));
          this.message = 'Event updated successfully';
          this.showToast('Event updated successfully', 'success');
          this.cancelUserEventEdit();
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to update event';
          this.showToast(this.message, 'error');
        }
      });
    };

    if (this.selectedUserEditImageFile) {
      this.dashboard.uploadEventImage(this.selectedUserEditImageFile).subscribe({
        next: ({ imageUrl }) => submitUpdate(imageUrl),
        error: (error) => {
          this.message = error?.error?.message || 'Failed to upload edit image';
          this.showToast(this.message, 'error');
        }
      });
      return;
    }

    submitUpdate();
  }

  exportSelectedEventFeedbackCsv() {
    if (!this.selectedEventFeedback.length) {
      this.message = 'No selected event feedback to export';
      return;
    }

    const customKeys = new Set<string>();
    this.selectedEventFeedback.forEach((item) => {
      const answers = item?.custom_answers && typeof item.custom_answers === 'object'
        ? Object.keys(item.custom_answers)
        : [];
      answers.forEach((key) => customKeys.add(key));
    });

    const baseHeaders = ['Rating', 'Satisfaction', 'Comment', 'Name', 'Email', 'Date'];
    const headers = [...baseHeaders, ...Array.from(customKeys)];

    const rows = this.selectedEventFeedback.map((item) => {
      const row: string[] = [
        String(item.rating ?? ''),
        String(item.satisfaction ?? ''),
        String(item.comment ?? ''),
        String(item.name ?? ''),
        String(item.email ?? ''),
        String(item.created_at ?? ''),
      ];

      const answers = item?.custom_answers && typeof item.custom_answers === 'object'
        ? item.custom_answers
        : {};

      Array.from(customKeys).forEach((key) => {
        const value = answers[key];
        if (Array.isArray(value)) {
          row.push(value.join(', '));
        } else {
          row.push(String(value ?? ''));
        }
      });

      return row;
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (this.selectedEventTitle || 'event-feedback').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    link.download = `${cleanTitle}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportFeedbackCsv() {
    const customKeys = new Set<string>();
    this.feedbackHistory.forEach((item) => {
      const answers = item?.custom_answers && typeof item.custom_answers === 'object'
        ? Object.keys(item.custom_answers)
        : [];
      answers.forEach((key) => customKeys.add(key));
    });

    const baseHeaders = ['Event', 'Event Code', 'Rating', 'Satisfaction', 'Comment', 'Name', 'Email', 'Date'];
    const headers = [...baseHeaders, ...Array.from(customKeys)];

    const rows = this.feedbackHistory.map((item) => {
      const row: string[] = [
        item.event_title,
        item.event_code,
        String(item.rating),
        item.satisfaction,
        item.comment,
        item.name || '',
        item.email || '',
        item.created_at,
      ];

      const answers = item?.custom_answers && typeof item.custom_answers === 'object'
        ? item.custom_answers
        : {};

      Array.from(customKeys).forEach((key) => {
        const value = answers[key];
        if (Array.isArray(value)) {
          row.push(value.join(', '));
        } else {
          row.push(String(value ?? ''));
        }
      });

      return row;
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  updateProfile() {
    this.dashboard.updateProfile(this.profileForm).subscribe({
      next: (profile) => {
        this.profile = profile;
        localStorage.setItem('user_name', profile.name);
        this.message = 'Profile updated';
        this.showToast('Profile updated', 'success');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to update profile';
        this.showToast(this.message, 'error');
      }
    });
  }

  uploadProfileImage() {
    if (!this.selectedProfileImageFile) {
      this.message = 'Please select profile image first';
      return;
    }

    this.dashboard.uploadProfileImage(this.selectedProfileImageFile).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileForm.profileImageUrl = profile.profile_image_url || '';
        localStorage.setItem('user_profile_image', profile.profile_image_url || '');
        this.message = 'Profile image uploaded';
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to upload profile image';
      }
    });
  }

  changePassword() {
    if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword) {
      this.message = 'Old password and new password are required';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.message = 'New password and confirm password do not match';
      return;
    }

    this.dashboard.changePassword(this.passwordForm.oldPassword, this.passwordForm.newPassword).subscribe({
      next: () => {
        this.passwordForm = { oldPassword: '', newPassword: '', confirmNewPassword: '' };
        this.message = 'Password changed';
        this.showToast('Password changed', 'success');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to change password';
        this.showToast(this.message, 'error');
      }
    });
  }

  paySubscription() {
    this.dashboard.pay('subscription', this.selectedSubscriptionPrice, `${this.subscriptionPlan} plan`).subscribe({
      next: () => {
        this.message = 'Subscription paid';
        this.load();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Subscription payment failed';
      }
    });
  }

  donate() {
    this.dashboard.pay('donation', this.donationAmount, 'User donation').subscribe({
      next: () => {
        this.message = 'Donation successful';
        this.load();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Donation failed';
      }
    });
  }

  get selectedSubscriptionPrice() {
    return this.subscriptionPrices[this.subscriptionPlan];
  }

  proceedSubscriptionPayment() {
    // Placeholder for future payment gateway API redirect.
    this.paySubscription();
  }

  proceedDonationPayment() {
    // Placeholder for future payment gateway API redirect.
    this.donate();
  }

  deletePaymentHistoryItem(paymentId: number) {
    this.dashboard.deletePayment(paymentId).subscribe({
      next: () => {
        this.message = 'Payment history item deleted';
        this.load();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to delete payment history item';
      }
    });
  }

  clearAllPaymentHistory() {
    this.dashboard.clearPaymentHistory().subscribe({
      next: (res) => {
        this.message = `Payment history cleared (${res.deletedCount})`;
        this.load();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to clear payment history';
      }
    });
  }

  logout() {
    this.auth.logout();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('auth_role');
    window.location.href = '/';
  }

  formatAnswer(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }

  downloadGeneratedEventPdf() {
    if (!this.generatedEventId) {
      this.message = 'Create event first to download PDF';
      return;
    }

    this.dashboard.downloadEventCodePdf(this.generatedEventId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (this.generatedEventTitle || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        link.href = url;
        link.download = `${safeTitle}-${this.generatedCode || 'code'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to download PDF';
      }
    });
  }

  downloadEventPdf(event: EventItem) {
    this.dashboard.downloadEventCodePdf(event.id).subscribe({
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

  removeEventImage(event: EventItem) {
    this.dashboard.removeEventImage(event.id).subscribe({
      next: (updated) => {
        this.events = this.events.map((item) => (item.id === event.id ? { ...item, ...updated } : item));
        if (this.editingUserEventId === event.id) {
          this.userEventEditForm.imageUrl = '';
          this.selectedUserEditImageFile = null;
        }
        this.message = 'Event image removed successfully';
        this.showToast('Event image removed successfully', 'success');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to remove event image';
        this.showToast(this.message, 'error');
      }
    });
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

  deleteEvent(event: EventItem) {
    const confirmed = window.confirm(`Delete event "${event.title}"? This will remove all related feedback.`);
    if (!confirmed) {
      return;
    }

    this.dashboard.deleteEvent(event.id).subscribe({
      next: () => {
        this.events = this.events.filter((item) => item.id !== event.id);
        if (this.selectedEventId === event.id) {
          this.selectedEventId = null;
          this.selectedEventTitle = '';
          this.selectedEventFeedback = [];
          this.selectedEventFeedbackCount = 0;
        }
        if (this.editingUserEventId === event.id) {
          this.cancelUserEventEdit();
        }
        this.message = 'Event deleted successfully';
        this.showToast('Event deleted successfully', 'success');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to delete event';
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
}
