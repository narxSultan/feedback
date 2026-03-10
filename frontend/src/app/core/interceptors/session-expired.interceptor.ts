import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const SESSION_ERRORS = [
  'session mismatch',
  'session expired',
  'invalid session',
  'session not found',
  'invalid token',
  'unauthorized',
];

export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem('auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const hasAuthHeader = authReq.headers.has('Authorization');

      if (error.status === 401 && hasAuthHeader) {
        const message = typeof error.error?.message === 'string'
          ? error.error.message.toLowerCase()
          : '';
        if (!message || SESSION_ERRORS.some((term) => message.includes(term))) {
          const adminRole = localStorage.getItem('auth_role');
          const userRole = localStorage.getItem('user_role');
          auth.logout();
          router.navigate([adminRole === 'admin' || userRole === 'admin' ? '/admin-login' : '/user-login']);
        }
      }
      return throwError(() => error);
    })
  );
};
