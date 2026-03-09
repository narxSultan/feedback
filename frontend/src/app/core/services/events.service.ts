import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { AuthService } from './auth.service';
import { UserAuthService } from './user-auth.service';
import { EventItem, EventPayload, EventMaterialsResponse, EventMaterial } from '../models/types';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    private http: HttpClient,
    private api: ApiBaseService,
    private auth: AuthService,
    private userAuth: UserAuthService
  ) {}

  private authHeaders() {
    const token = this.auth.getToken() || this.userAuth.getToken() || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getEvents() {
    return this.http.get<EventItem[]>(`${this.api.baseUrl}/events`, {
      headers: this.authHeaders()
    });
  }

  getEventByCode(eventCode: string) {
    return this.http.get<EventItem>(`${this.api.baseUrl}/events/code/${encodeURIComponent(eventCode)}`);
  }

  getPublicEventSlides() {
    return this.http.get<Array<{
      id: number;
      title: string;
      image_url: string;
      event_code?: string;
      description?: string;
      target_url?: string;
      end_date?: string;
      is_expired?: boolean;
      slide_type: 'event' | 'ad';
      created_at: string;
    }>>(
      `${this.api.baseUrl}/events/public`
    );
  }

  getPublicAdById(adId: number) {
    return this.http.get<{
      id: number;
      title?: string;
      description?: string;
      image_url: string;
      target_url?: string;
      is_active: boolean;
      end_date?: string;
      is_expired?: boolean;
      created_at: string;
    }>(`${this.api.baseUrl}/events/ad/${adId}`);
  }

  createEvent(payload: EventPayload) {
    return this.http.post<EventItem>(`${this.api.baseUrl}/events`, payload, {
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

  uploadEventImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ imageUrl: string }>(`${this.api.baseUrl}/events/upload-image`, formData, {
      headers: this.authHeaders()
    });
  }

  downloadEventCodePdf(eventId: number) {
    return this.http.get(`${this.api.baseUrl}/events/${eventId}/code-pdf`, {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  getEventMaterials(eventId: number) {
    return this.http.get<EventMaterialsResponse>(`${this.api.baseUrl}/events/${eventId}/materials`);
  }

  downloadEventMaterialsZip(eventId: number, ids?: number[]) {
    const options: {
      responseType: 'blob';
      params?: HttpParams;
    } = { responseType: 'blob' };

    if (ids?.length) {
      options.params = new HttpParams().set('ids', ids.join(','));
    }

    return this.http.get(`${this.api.baseUrl}/events/${eventId}/materials/zip`, options);
  }

  uploadEventMaterial(eventId: number, file: File, category?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (category) {
      formData.append('category', category);
    }
    return this.http.post<EventMaterial>(`${this.api.baseUrl}/events/${eventId}/materials`, formData, {
      headers: this.authHeaders()
    });
  }
}
