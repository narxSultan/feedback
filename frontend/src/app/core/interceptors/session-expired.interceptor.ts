import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const SESSION_ERRORS = ['session mismatch', 'session expired', 'invalid session', 'unauthorized'];

export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const message = typeof error.error?.message === 'string'
          ? error.error.message.toLowerCase()
          : '';
        if (SESSION_ERRORS.some((term) => message.includes(term))) {
          auth.logout();
          router.navigate(['/admin-login']);
        }
      }
      return throwError(() => error);
    })
  );
};
