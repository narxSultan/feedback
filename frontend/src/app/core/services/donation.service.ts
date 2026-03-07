import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { DonationPayload } from '../models/types';

@Injectable({ providedIn: 'root' })
export class DonationService {
  constructor(private http: HttpClient, private api: ApiBaseService) {}

  donate(payload: DonationPayload) {
    return this.http.post(`${this.api.baseUrl}/donate`, payload);
  }
}
