import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FeedbackService } from '../../core/services/feedback.service';
import { EventsService } from '../../core/services/events.service';
import { AuthService } from '../../core/services/auth.service';
import { UserAuthService } from '../../core/services/user-auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ChatbotService } from '../../core/services/chatbot.service';
import { EventFeedbackQuestion, EventItem, EventMaterial } from '../../core/models/types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './landing.component.html'
})
export class LandingPageComponent implements OnInit, OnDestroy {
  isAdminViewer = false;
  eventCode = '';
  eventInfo: EventItem | null = null;
  eventLookupMessage = '';
  eventMaterials: EventMaterial[] = [];
  materialsLoading = false;
  materialsError = '';
  isDownloadingMaterialsZip = false;
  selectedMaterialFile: File | null = null;
  selectedMaterialCategory = 'presentation';
  materialsUploadMessage = '';
  isUploadingMaterial = false;
  activePanel: 'image' | 'materials' = 'image';
  @ViewChild('materialFileInput') materialFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef<HTMLDivElement>;
  private codeLookupTimeout: ReturnType<typeof setTimeout> | null = null;
  private slideTimer: ReturnType<typeof setInterval> | null = null;
  private chatbotReplyTimer: ReturnType<typeof setTimeout> | null = null;
  activeSlide = 0;
  defaultSlides: Array<{ id?: number; title: string; image: string; description?: string; eventCode?: string; targetUrl?: string; slideType?: 'event' | 'ad' | 'default' }> = [
    {
      title: 'Conference',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Workshop',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'
    },
  ];
  eventSlides: Array<{ id?: number; title: string; image: string; description?: string; eventCode?: string; targetUrl?: string; slideType?: 'event' | 'ad' | 'default' }> = [...this.defaultSlides];

  feedbackForm = {
    rating: 5,
    satisfaction: 'Very Satisfied',
    comment: '',
    name: '',
    email: ''
  };
  customAnswers: Record<string, string | string[]> = {};
  questionPage = 0;
  readonly questionsPerPage = 3;

  feedbackMessage = '';
  isChatbotOpen = false;
  isSendingChatbot = false;
  chatbotInput = '';
  chatbotMessages: Array<{ sender: 'bot' | 'user'; text: string }> = [];

  get isSwahili(): boolean {
    return this.languageService.isSwahili;
  }

  constructor(
    private feedbackService: FeedbackService,
    private eventsService: EventsService,
    private authService: AuthService,
    private userAuthService: UserAuthService,
    private languageService: LanguageService,
    private chatbotService: ChatbotService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.isAdminViewer = localStorage.getItem('auth_role') === 'admin';
    if (this.isAdminViewer) {
      this.feedbackForm.name = localStorage.getItem('admin_name') || '';
      this.feedbackForm.email = localStorage.getItem('admin_email') || '';
    }

    this.eventsService.getPublicEventSlides().subscribe({
      next: (events) => {
        const createdEventSlides = events
          .map((item) => ({
            id: item.id,
            title: item.title || 'Event',
            image: item.image_url || 'assets/logo1.png',
            description: item.description || undefined,
            eventCode: item.event_code,
            targetUrl: item.target_url || undefined,
            slideType: item.slide_type || 'event',
          }));

        this.eventSlides = [...createdEventSlides, ...this.defaultSlides];
        this.activeSlide = 0;
      },
      error: () => {
        this.eventSlides = [...this.defaultSlides];
      }
    });

    this.slideTimer = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.eventSlides.length;
    }, 3500);

    const codeFromQuery = String(this.route.snapshot.queryParamMap.get('eventCode') || '').trim();
    if (codeFromQuery) {
      this.eventCode = codeFromQuery.toUpperCase();
      this.onEventCodeChange(this.eventCode);
    }
  }

  toggleLanguage() {
    const wasSwahili = this.isSwahili;
    this.languageService.toggleLanguage();
    this.handleChatbotLanguageChange(wasSwahili);
  }

  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    if (this.isChatbotOpen) {
      this.ensureChatbotWelcomeMessage();
      this.queueChatScrollToBottom();
    }
  }

  closeChatbot() {
    this.isChatbotOpen = false;
  }

  ngOnDestroy() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
    if (this.codeLookupTimeout) {
      clearTimeout(this.codeLookupTimeout);
    }
    if (this.chatbotReplyTimer) {
      clearTimeout(this.chatbotReplyTimer);
    }
  }

  get donationLink(): string {
    if (!this.eventCode.trim()) {
      return 'https://example.com/donate';
    }

    return `https://example.com/donate?eventCode=${encodeURIComponent(this.eventCode.trim())}`;
  }

  get isAdminLoggedIn(): boolean {
    return this.authService.isAuthenticated() && this.authService.isAdmin();
  }

  get isUserOrAdminLoggedIn(): boolean {
    return this.isAdminLoggedIn || this.userAuthService.isAuthenticated();
  }

  get heroTitle(): string {
    if (this.eventInfo?.title) {
      return this.eventInfo.title;
    }
    return this.isSwahili ? 'Toa maoni yako kuhusu event/bidhaa' : 'Share your event/product experience';
  }

  onEventCodeChange(value: string) {
    this.eventCode = value.toUpperCase();
    this.eventInfo = null;
    this.eventLookupMessage = '';
    this.resetMaterials();
    this.customAnswers = {};
    this.questionPage = 0;

    if (this.codeLookupTimeout) {
      clearTimeout(this.codeLookupTimeout);
    }

    const trimmed = this.eventCode.trim();
    if (!trimmed) {
      return;
    }

    this.codeLookupTimeout = setTimeout(() => {
      this.eventsService.getEventByCode(trimmed).subscribe({
        next: (event) => {
          this.eventInfo = event;
          this.eventLookupMessage = '';
          this.questionPage = 0;
          this.activePanel = 'image';
          this.loadEventMaterials(event.id);
        },
        error: (error) => {
          this.eventInfo = null;
          this.eventLookupMessage = error?.error?.message || (this.isSwahili
            ? 'Hakuna event iliyopatikana kwa code hiyo.'
            : 'No event found with that code.');
        }
      });
    }, 350);
  }

  get showSlider(): boolean {
    return !this.eventInfo;
  }

  onSlideClick(slide: { id?: number; title: string; image: string; description?: string; eventCode?: string; targetUrl?: string; slideType?: 'event' | 'ad' | 'default' }) {
    if (slide.slideType === 'ad') {
      if (slide.targetUrl) {
        window.open(slide.targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (slide.id) {
        this.router.navigateByUrl(`/ad-info/${slide.id}`);
        return;
      }
    }
    if (slide.eventCode) {
      this.onEventCodeChange(slide.eventCode);
    }
  }

  get currentSlide() {
    return this.eventSlides[this.activeSlide];
  }

  onSlideReadMore(event: MouseEvent) {
    event.stopPropagation();
    const slide = this.currentSlide;
    if (!slide || slide.slideType !== 'ad') {
      return;
    }
    if (slide.targetUrl) {
      window.open(slide.targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (slide.id) {
      this.router.navigateByUrl(`/ad-info/${slide.id}`);
    }
  }

  get canUploadMaterials(): boolean {
    return !!this.eventInfo && !this.eventInfo.is_expired && (this.isAdminViewer || this.userAuthService.isAuthenticated());
  }

  get customQuestions(): EventFeedbackQuestion[] {
    return this.eventInfo?.feedback_form_schema?.questions || [];
  }

  get pagedCustomQuestions(): EventFeedbackQuestion[] {
    const start = this.questionPage * this.questionsPerPage;
    return this.customQuestions.slice(start, start + this.questionsPerPage);
  }

  get totalQuestionPages(): number {
    if (!this.customQuestions.length) {
      return 1;
    }
    return Math.ceil(this.customQuestions.length / this.questionsPerPage);
  }

  goToPreviousQuestionPage() {
    this.questionPage = Math.max(0, this.questionPage - 1);
  }

  goToNextQuestionPage() {
    this.questionPage = Math.min(this.totalQuestionPages - 1, this.questionPage + 1);
  }

  get hasCustomForm(): boolean {
    return this.customQuestions.length > 0;
  }

  updateCheckboxAnswer(questionId: string, option: string, checked: boolean) {
    const current = Array.isArray(this.customAnswers[questionId]) ? [...(this.customAnswers[questionId] as string[])] : [];
    const next = checked
      ? Array.from(new Set([...current, option]))
      : current.filter((item) => item !== option);
    this.customAnswers[questionId] = next;
  }

  isCheckboxChecked(questionId: string, option: string): boolean {
    const current = this.customAnswers[questionId];
    return Array.isArray(current) && current.includes(option);
  }

  private isQuestionAnswered(question: EventFeedbackQuestion): boolean {
    const value = this.customAnswers[question.id];
    if (question.type === 'checkbox') {
      return Array.isArray(value) && value.length > 0;
    }
    return String(value || '').trim().length > 0;
  }

  submitFeedback() {
    this.feedbackMessage = '';

    if (!this.eventCode.trim()) {
      this.feedbackMessage = this.isSwahili ? 'Weka Event Code kwanza.' : 'Please enter Event Code first.';
      return;
    }

    if (this.hasCustomForm) {
      const missingRequired = this.customQuestions.some((question) => question.required && !this.isQuestionAnswered(question));
      if (missingRequired) {
        this.feedbackMessage = this.isSwahili
          ? 'Jibu maswali yote muhimu yaliyowekwa.'
          : 'Please answer all required custom questions.';
        return;
      }
    }

    this.feedbackService.submitFeedback({
      eventCode: this.eventCode,
      rating: this.hasCustomForm ? undefined : Number(this.feedbackForm.rating),
      satisfaction: this.hasCustomForm ? undefined : this.feedbackForm.satisfaction,
      comment: this.hasCustomForm ? undefined : this.feedbackForm.comment,
      name: this.feedbackForm.name || undefined,
      email: this.feedbackForm.email || undefined,
      customAnswers: this.hasCustomForm ? this.customAnswers : undefined
    }).subscribe({
      next: () => {
        this.feedbackMessage = this.isSwahili
          ? 'Maoni yametumwa kikamilifu.'
          : 'Feedback submitted successfully.';
        this.feedbackForm.comment = '';
        this.feedbackForm.name = '';
        this.feedbackForm.email = '';
        this.customAnswers = {};
      },
      error: (error) => {
        this.feedbackMessage = error?.error?.message || 'Failed to submit feedback.';
      }
    });
  }

  sendChatbotMessage(event?: Event) {
    event?.preventDefault();

    const question = this.chatbotInput.trim();
    if (!question || this.isSendingChatbot) {
      return;
    }

    this.chatbotMessages = [...this.chatbotMessages, { sender: 'user', text: question }];
    this.chatbotInput = '';
    this.isSendingChatbot = true;
    this.queueChatScrollToBottom();
    const startedAt = Date.now();

    const showReplyWithLoadingDelay = (reply: string) => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 2000 - elapsed);

      if (this.chatbotReplyTimer) {
        clearTimeout(this.chatbotReplyTimer);
      }

      this.chatbotReplyTimer = setTimeout(() => {
        this.isSendingChatbot = false;
        this.chatbotMessages = [...this.chatbotMessages, { sender: 'bot', text: reply }];
        this.queueChatScrollToBottom();
        this.chatbotReplyTimer = null;
      }, remaining);
    };

    this.chatbotService.askQuestion(question, this.isSwahili ? 'sw' : 'en').subscribe({
      next: (response) => {
        const answer = String(response?.answer || '').trim() || this.chatbotFallbackMessage;
        showReplyWithLoadingDelay(answer);
      },
      error: () => {
        showReplyWithLoadingDelay(this.chatbotErrorMessage);
      }
    });
  }

  private ensureChatbotWelcomeMessage() {
    if (this.chatbotMessages.length) {
      return;
    }
    this.chatbotMessages = [{ sender: 'bot', text: this.chatbotWelcomeMessage }];
    this.queueChatScrollToBottom();
  }

  private handleChatbotLanguageChange(previousIsSwahili: boolean) {
    if (previousIsSwahili === this.isSwahili) {
      return;
    }

    const previousWelcome = previousIsSwahili
      ? 'Karibu. Uliza chochote kuhusu jinsi Feedback System inavyofanya kazi.'
      : 'Welcome. Ask anything about how the Feedback System works.';

    const hasOnlyWelcomeMessage = this.chatbotMessages.length === 1
      && this.chatbotMessages[0].sender === 'bot'
      && this.chatbotMessages[0].text === previousWelcome;

    if (hasOnlyWelcomeMessage) {
      this.chatbotMessages = [{ sender: 'bot', text: this.chatbotWelcomeMessage }];
      this.queueChatScrollToBottom();
      return;
    }

    if (this.chatbotMessages.length > 0) {
      this.chatbotMessages = [
        ...this.chatbotMessages,
        { sender: 'bot', text: this.chatbotLanguageChangedMessage }
      ];
      this.queueChatScrollToBottom();
    }
  }

  private queueChatScrollToBottom() {
    setTimeout(() => {
      const container = this.chatMessagesContainer?.nativeElement;
      if (!container) {
        return;
      }
      container.scrollTop = container.scrollHeight;
    }, 0);
  }

  private get chatbotWelcomeMessage(): string {
    return this.isSwahili
      ? 'Karibu. Uliza chochote kuhusu jinsi Feedback System inavyofanya kazi.'
      : 'Welcome. Ask anything about how the Feedback System works.';
  }

  private get chatbotErrorMessage(): string {
    return this.isSwahili
      ? 'Samahani, imeshindikana kupata jibu kwa sasa. Jaribu tena.'
      : 'Sorry, I could not get an answer right now. Please try again.';
  }

  private get chatbotFallbackMessage(): string {
    return this.isSwahili
      ? 'Samahani, sijapata jibu la moja kwa moja. Jaribu kuuliza kwa maneno mengine.'
      : 'Sorry, I could not find a direct answer. Please try rephrasing your question.';
  }

  private get chatbotLanguageChangedMessage(): string {
    return this.isSwahili
      ? 'Sawa, sasa nitaendelea kujibu kwa Kiswahili.'
      : 'Okay, I will continue replying in English.';
  }

  private resetMaterials() {
    this.eventMaterials = [];
    this.materialsLoading = false;
    this.materialsError = '';
    this.isDownloadingMaterialsZip = false;
    this.selectedMaterialFile = null;
    this.selectedMaterialCategory = 'presentation';
    this.materialsUploadMessage = '';
    this.isUploadingMaterial = false;
    if (this.materialFileInput) {
      this.materialFileInput.nativeElement.value = '';
    }
  }

  private loadEventMaterials(eventId: number) {
    this.eventMaterials = [];
    this.materialsLoading = true;
    this.materialsError = '';

    this.eventsService.getEventMaterials(eventId).subscribe({
      next: (response) => {
        this.eventMaterials = response.materials || [];
        this.activePanel = this.eventMaterials.length ? 'materials' : 'image';
        this.materialsLoading = false;
      },
      error: (error) => {
        this.materialsLoading = false;
        this.materialsError = error?.error?.message || (this.isSwahili ? 'Imeshindikana kupakia material za event.' : 'Failed to load event materials.');
      }
    });
  }

  downloadMaterial(material: EventMaterial) {
    if (!material.file_url) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = material.file_url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  }

  downloadAllMaterials() {
    if (!this.eventInfo) {
      return;
    }

    const downloadEventId = this.eventInfo.id;
    this.isDownloadingMaterialsZip = true;
    this.materialsError = '';

    this.eventsService.downloadEventMaterialsZip(downloadEventId).subscribe({
      next: (blob) => {
        this.isDownloadingMaterialsZip = false;
        const blobUrl = window.URL.createObjectURL(blob);
        const downloadName = `${(this.eventInfo?.title || this.eventInfo?.event_code || 'event-materials')
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase() || 'event-materials'}-materials.zip`;

        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = downloadName;
        anchor.click();
        window.URL.revokeObjectURL(blobUrl);
      },
      error: (error) => {
        this.isDownloadingMaterialsZip = false;
        this.materialsError = error?.error?.message || (this.isSwahili ? 'Imeshindikana kupakua material zote.' : 'Failed to download materials.');
      }
    });
  }

  onMaterialFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedMaterialFile = input.files?.[0] || null;
  }

  submitMaterialUpload(event: Event) {
    event.preventDefault();

    const currentEventId = this.eventInfo?.id;

    if (!currentEventId || !this.selectedMaterialFile || this.isUploadingMaterial) {
      return;
    }

    this.isUploadingMaterial = true;
    this.materialsUploadMessage = '';

    this.eventsService.uploadEventMaterial(currentEventId, this.selectedMaterialFile, this.selectedMaterialCategory).subscribe({
      next: () => {
        this.materialsUploadMessage = this.isSwahili ? 'Material imepakiwa.' : 'Material uploaded.';
        this.selectedMaterialFile = null;
        this.selectedMaterialCategory = 'presentation';
        if (this.materialFileInput) {
          this.materialFileInput.nativeElement.value = '';
        }
        this.isUploadingMaterial = false;
        this.loadEventMaterials(currentEventId);
      },
      error: (error) => {
        this.isUploadingMaterial = false;
        this.materialsUploadMessage = error?.error?.message || (this.isSwahili ? 'Imeshindikana kupakia material.' : 'Failed to upload material.');
      }
    });
  }

  formatMaterialCategory(category?: string): string {
    if (!category) {
      return 'Other';
    }
    return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
  }
}
