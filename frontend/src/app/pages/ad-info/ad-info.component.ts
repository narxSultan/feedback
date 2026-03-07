import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventsService } from '../../core/services/events.service';

@Component({
  selector: 'app-ad-info-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ad-info.component.html'
})
export class AdInfoPageComponent implements OnInit {
  ad: {
    id: number;
    title?: string;
    description?: string;
    image_url: string;
    target_url?: string;
  } | null = null;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private eventsService: EventsService
  ) {}

  ngOnInit() {
    const adId = Number(this.route.snapshot.paramMap.get('adId'));
    if (!adId) {
      this.message = 'Invalid ad reference.';
      return;
    }

    this.eventsService.getPublicAdById(adId).subscribe({
      next: (ad) => {
        this.ad = ad;
      },
      error: (error) => {
        this.message = error?.error?.message || 'Ad not found.';
      }
    });
  }
}
