import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { ApiBaseService } from './api-base.service';
import { AdminLoginPayload } from '../models/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private api: ApiBaseService) {}

  login(payload: AdminLoginPayload) {
    return this.http.post<{ token: string; admin: { id: number; name: string; email: string; profile_image_url?: string } }>(
      `${this.api.baseUrl}/admin/login`,
      payload
    ).pipe(
      tap((response) => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_profile_image');
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('session_token', response.token);
        localStorage.setItem('session_type', 'admin');
        localStorage.setItem('admin_name', response.admin.name);
        localStorage.setItem('admin_email', response.admin.email);
        localStorage.setItem('admin_profile_image', response.admin.profile_image_url || '');
        localStorage.setItem('auth_role', 'admin');
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_type');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_profile_image');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile_image');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getAdminName(): string {
    return localStorage.getItem('admin_name') || 'Admin';
  }

  getAdminProfileImage(): string {
    return localStorage.getItem('admin_profile_image') || '';
  }

  isAdmin(): boolean {
    return localStorage.getItem('auth_role') === 'admin';
  }
}
