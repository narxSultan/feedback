import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserAuthService } from '../../core/services/user-auth.service';

@Component({
  selector: 'app-user-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-login.component.html'
})
export class UserLoginPageComponent {
  email = '';
  password = '';
  message = '';
  showPassword = false;

  constructor(private auth: UserAuthService, private router: Router) {}

  submit() {
    this.message = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        if (response.user.role === 'admin') {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.router.navigateByUrl('/user-dashboard');
      },
      error: (error) => {
        this.message = error?.error?.message || 'Login failed';
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
