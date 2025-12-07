import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  
  currentUser = signal({ name: 'Warrior' });

  navigateToTab(path: string) {
    this.router.navigate([path], { relativeTo: this.route });
  }

  isActive(path: string): boolean {
    const url = this.router.url;
    if (path === 'home') {
      return url === '/dashboard' || url === '/dashboard/' || url.includes('/dashboard/home');
    }
    return url.includes(`/dashboard/${path}`);
  }
}
