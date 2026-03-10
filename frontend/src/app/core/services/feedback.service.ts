import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { AuthService } from './auth.service';
import { FeedbackItem, FeedbackPayload } from '../models/types';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(
    private http: HttpClient,
    private api: ApiBaseService,
    private auth: AuthService
  ) {}

  submitFeedback(payload: FeedbackPayload) {
    return this.http.post(`${this.api.baseUrl}/feedback`, payload);
  }

  getByEvent(eventId: number) {
    const token = this.auth.getToken();
    return this.http.get<FeedbackItem[]>(`${this.api.baseUrl}/feedback/event/${eventId}`, {
      headers: token
        ? new HttpHeaders({ Authorization: `Bearer ${token}` })
        : new HttpHeaders()
    });
  }
}
