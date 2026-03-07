import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FeedbackService } from '../../core/services/feedback.service';
import { FeedbackItem } from '../../core/models/types';

@Component({
  selector: 'app-event-feedback-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-feedback.component.html'
})
export class EventFeedbackPageComponent implements OnInit {
  feedbackList: FeedbackItem[] = [];
  eventId = 0;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private feedbackService: FeedbackService
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    this.loadFeedback();
  }

  loadFeedback() {
    this.feedbackService.getByEvent(this.eventId).subscribe({
      next: (items) => {
        this.feedbackList = items;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Unable to load event feedback.';
      }
    });
  }

  formatAnswer(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }
}
