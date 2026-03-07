import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserAuthService } from '../services/user-auth.service';

export const userAuthGuard: CanActivateFn = () => {
  const auth = inject(UserAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/user-login']);
};
