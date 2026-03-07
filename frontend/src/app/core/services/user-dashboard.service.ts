import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { UserAuthService } from './user-auth.service';
import { EventItem, EventPayload, UserFeedbackHistoryItem, UserPayment, UserProfile } from '../models/types';

@Injectable({ providedIn: 'root' })
export class UserDashboardService {
  constructor(
    private http: HttpClient,
    private api: ApiBaseService,
    private auth: UserAuthService
  ) {}

  private authHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken() || ''}`
    });
  }

  getDashboard() {
    return this.http.get<{ profile: UserProfile; events: any[]; payments: UserPayment[] }>(`${this.api.baseUrl}/users/dashboard`, {
      headers: this.authHeaders()
    });
  }

  createEvent(payload: EventPayload) {
    return this.http.post<EventItem>(`${this.api.baseUrl}/users/events`, payload, {
      headers: this.authHeaders()
    });
  }

  updateEvent(eventId: number, payload: EventPayload) {
    return this.http.patch<EventItem>(`${this.api.baseUrl}/events/${eventId}`, payload, {
      headers: this.authHeaders()
    });
  }

  removeEventImage(eventId: number) {
    return this.http.patch<EventItem>(`${this.api.baseUrl}/events/${eventId}/remove-image`, {}, {
      headers: this.authHeaders()
    });
  }

  deleteEvent(eventId: number) {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/events/${eventId}`, {
      headers: this.authHeaders()
    });
  }

  pay(paymentType: 'subscription' | 'donation', amount: number, note?: string) {
    return this.http.post(`${this.api.baseUrl}/users/payments`, { paymentType, amount, note }, {
      headers: this.authHeaders()
    });
  }

  uploadEventImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ imageUrl: string }>(`${this.api.baseUrl}/users/upload-event-image`, formData, {
      headers: this.authHeaders()
    });
  }

  downloadEventCodePdf(eventId: number) {
    return this.http.get(`${this.api.baseUrl}/events/${eventId}/code-pdf`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  getEventFeedback(eventId: number) {
    return this.http.get<{ event: any; feedback: any[]; count: number }>(`${this.api.baseUrl}/users/events/${eventId}/feedback`, {
      headers: this.authHeaders()
    });
  }

  getFeedbackHistory() {
    return this.http.get<UserFeedbackHistoryItem[]>(`${this.api.baseUrl}/users/feedback-history`, {
      headers: this.authHeaders()
    });
  }

  updateProfile(payload: { name?: string; organization?: string; profileImageUrl?: string }) {
    return this.http.put<UserProfile>(`${this.api.baseUrl}/users/me`, payload, {
      headers: this.authHeaders()
    });
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<UserProfile>(`${this.api.baseUrl}/users/upload-profile-image`, formData, {
      headers: this.authHeaders()
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch<{ message: string }>(`${this.api.baseUrl}/users/change-password`, {
      currentPassword,
      newPassword,
    }, {
      headers: this.authHeaders()
    });
  }

  deletePayment(paymentId: number) {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/users/payments/${paymentId}`, {
      headers: this.authHeaders()
    });
  }

  clearPaymentHistory() {
    return this.http.delete<{ message: string; deletedCount: number }>(`${this.api.baseUrl}/users/payments`, {
      headers: this.authHeaders()
    });
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string; resetLink?: string }>(`${this.api.baseUrl}/users/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.api.baseUrl}/users/reset-password`, { token, newPassword });
  }
}
