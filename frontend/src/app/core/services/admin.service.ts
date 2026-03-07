import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(
    private http: HttpClient,
    private api: ApiBaseService,
    private auth: AuthService
  ) {}

  private authHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken() || ''}`
    });
  }

  getUsers() {
    return this.http.get<any[]>(`${this.api.baseUrl}/admin/users`, {
      headers: this.authHeaders()
    });
  }

  getMyProfile() {
    return this.http.get<{ id: number; name: string; email: string; profile_image_url?: string; created_at?: string }>(
      `${this.api.baseUrl}/admin/me`,
      { headers: this.authHeaders() }
    );
  }

  updateMyProfile(payload: { name?: string; profileImageUrl?: string }) {
    return this.http.put<{ id: number; name: string; email: string; profile_image_url?: string; created_at?: string }>(
      `${this.api.baseUrl}/admin/me`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ id: number; name: string; email: string; profile_image_url?: string; created_at?: string }>(
      `${this.api.baseUrl}/admin/upload-profile-image`,
      formData,
      { headers: this.authHeaders() }
    );
  }

  updateUserRole(userId: number, role: 'user' | 'admin') {
    return this.http.patch<any>(`${this.api.baseUrl}/admin/users/${userId}/role`, { role }, {
      headers: this.authHeaders()
    });
  }

  resetUserPassword(userId: number, newPassword: string) {
    return this.http.patch<{ message: string; user: { id: number; name: string; email: string } }>(
      `${this.api.baseUrl}/admin/users/${userId}/reset-password`,
      { newPassword },
      { headers: this.authHeaders() }
    );
  }

  changeMyPassword(newPassword: string) {
    return this.http.patch<{ message: string }>(
      `${this.api.baseUrl}/admin/change-password`,
      { newPassword },
      { headers: this.authHeaders() }
    );
  }

  getActivities(search = '') {
    return this.http.get<any[]>(`${this.api.baseUrl}/admin/activities`, {
      headers: this.authHeaders(),
      params: { search }
    });
  }

  getPublicFeedback(search = '') {
    return this.http.get<any[]>(`${this.api.baseUrl}/admin/public-feedback`, {
      headers: this.authHeaders(),
      params: { search }
    });
  }

  getAds() {
    return this.http.get<any[]>(`${this.api.baseUrl}/admin/ads`, {
      headers: this.authHeaders()
    });
  }

  createAd(payload: { title?: string; description?: string; imageUrl: string; targetUrl?: string; isActive?: boolean; endDate?: string }) {
    return this.http.post<any>(`${this.api.baseUrl}/admin/ads`, payload, {
      headers: this.authHeaders()
    });
  }

  updateAd(adId: number, payload: { title?: string; description?: string; imageUrl?: string; targetUrl?: string; isActive?: boolean; endDate?: string }) {
    return this.http.patch<any>(`${this.api.baseUrl}/admin/ads/${adId}`, payload, {
      headers: this.authHeaders()
    });
  }

  deleteAd(adId: number) {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/admin/ads/${adId}`, {
      headers: this.authHeaders()
    });
  }

  uploadAdImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ imageUrl: string }>(`${this.api.baseUrl}/admin/ads/upload-image`, formData, {
      headers: this.authHeaders()
    });
  }
}
