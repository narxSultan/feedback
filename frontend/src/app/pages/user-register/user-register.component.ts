import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserAuthService } from '../../core/services/user-auth.service';

@Component({
  selector: 'app-user-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-register.component.html'
})
export class UserRegisterPageComponent {
  form = {
    name: '',
    email: '',
    password: '',
    organization: ''
  };
  message = '';
  showPassword = false;

  constructor(private auth: UserAuthService, private router: Router) {}

  submit() {
    this.message = '';
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigateByUrl('/user-dashboard'),
      error: (error) => {
        this.message = error?.error?.message || 'Registration failed';
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
