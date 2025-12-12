import { ChangeDetectionStrategy, Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { RangeIntakeStore } from '../../core/stores/rangeIntake.store';

interface Exercise {
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distanceKm?: number;
}

interface LoggedWorkout {
  _id?: string;
  workoutName: string;
  exercises: Exercise[];
  totalCaloriesBurned: number;
  totalDurationMinutes?: number;
  createdAt?: string;
}

interface WorkoutResponse {
  dailyLog: {
    totalCaloriesOut: number;
  };
  workouts: LoggedWorkout[];
}

interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workout.component.html',
  styleUrl: './workout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkoutComponent implements OnInit {
  private apiService = inject(ApiService);
  private rangeIntakeStore = inject(RangeIntakeStore);
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  workoutData = signal<WorkoutResponse | null>(null);
  isLoadingWorkouts = signal<boolean>(false);
  isAddingWorkout = signal<boolean>(false);
  
  // Workout form
  showWorkoutModal = signal<boolean>(false);
  workoutName = signal<string>('General Workout');
  exercises = signal<Exercise[]>([]);
  totalCaloriesBurned = signal<number>(0);
  totalDurationMinutes = signal<number | null>(null);
  
  // Current exercise being added
  currentExercise = signal<Exercise>({
    exerciseName: '',
    sets: undefined,
    reps: undefined,
    weight: undefined,
    durationSeconds: undefined,
    distanceKm: undefined
  });

  totalCaloriesOut = computed(() => {
    return this.workoutData()?.dailyLog?.totalCaloriesOut || 0;
  });

  ngOnInit() {
    this.loadWorkouts();
  }

  onDateChange() {
    this.loadWorkouts();
  }

  loadWorkouts() {
    this.isLoadingWorkouts.set(true);
    this.workoutData.set(null);

    this.apiService.get<ApiResponse<WorkoutResponse>>(
      true,
      API_ENDPOINTS.GET_WORKOUTS,
      { params: { date: this.selectedDate() } }
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.workoutData.set(response.response.data);
        } else {
          this.workoutData.set({
            dailyLog: { totalCaloriesOut: 0 },
            workouts: []
          });
        }
        this.isLoadingWorkouts.set(false);
      },
      error: (error) => {
        console.error('Error loading workouts:', error);
        this.workoutData.set({
          dailyLog: { totalCaloriesOut: 0 },
          workouts: []
        });
        this.isLoadingWorkouts.set(false);
      }
    });
  }

  openWorkoutModal() {
    this.showWorkoutModal.set(true);
    this.resetWorkoutForm();
  }

  closeWorkoutModal() {
    this.showWorkoutModal.set(false);
    this.resetWorkoutForm();
  }

  resetWorkoutForm() {
    this.workoutName.set('General Workout');
    this.exercises.set([]);
    this.totalCaloriesBurned.set(0);
    this.totalDurationMinutes.set(null);
    this.currentExercise.set({
      exerciseName: '',
      sets: undefined,
      reps: undefined,
      weight: undefined,
      durationSeconds: undefined,
      distanceKm: undefined
    });
  }

  addExercise() {
    const exercise = this.currentExercise();
    if (!exercise.exerciseName || exercise.exerciseName.trim() === '') {
      alert('Please enter an exercise name');
      return;
    }

    this.exercises.update(exercises => [...exercises, { ...exercise }]);
    this.currentExercise.set({
      exerciseName: '',
      sets: undefined,
      reps: undefined,
      weight: undefined,
      durationSeconds: undefined,
      distanceKm: undefined
    });
  }

  removeExercise(index: number) {
    this.exercises.update(exercises => exercises.filter((_, i) => i !== index));
  }

  saveWorkout() {
    const exercises = this.exercises();
    const totalCalories = this.totalCaloriesBurned();
    
    if (!totalCalories || totalCalories <= 0) {
      alert('Please enter total calories burned');
      return;
    }

    this.isAddingWorkout.set(true);

    const workoutData = {
      date: this.selectedDate(),
      workoutName: this.workoutName(),
      exercises: exercises,
      totalCaloriesBurned: totalCalories,
      totalDurationMinutes: this.totalDurationMinutes() || null
    };

    this.apiService.post<ApiResponse<any>>(
      true,
      API_ENDPOINTS.ADD_WORKOUT,
      workoutData
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          this.closeWorkoutModal();
          this.loadWorkouts();
          this.rangeIntakeStore.clearState();
        }
        this.isAddingWorkout.set(false);
      },
      error: (error) => {
        console.error('Error adding workout:', error);
        this.isAddingWorkout.set(false);
      }
    });
  }

  deleteWorkout(workoutId: string | undefined) {
    if (!workoutId) return;
    
    if (!confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    this.apiService.delete<ApiResponse<any>>(
      true,
      `${API_ENDPOINTS.DELETE_WORKOUT}/${workoutId}`
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          this.loadWorkouts();
          this.rangeIntakeStore.clearState();
        }
      },
      error: (error) => {
        console.error('Error deleting workout:', error);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDuration(minutes: number | undefined | null): string {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatTime(seconds: number | undefined | null): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  // Helper methods for form updates
  updateWorkoutName(value: string) {
    this.workoutName.set(value);
  }

  updateTotalCalories(value: number) {
    this.totalCaloriesBurned.set(value);
  }

  updateTotalDuration(value: number | null) {
    this.totalDurationMinutes.set(value);
  }

  updateExerciseName(value: string) {
    this.currentExercise.update(e => ({ ...e, exerciseName: value }));
  }

  updateExerciseSets(value: number) {
    this.currentExercise.update(e => ({ ...e, sets: value || undefined }));
  }

  updateExerciseReps(value: number) {
    this.currentExercise.update(e => ({ ...e, reps: value || undefined }));
  }

  updateExerciseWeight(value: number) {
    this.currentExercise.update(e => ({ ...e, weight: value || undefined }));
  }

  updateExerciseDuration(value: number) {
    this.currentExercise.update(e => ({ ...e, durationSeconds: value || undefined }));
  }

  updateExerciseDistance(value: number) {
    this.currentExercise.update(e => ({ ...e, distanceKm: value || undefined }));
  }
}
