import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing/landing.component';
import { AdminLoginPageComponent } from './pages/admin-login/admin-login.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';
import { EventsPageComponent } from './pages/events/events.component';
import { EventFeedbackPageComponent } from './pages/event-feedback/event-feedback.component';
import { authGuard } from './core/guards/auth.guard';
import { UserRegisterPageComponent } from './pages/user-register/user-register.component';
import { UserLoginPageComponent } from './pages/user-login/user-login.component';
import { UserDashboardPageComponent } from './pages/user-dashboard/user-dashboard.component';
import { userAuthGuard } from './core/guards/user-auth.guard';
import { AdminUsersPageComponent } from './pages/admin-users/admin-users.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordPageComponent } from './pages/reset-password/reset-password.component';
import { AdInfoPageComponent } from './pages/ad-info/ad-info.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'admin-login', component: AdminLoginPageComponent },
  { path: 'user-register', component: UserRegisterPageComponent },
  { path: 'user-login', component: UserLoginPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'ad-info/:adId', component: AdInfoPageComponent },
  { path: 'user-dashboard', component: UserDashboardPageComponent, canActivate: [userAuthGuard] },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: 'events', component: EventsPageComponent, canActivate: [authGuard] },
  { path: 'admin-users', component: AdminUsersPageComponent, canActivate: [authGuard] },
  { path: 'event-feedback/:eventId', component: EventFeedbackPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
