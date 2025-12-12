import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserStore } from '../../core/stores/user.store';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  age?: number;
  height?: number;
  gender?: string;
  profilePictureUrl?: string;
  role: string;
  unitsPreference: {
    weight: string;
    height: string;
  };
}


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  public userStore = inject(UserStore);
  private apiService = inject(ApiService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  user = signal<User | null>(null);
  saving = signal(false);
  editingProfile = signal(false);

  profileForm = signal<FormGroup | null>(null);

  // Computed values
  userFullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });

  heightUnit = computed(() => {
    const u = this.user();
    return u?.unitsPreference?.height || 'cm';
  });

  constructor() {
    // Load user data when store is initialized
    effect(() => {
      const userData = this.userStore.data() as any;
      if (userData) {
        this.user.set(userData.data);
        this.initializeProfileForm(userData.data);
      }
    });
  }

  ngOnInit(): void {
  }

  initializeProfileForm(userData: User) {
    this.profileForm.set(this.fb.group({
      firstName: new FormControl(userData?.firstName || '', [Validators.required, Validators.maxLength(50)]),
      lastName: new FormControl(userData?.lastName || '', [Validators.required, Validators.maxLength(50)]),
      age: new FormControl(userData?.age || null, [Validators.min(18)]),
      height: new FormControl(userData?.height || null, [Validators.min(0)]),
      gender: new FormControl(userData?.gender || '')
    }));
  }


  saveProfile() {
    if (!this.profileForm()?.valid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields correctly', key: 'bottom-center' });
      return;
    }

    this.saving.set(true);
    const formValue = this.profileForm()?.value;
    
    this.apiService.patch<any>(true, API_ENDPOINTS.GET_USER, formValue).subscribe({
      next: (response) => {
        if (response.responseHeader?.success) {
          this.user.set(response.response?.data);
          this.userStore.updateState({ data: response.response?.data });
          this.editingProfile.set(false);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully', key: 'bottom-center' });
          // Reload user data
          this.userStore.getRequest();
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update profile', key: 'bottom-center' });
        this.saving.set(false);
      }
    });
  }


  startEditingProfile() {
    this.editingProfile.set(true);
  }

  cancelEditingProfile() {
    const userData = this.user();
    if (userData) {
      this.initializeProfileForm(userData);
    }
    this.editingProfile.set(false);
  }

  getGenderOptions() {
    return [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
      { label: 'Other', value: 'Other' }
    ];
  }
}
