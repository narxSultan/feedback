import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersPageComponent implements OnInit {
  users: any[] = [];
  activities: any[] = [];
  message = '';
  resetPasswords: Record<number, string> = {};
  showResetPasswords: Record<number, boolean> = {};
  activitiesSearch = '';
  activitiesPage = 0;
  readonly activitiesPerPage = 12;

  constructor(private adminService: AdminService, private languageService: LanguageService) {}

  get isSwahili(): boolean {
    return this.languageService.isSwahili;
  }

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.adminService.getUsers().subscribe({
      next: (users) => (this.users = users),
      error: (error) => (this.message = error?.error?.message || 'Failed to load users')
    });

    this.loadActivities();
  }

  loadActivities() {
    this.adminService.getActivities(this.activitiesSearch).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.activitiesPage = 0;
      },
      error: (error) => (this.message = error?.error?.message || 'Failed to load activities')
    });
  }

  get pagedActivities() {
    const start = this.activitiesPage * this.activitiesPerPage;
    return this.activities.slice(start, start + this.activitiesPerPage);
  }

  get totalActivitiesPages() {
    if (!this.activities.length) {
      return 1;
    }
    return Math.ceil(this.activities.length / this.activitiesPerPage);
  }

  previousActivitiesPage() {
    this.activitiesPage = Math.max(0, this.activitiesPage - 1);
  }

  nextActivitiesPage() {
    this.activitiesPage = Math.min(this.totalActivitiesPages - 1, this.activitiesPage + 1);
  }

  exportActivitiesCsv() {
    if (!this.activities.length) {
      this.message = 'No activities available to export';
      return;
    }

    const headers = ['User Name', 'User Email', 'Activity Type', 'Meta', 'Date'];
    const rows = this.activities.map((act) => [
      String(act.user_name ?? ''),
      String(act.user_email ?? ''),
      String(act.activity_type ?? ''),
      JSON.stringify(act.meta ?? {}),
      String(act.created_at ?? ''),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-activities-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  setRole(userId: number, role: 'user' | 'admin') {
    this.adminService.updateUserRole(userId, role).subscribe({
      next: (updated) => {
        this.users = this.users.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u));
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to update role';
      }
    });
  }

  resetPassword(userId: number) {
    const newPassword = (this.resetPasswords[userId] || '').trim();
    if (!newPassword) {
      this.message = 'Enter new password first';
      return;
    }

    this.adminService.resetUserPassword(userId, newPassword).subscribe({
      next: (res) => {
        this.message = res.message;
        this.resetPasswords[userId] = '';
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to reset password';
      }
    });
  }

  toggleResetPasswordVisibility(userId: number) {
    this.showResetPasswords[userId] = !this.showResetPasswords[userId];
  }
}
