import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserStore } from '../../../core/stores/user.store';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class TopbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private userStore = inject(UserStore);
  private routerSubscription?: Subscription;

  isDarkMode = input<boolean>(false);
  themeToggled = output<void>();
  showUserMenu = signal<boolean>(false);
  showMobileMenu = signal<boolean>(false);
  currentRoute = signal<string>('');

  // Check if user is logged in
  isLoggedIn = computed(() => {
    return this.userStore.data() !== null && !this.userStore.error();
  });

  // Get user data
  currentUser = computed(() => this.userStore.data());

  ngOnInit() {
    // Set initial route
    this.currentRoute.set(this.router.url);
    
    // Update current route signal on navigation
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.url);
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Get user initials
  getUserInitials(): string {
    const user = this.currentUser();
    const userData = user?.data || user;
    if (!userData || !userData?.firstName || !userData?.lastName) return 'U';
    return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
  }

  // Get user full name
  getUserFullName(): string {
    const user = this.currentUser();
    const userData = user?.data || user;
    if (!userData || !userData?.firstName || !userData?.lastName) return 'User';
    return `${userData.firstName} ${userData.lastName}`;
  }

  // Get user email
  getUserEmail(): string {
    const user = this.currentUser();
    const userData = user?.data || user;
    return userData?.email || 'No email';
  }

  // Get user profile picture URL
  getUserProfilePictureUrl(): string | undefined {
    const user = this.currentUser();
    const userData = user?.data || user;
    return userData?.profilePictureUrl;
  }

  onThemeToggle() {
    this.themeToggled.emit();
  }

  toggleUserMenu() {
    this.showUserMenu.update(value => !value);
  }

  closeUserMenu() {
    this.showUserMenu.set(false);
  }

  toggleMobileMenu() {
    this.showMobileMenu.update(value => !value);
  }

  closeMobileMenu() {
    this.showMobileMenu.set(false);
  }

  navigateToProfile() {
    this.closeUserMenu();
    this.router.navigate(['/profile']);
  }

  handleLogout() {
    this.closeUserMenu();
    this.authService.logout();
  }

  redirectToLogin(){
    this.router.navigate(['/login']);
  }

  navigateToHome() {
    if (this.isLoggedIn()) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/landing']);
    }
  }

  navigateToTab(tab: string) {
    this.router.navigate([`/${tab}`]);
    this.closeMobileMenu(); // Close mobile menu after navigation
  }

  // Computed signals for each tab's active state
  isHomeActive = computed(() => {
    const url = this.currentRoute();
    return url === '/home' || url === '/' || url === '/home/';
  });

  isCaloriesActive = computed(() => {
    const url = this.currentRoute();
    return url === '/calories' || url.startsWith('/calories/');
  });

  isWorkoutActive = computed(() => {
    const url = this.currentRoute();
    return url === '/workout' || url.startsWith('/workout/');
  });

  isFitnessMetricsActive = computed(() => {
    const url = this.currentRoute();
    return url === '/fitness-metrics' || url.startsWith('/fitness-metrics/');
  });

  isFriendsActive = computed(() => {
    const url = this.currentRoute();
    return url === '/friends' || url.startsWith('/friends/');
  });
}
