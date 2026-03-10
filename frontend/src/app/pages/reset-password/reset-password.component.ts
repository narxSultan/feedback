import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserDashboardService } from '../../core/services/user-dashboard.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordPageComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private route: ActivatedRoute, private dashboard: UserDashboardService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    this.message = '';
    if (!this.token) {
      this.message = 'Invalid reset token';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.message = 'New password must be at least 6 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Passwords do not match';
      return;
    }

    this.dashboard.resetPassword(this.token, this.newPassword).subscribe({
      next: (res: any) => {
        this.message = res?.message || 'Password reset successful';
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to reset password';
      }
    });
  }

  togglePasswordVisibility(field: 'new' | 'confirm') {
    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      return;
    }
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
