import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserDashboardService } from '../../core/services/user-dashboard.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordPageComponent {
  email = '';
  resetToken = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  isError = false;
  step: 'email' | 'reset' | 'done' = 'email';
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private dashboard: UserDashboardService) {}

  submit() {
    this.message = '';
    this.isError = false;
    this.resetToken = '';
    this.dashboard.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        if (res?.emailExists && res?.resetToken) {
          this.resetToken = String(res.resetToken);
          this.step = 'reset';
          this.message = res?.message || 'Email verified. Set your new password.';
          this.isError = false;
          return;
        }

        this.step = 'email';
        this.message = res?.message || 'Email not found';
        this.isError = true;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to process request';
        this.isError = true;
      }
    });
  }

  saveNewPassword() {
    this.message = '';
    this.isError = false;
    if (!this.resetToken) {
      this.message = 'Invalid reset request';
      this.isError = true;
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.message = 'New password must be at least 6 characters';
      this.isError = true;
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Passwords do not match';
      this.isError = true;
      return;
    }

    this.dashboard.resetPassword(this.resetToken, this.newPassword).subscribe({
      next: (res: any) => {
        this.step = 'done';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showNewPassword = false;
        this.showConfirmPassword = false;
        this.message = res?.message || 'Password reset successful';
        this.isError = false;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to reset password';
        this.isError = true;
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
