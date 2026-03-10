import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { EventsService } from '../../core/services/events.service';
import { LanguageService } from '../../core/services/language.service';
import { EventItem, EventMaterial } from '../../core/models/types';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardPageComponent {
  activeSection: 'overview' | 'feedback' | 'ads' | 'security' | 'actions' | 'materials' = 'overview';
  searchTerm = '';
  feedbacks: any[] = [];
  ads: any[] = [];
  events: EventItem[] = [];
  message = '';
  passwordMessage = '';
  selectedProfileImageFile: File | null = null;
  selectedAdImageFile: File | null = null;
  selectedEditAdImageFile: File | null = null;
  editingAdId: number | null = null;
  profile = {
    name: '',
    email: '',
    profile_image_url: ''
  };
  profileForm = {
    name: '',
    profileImageUrl: ''
  };
  adForm = {
    title: '',
    description: '',
    targetUrl: '',
    endDate: ''
  };
  editAdForm = {
    title: '',
    description: '',
    targetUrl: '',
    endDate: '',
    isActive: true
  };
  passwordForm = {
    newPassword: '',
    confirmNewPassword: ''
  };
  showNewPassword = false;
  showConfirmNewPassword = false;
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
  pendingMaterialToDelete: EventMaterial | null = null;
  showMaterialDeleteDialog = false;
  materialDeletingId: number | null = null;
  pendingAdToDelete: { id: number; title?: string } | null = null;
  showAdDeleteDialog = false;
  adDeletingId: number | null = null;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private languageService: LanguageService,
    private eventsService: EventsService,
    private router: Router
  ) {
    this.loadFeedbacks();
    this.loadProfile();
    this.loadEvents();
    this.loadAds();
  }

  get adminName() {
    return this.authService.getAdminName();
  }

  get adminAvatar() {
    return this.profile.profile_image_url || this.authService.getAdminProfileImage() || 'assets/logo.png';
  }

  get isSwahili(): boolean {
    return this.languageService.isSwahili;
  }

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  setActiveSection(section: 'overview' | 'feedback' | 'ads' | 'security' | 'actions' | 'materials') {
    if (this.activeSection === 'materials' && section !== 'materials') {
      this.resetMaterialsSection();
    }
    this.activeSection = section;
    if (section === 'ads') {
      this.loadAds();
    }
  }

  loadFeedbacks() {
    this.adminService.getPublicFeedback(this.searchTerm).subscribe({
      next: (feedbacks) => {
        this.feedbacks = feedbacks;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load public feedback.';
      }
    });
  }

  loadProfile() {
    this.adminService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = {
          name: profile.name || '',
          email: profile.email || '',
          profile_image_url: profile.profile_image_url || ''
        };
        this.profileForm = {
          name: profile.name || '',
          profileImageUrl: profile.profile_image_url || ''
        };
        localStorage.setItem('admin_name', this.profile.name || 'Admin');
        localStorage.setItem('admin_profile_image', this.profile.profile_image_url || '');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load admin profile.';
      }
    });
  }

  loadAds() {
    this.adminService.getAds().subscribe({
      next: (ads) => {
        this.ads = ads;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to load ads.';
      }
    });
  }

  loadEvents() {
    this.eventsService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
      },
      error: () => {
        this.events = [];
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
    this.materialsMessage = '';
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
      this.materialsMessage = this.isSwahili ? 'Chagua event kwanza' : 'Select an event first';
      return;
    }
    if (!this.selectedMaterialFile) {
      this.materialsMessage = this.isSwahili ? 'Chagua faili kwanza' : 'Choose a file first';
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
        this.materialsMessage = this.isSwahili ? 'Material imepakiwa' : 'Material uploaded';
        this.selectedMaterialFile = null;
        this.isUploadingMaterial = false;
      },
      error: (error) => {
        this.isUploadingMaterial = false;
        this.materialsMessage = error?.error?.message || (this.isSwahili ? 'Imeshindikana kupakia material.' : 'Failed to upload material.');
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
      this.materialsMessage = this.isSwahili ? 'Weka jina la material' : 'Enter a material name';
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
        this.materialsMessage = this.isSwahili ? 'Material imesasishwa' : 'Material updated';
        this.cancelMaterialEdit();
      },
      error: (error) => {
        this.materialsMessage = error?.error?.message || (this.isSwahili ? 'Imeshindikana kusasisha material' : 'Failed to update material');
      }
    });
  }

  deleteMaterial(material: EventMaterial) {
    if (!this.selectedMaterialEvent) {
      return;
    }
    this.pendingMaterialToDelete = material;
    this.showMaterialDeleteDialog = true;
  }

  confirmMaterialDeletion() {
    if (!this.selectedMaterialEvent || !this.pendingMaterialToDelete) {
      this.resetMaterialDeleteDialog();
      return;
    }
    const target = this.pendingMaterialToDelete;
    this.materialDeletingId = target.id;
    this.eventsService.deleteEventMaterial(this.selectedMaterialEvent.id, target.id).subscribe({
      next: () => {
        this.eventMaterials = this.eventMaterials.filter((item) => item.id !== target.id);
        this.materialsMessage = this.isSwahili ? 'Material imefutwa' : 'Material deleted';
        if (this.editingMaterialId === target.id) {
          this.cancelMaterialEdit();
        }
        this.resetMaterialDeleteDialog();
      },
      error: (error) => {
        this.materialsMessage = error?.error?.message || (this.isSwahili ? 'Imeshindikana kufuta material' : 'Failed to delete material');
        this.resetMaterialDeleteDialog();
      }
    });
  }

  cancelMaterialDelete() {
    this.resetMaterialDeleteDialog();
  }

  private resetMaterialDeleteDialog() {
    this.pendingMaterialToDelete = null;
    this.showMaterialDeleteDialog = false;
    this.materialDeletingId = null;
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

  onAdImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedAdImageFile = file;
  }

  createAd() {
    if (!this.selectedAdImageFile) {
      this.message = this.isSwahili ? 'Chagua picha ya tangazo' : 'Select ad image first';
      return;
    }

    this.adminService.uploadAdImage(this.selectedAdImageFile).subscribe({
      next: ({ imageUrl }) => {
        this.adminService.createAd({
          title: this.adForm.title || undefined,
          description: this.adForm.description || undefined,
          targetUrl: this.adForm.targetUrl || undefined,
          endDate: this.adForm.endDate || undefined,
          imageUrl,
          isActive: true
        }).subscribe({
          next: (ad) => {
            this.ads = [ad, ...this.ads];
            this.adForm = { title: '', description: '', targetUrl: '', endDate: '' };
            this.selectedAdImageFile = null;
            this.message = this.isSwahili ? 'Tangazo limeongezwa' : 'Ad created successfully';
          },
          error: (error) => {
            this.message = error?.error?.message || 'Failed to create ad.';
          }
        });
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to upload ad image.';
      }
    });
  }

  startEditAd(ad: any, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.editingAdId = ad.id;
    this.editAdForm = {
      title: ad.title || '',
      description: ad.description || '',
      targetUrl: ad.target_url || '',
      endDate: ad.end_date ? String(ad.end_date).slice(0, 10) : '',
      isActive: ad.is_active !== false
    };
    this.selectedEditAdImageFile = null;
  }

  cancelEditAd() {
    this.editingAdId = null;
    this.selectedEditAdImageFile = null;
    this.editAdForm = { title: '', description: '', targetUrl: '', endDate: '', isActive: true };
  }

  onEditAdImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedEditAdImageFile = file;
  }

  saveAdEdit(adId: number) {
    const submitUpdate = (imageUrl?: string) => {
      this.adminService.updateAd(adId, {
        title: this.editAdForm.title || undefined,
        description: this.editAdForm.description || undefined,
        targetUrl: this.editAdForm.targetUrl || undefined,
        endDate: this.editAdForm.endDate || undefined,
        imageUrl,
        isActive: this.editAdForm.isActive
      }).subscribe({
        next: (updated) => {
          this.ads = this.ads.map((item) => (item.id === adId ? updated : item));
          this.message = this.isSwahili ? 'Tangazo limesasishwa' : 'Ad updated successfully';
          this.cancelEditAd();
        },
        error: (error) => {
          this.message = error?.error?.message || 'Failed to update ad.';
        }
      });
    };

    if (this.selectedEditAdImageFile) {
      this.adminService.uploadAdImage(this.selectedEditAdImageFile).subscribe({
        next: ({ imageUrl }) => submitUpdate(imageUrl),
        error: (error) => {
          this.message = error?.error?.message || 'Failed to upload ad image.';
        }
      });
      return;
    }

    submitUpdate();
  }

  deleteAd(ad: { id: number; title?: string }, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.pendingAdToDelete = ad;
    this.showAdDeleteDialog = true;
  }

  confirmAdDeletion() {
    if (!this.pendingAdToDelete) {
      return;
    }
    this.performAdDeletion(this.pendingAdToDelete);
  }

  cancelAdDelete() {
    this.resetAdDeleteDialog();
  }

  private performAdDeletion(target: { id: number; title?: string }) {
    this.adDeletingId = target.id;
    this.adminService.deleteAd(target.id).subscribe({
      next: () => {
        this.ads = this.ads.filter((ad) => ad.id !== target.id);
        this.message = this.isSwahili ? 'Tangazo limefutwa' : 'Ad deleted successfully';
        this.resetAdDeleteDialog();
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to delete ad.';
        this.resetAdDeleteDialog();
      }
    });
  }

  private resetAdDeleteDialog() {
    this.pendingAdToDelete = null;
    this.showAdDeleteDialog = false;
    this.adDeletingId = null;
  }

  exportPublicFeedbackCsv() {
    if (!this.feedbacks.length) {
      this.message = this.isSwahili ? 'Hakuna feedback ya kuexport' : 'No feedback available to export';
      return;
    }

    const customKeys = new Set<string>();
    this.feedbacks.forEach((item) => {
      const answers = item?.custom_answers && typeof item.custom_answers === 'object'
        ? Object.keys(item.custom_answers)
        : [];
      answers.forEach((key) => customKeys.add(key));
    });

    const baseHeaders = ['Event', 'Event Code', 'Rating', 'Satisfaction', 'Comment', 'Name', 'Email', 'Date'];
    const headers = [...baseHeaders, ...Array.from(customKeys)];

    const rows = this.feedbacks.map((item) => {
      const row: string[] = [
        String(item.event_title ?? ''),
        String(item.event_code ?? ''),
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
    link.download = `public-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  updateProfile() {
    this.adminService.updateMyProfile(this.profileForm).subscribe({
      next: (profile) => {
        this.profile = {
          name: profile.name || '',
          email: profile.email || '',
          profile_image_url: profile.profile_image_url || ''
        };
        localStorage.setItem('admin_name', this.profile.name || 'Admin');
        localStorage.setItem('admin_profile_image', this.profile.profile_image_url || '');
        this.message = this.isSwahili ? 'Profile imesasishwa' : 'Profile updated';
      },
      error: (error) => {
        this.message = error?.error?.message || (this.isSwahili ? 'Imeshindikana kusasisha profile' : 'Failed to update profile');
      }
    });
  }

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedProfileImageFile = file;
  }

  uploadProfileImage() {
    if (!this.selectedProfileImageFile) {
      this.message = this.isSwahili ? 'Chagua picha kwanza' : 'Select image first';
      return;
    }

    this.adminService.uploadProfileImage(this.selectedProfileImageFile).subscribe({
      next: (profile) => {
        this.profile.profile_image_url = profile.profile_image_url || '';
        this.profileForm.profileImageUrl = profile.profile_image_url || '';
        localStorage.setItem('admin_profile_image', this.profile.profile_image_url || '');
        this.message = this.isSwahili ? 'Picha ya profile imewekwa' : 'Profile image uploaded';
        this.selectedProfileImageFile = null;
      },
      error: (error) => {
        this.message = error?.error?.message || (this.isSwahili ? 'Imeshindikana kupakia picha' : 'Failed to upload profile image');
      }
    });
  }

  changePassword() {
    this.passwordMessage = '';

    if (!this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
      this.passwordMessage = this.isSwahili ? 'Jaza taarifa zote za password' : 'Fill all password fields';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordMessage = this.isSwahili ? 'Password iwe angalau herufi 6' : 'Password must be at least 6 characters';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.passwordMessage = this.isSwahili ? 'Password hazifanani' : 'Passwords do not match';
      return;
    }

    this.adminService.changeMyPassword(this.passwordForm.newPassword).subscribe({
      next: (response) => {
        this.passwordForm = { newPassword: '', confirmNewPassword: '' };
        this.passwordMessage = response.message;
      },
      error: (error) => {
        this.passwordMessage = error?.error?.message || (this.isSwahili ? 'Imeshindikana kubadili password' : 'Failed to update password');
      }
    });
  }

  togglePasswordVisibility(field: 'new' | 'confirm') {
    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      return;
    }
    this.showConfirmNewPassword = !this.showConfirmNewPassword;
  }

  formatAnswer(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }

  isAdExpired(ad: any): boolean {
    if (ad?.is_expired !== undefined) {
      return Boolean(ad.is_expired);
    }
    if (!ad?.end_date) {
      return false;
    }
    return new Date(ad.end_date).getTime() < new Date(new Date().toDateString()).getTime();
  }

  isEventExpired(event: EventItem): boolean {
    if (event.is_expired !== undefined) {
      return Boolean(event.is_expired);
    }
    if (!event.end_date) {
      return false;
    }
    return new Date(event.end_date).getTime() < new Date(new Date().toDateString()).getTime();
  }

  get activeEventsCount(): number {
    return this.events.filter((event) => !this.isEventExpired(event)).length;
  }

  get activeAdsCount(): number {
    return this.ads.filter((ad) => ad?.is_active !== false && !this.isAdExpired(ad)).length;
  }

  get hasActiveOverviewData(): boolean {
    return this.activeEventsCount > 0 || this.activeAdsCount > 0;
  }

  get chartMaxValue(): number {
    return Math.max(1, this.activeEventsCount, this.activeAdsCount);
  }

  get eventsChartHeight(): string {
    return `${Math.max(18, (this.activeEventsCount / this.chartMaxValue) * 100)}%`;
  }

  get adsChartHeight(): string {
    return `${Math.max(18, (this.activeAdsCount / this.chartMaxValue) * 100)}%`;
  }
}
