import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { ApiBaseService } from './api-base.service';
import { UserLoginPayload, UserProfile, UserRegisterPayload } from '../models/types';

@Injectable({ providedIn: 'root' })
export class UserAuthService {
  constructor(private http: HttpClient, private api: ApiBaseService) {}

  register(payload: UserRegisterPayload) {
    return this.http.post<{ token: string; user: UserProfile }>(`${this.api.baseUrl}/users/register`, payload).pipe(
      tap((response) => {
        localStorage.setItem('user_token', response.token);
        localStorage.setItem('user_name', response.user.name);
        localStorage.setItem('user_role', response.user.role);
      })
    );
  }

  login(payload: UserLoginPayload) {
    return this.http.post<{ token: string; user: UserProfile }>(`${this.api.baseUrl}/users/login`, payload).pipe(
      tap((response) => {
        localStorage.setItem('user_token', response.token);
        localStorage.setItem('user_name', response.user.name);
        localStorage.setItem('user_role', response.user.role);
        localStorage.setItem('user_profile_image', response.user.profile_image_url || '');
        if (response.user.role === 'admin') {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('admin_name', response.user.name);
          localStorage.setItem('admin_email', response.user.email);
          localStorage.setItem('admin_profile_image', response.user.profile_image_url || '');
          localStorage.setItem('auth_role', 'admin');
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile_image');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('user_token');
  }

  getToken(): string | null {
    return localStorage.getItem('user_token');
  }

  getUserName(): string {
    return localStorage.getItem('user_name') || 'User';
  }

  getRole(): string {
    return localStorage.getItem('user_role') || 'user';
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }
}
