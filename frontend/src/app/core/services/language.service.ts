import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'feedback_system_language_is_swahili';
  private readonly state$ = new BehaviorSubject<boolean>(this.loadFromStorage());

  get isSwahili$() {
    return this.state$.asObservable();
  }

  get isSwahili(): boolean {
    return this.state$.getValue();
  }

  toggleLanguage() {
    this.setLanguage(!this.isSwahili);
  }

  setLanguage(value: boolean) {
    localStorage.setItem(this.STORAGE_KEY, value ? '1' : '0');
    this.state$.next(value);
  }

  private loadFromStorage(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === '1') {
      return true;
    }
    if (stored === '0') {
      return false;
    }
    return false;
  }
}
