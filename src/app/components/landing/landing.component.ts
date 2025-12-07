import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { UserStore } from '../../core/stores/user.store';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    if(this.authService.isAuthenticated()){
      this.router.navigate(['/home']);
    }
  }

  redirectToLogin(){
    this.router.navigate(['/login']);
  }

}
