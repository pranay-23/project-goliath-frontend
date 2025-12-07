import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserStore } from '../../core/stores/user.store';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface FitnessMetric {
  _id: string;
  weight: number;
  bmi?: number;
  bodyFatPercentage?: number;
  skeletalMuscleMass?: number;
  bodyWaterPercentage?: number;
  boneMass?: number;
  visceralFatLevel?: number;
  muscleMass?: number;
  metabolicAge?: number;
  date: string;
  notes?: string;
}

@Component({
  selector: 'app-fitness-metrics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
  templateUrl: './fitness-metrics.component.html',
  styleUrl: './fitness-metrics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FitnessMetricsComponent implements OnInit {
  public userStore = inject(UserStore);
  private apiService = inject(ApiService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  fitnessMetrics = signal<FitnessMetric[]>([]);
  latestFitnessMetric = signal<FitnessMetric | null>(null);
  loading = signal(false);
  saving = signal(false);
  deleting = signal<string | null>(null);
  editingFitness = signal(false);
  editingMetricId = signal<string | null>(null);

  fitnessForm = signal<FormGroup | null>(null);

  // Computed values
  weightUnit = computed(() => {
    const user = this.userStore.data() as any;
    const userData = user?.data || user;
    return userData?.unitsPreference?.weight || 'kg';
  });

  constructor() {
    // Initialize form on component creation
    this.initializeFitnessForm();
  }

  ngOnInit(): void {
    this.loadFitnessMetrics();
    this.loadLatestFitnessMetric();
  }

  initializeFitnessForm(metric?: FitnessMetric) {
    let dateValue = new Date();
    if (metric?.date) {
      dateValue = new Date(metric.date);
    }
    // Format date as YYYY-MM-DD for input[type="date"]
    const dateString = dateValue.toISOString().split('T')[0];
    
    this.fitnessForm.set(this.fb.group({
      weight: new FormControl(metric?.weight || null, [Validators.required, Validators.min(0)]),
      bmi: new FormControl(metric?.bmi || null, [Validators.min(0), Validators.max(100)]),
      bodyFatPercentage: new FormControl(metric?.bodyFatPercentage || null, [Validators.min(0), Validators.max(100)]),
      skeletalMuscleMass: new FormControl(metric?.skeletalMuscleMass || null, [Validators.min(0)]),
      bodyWaterPercentage: new FormControl(metric?.bodyWaterPercentage || null, [Validators.min(0), Validators.max(100)]),
      boneMass: new FormControl(metric?.boneMass || null, [Validators.min(0)]),
      visceralFatLevel: new FormControl(metric?.visceralFatLevel || null, [Validators.min(0)]),
      muscleMass: new FormControl(metric?.muscleMass || null, [Validators.min(0)]),
      metabolicAge: new FormControl(metric?.metabolicAge || null, [Validators.min(0)]),
      date: new FormControl(dateString, [Validators.required]),
      notes: new FormControl(metric?.notes || '', [Validators.maxLength(500)])
    }));
  }

  loadFitnessMetrics() {
    this.loading.set(true);
    this.apiService.get<any>(true, API_ENDPOINTS.GET_FITNESS_METRICS).subscribe({
      next: (response) => {
        if (response.responseHeader?.success) {
          this.fitnessMetrics.set(response.response?.data || []);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading fitness metrics:', error);
        this.loading.set(false);
      }
    });
  }

  loadLatestFitnessMetric() {
    this.apiService.get<any>(true, API_ENDPOINTS.GET_LATEST_FITNESS_METRICS).subscribe({
      next: (response) => {
        if (response.responseHeader?.success) {
          this.latestFitnessMetric.set(response.response?.data);
          if (response.response?.data) {
            this.initializeFitnessForm(response.response.data);
          }
        }
      },
      error: (error) => {
        console.error('Error loading latest fitness metric:', error);
      }
    });
  }

  saveFitnessMetric() {
    if (!this.fitnessForm()?.valid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields correctly' });
      return;
    }

    this.saving.set(true);
    const formValue = this.fitnessForm()?.value;
    const editingId = this.editingMetricId();
    
    // Convert date string to Date object for API
    if (formValue.date) {
      formValue.date = new Date(formValue.date);
    }
    
    if (editingId) {
      // Update existing metric
      this.apiService.patch<any>(true, `${API_ENDPOINTS.UPDATE_FITNESS_METRICS}/${editingId}`, formValue).subscribe({
        next: (response) => {
          if (response.responseHeader?.success) {
            this.editingFitness.set(false);
            this.editingMetricId.set(null);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Fitness metrics updated successfully' });
            this.loadFitnessMetrics();
            this.loadLatestFitnessMetric();
          }
          this.saving.set(false);
        },
        error: (error) => {
          console.error('Error updating fitness metrics:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update fitness metrics' });
          this.saving.set(false);
        }
      });
    } else {
      // Create new metric
      this.apiService.post<any>(true, API_ENDPOINTS.ADD_FITNESS_METRICS, formValue).subscribe({
        next: (response) => {
          if (response.responseHeader?.success) {
            this.editingFitness.set(false);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Fitness metrics saved successfully' });
            this.loadFitnessMetrics();
            this.loadLatestFitnessMetric();
          }
          this.saving.set(false);
        },
        error: (error) => {
          console.error('Error saving fitness metrics:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save fitness metrics' });
          this.saving.set(false);
        }
      });
    }
  }

  editFitnessMetric(metric: FitnessMetric) {
    this.editingMetricId.set(metric._id);
    this.initializeFitnessForm(metric);
    this.editingFitness.set(true);
  }

  deleteFitnessMetric(metricId: string) {
    if (!confirm('Are you sure you want to delete this fitness metric entry?')) {
      return;
    }

    this.deleting.set(metricId);
    this.apiService.delete<any>(true, `${API_ENDPOINTS.DELETE_FITNESS_METRICS}/${metricId}`).subscribe({
      next: (response) => {
        if (response.responseHeader?.success) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Fitness metric deleted successfully' });
          this.loadFitnessMetrics();
          this.loadLatestFitnessMetric();
        }
        this.deleting.set(null);
      },
      error: (error) => {
        console.error('Error deleting fitness metric:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete fitness metric' });
        this.deleting.set(null);
      }
    });
  }

  startEditingFitness() {
    this.editingMetricId.set(null);
    this.initializeFitnessForm();
    this.editingFitness.set(true);
  }

  cancelEditingFitness() {
    this.editingMetricId.set(null);
    this.editingFitness.set(false);
    this.initializeFitnessForm();
  }
}

