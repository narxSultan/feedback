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
  message = '';

  constructor(private dashboard: UserDashboardService) {}

  submit() {
    this.message = '';
    this.dashboard.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        this.message = res?.resetLink
          ? `Reset link (dev): ${res.resetLink}`
          : (res?.message || 'If the email exists, a reset link has been sent.');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Failed to process request';
      }
    });
  }
}
