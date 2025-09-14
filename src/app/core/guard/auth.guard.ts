import { inject } from "@angular/core";
import { CanActivateChildFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateChildFn = () => {
    const authService = inject(AuthService);
    return authService.isAuthenticated();
}