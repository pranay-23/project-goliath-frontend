import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  isDarkMode = input<boolean>(false);
  themeToggled = output<void>();



  onThemeToggle() {
    this.themeToggled.emit();
  }

  redirectToLogin(){
    this.authService.logout();
    // this.router.navigate(['/login']);
  }
}
