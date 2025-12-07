import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { authGuard } from './core/guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'home', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },
  { path: 'calories', loadComponent: () => import('./components/calories/calories.component').then(m => m.CaloriesComponent), canActivate: [authGuard] },
  { path: 'workout', loadComponent: () => import('./components/workout/workout.component').then(m => m.WorkoutComponent), canActivate: [authGuard] },
  { path: 'fitness-metrics', loadComponent: () => import('./components/fitness-metrics/fitness-metrics.component').then(m => m.FitnessMetricsComponent), canActivate: [authGuard] },
  { path: 'friends', loadComponent: () => import('./components/friends/friends.component').then(m => m.FriendsComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/landing' }
];
