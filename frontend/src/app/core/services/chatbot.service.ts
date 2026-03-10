import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiBaseService } from './api-base.service';
import { ChatbotAskResponse } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private http: HttpClient, private api: ApiBaseService) {}

  askQuestion(message: string, language: 'en' | 'sw') {
    return this.http.post<ChatbotAskResponse>(`${this.api.baseUrl}/chatbot/ask`, {
      message,
      language,
    });
  }
}
