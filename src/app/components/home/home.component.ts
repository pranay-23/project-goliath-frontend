import { ChangeDetectionStrategy, Component, OnInit, signal, effect, inject, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { RangeIntakeStore } from '../../core/stores/rangeIntake.store';
import { UserStore } from '../../core/stores/user.store';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { RecentFitnessMetricsStore } from '../../core/stores/recentFitnessMetrics.store';
import { LatestFitnessMetricsStore } from '../../core/stores/latestFitnessMetrics.store';

interface DailyLog {
  date: string;
  totals: {
    totalCaloriesIn: number;
    totalCaloriesOut: number;
    totalCarbsIn: number;
    totalFatsIn: number;
    totalFibreIn: number;
    totalProteinIn: number;
  };
}

interface RangeIntakeData {
  status: string;
  statusCode: number;
  message: string;
  data: {
    dailyLogs: DailyLog[];
  };
}

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
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {

  public rangeIntakeStore = inject(RangeIntakeStore);
  public recentFitnessMetricsStore = inject(RecentFitnessMetricsStore);
  public latestFitnessMetricsStore = inject(LatestFitnessMetricsStore);
  public userStore = inject(UserStore);
  private apiService = inject(ApiService);
  
  private chartInstances: Map<string, any> = new Map();

  // Computed data from store
  dailyLogs = computed(() => {
    const data = this.rangeIntakeStore.data() as RangeIntakeData | null;
    return data?.data?.dailyLogs || [];
  });

  fitnessMetrics = computed(() => {
    return this.recentFitnessMetricsStore.data()?.data || [];
  });

  latestFitnessMetric = computed(() => {
    return this.latestFitnessMetricsStore.data()?.data || null;
  });

  // Transform data for charts
  weeklyLabels = computed(() => {
    return this.dailyLogs().map(log => {
      const date = new Date(log.date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    });
  });

  caloriesInData = computed(() => {
    return this.dailyLogs().map(log => log.totals.totalCaloriesIn);
  });

  caloriesOutData = computed(() => {
    return this.dailyLogs().map(log => log.totals.totalCaloriesOut);
  });

  macronutrientsData = computed(() => {
    const today = this.todayLog();
    if (!today) return { protein: 0, carbs: 0, fats: 0 };
    
    // Use only today's macros
    return {
      protein: today.totals.totalProteinIn,
      carbs: today.totals.totalCarbsIn,
      fats: today.totals.totalFatsIn
    };
  });

  dailyMacrosData = computed(() => {
    return {
      protein: this.dailyLogs().map(log => log.totals.totalProteinIn),
      carbs: this.dailyLogs().map(log => log.totals.totalCarbsIn),
      fats: this.dailyLogs().map(log => log.totals.totalFatsIn)
    };
  });

  // Today's data
  todayLog = computed(() => {
    const logs = this.dailyLogs();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return logs.find(log => {
      const logDate = new Date(log.date);
      const logDateStr = logDate.toISOString().split('T')[0];
      return logDateStr === todayStr;
    });
  });

  todayCaloriesIn = computed(() => {
    return this.todayLog()?.totals.totalCaloriesIn || 0;
  });

  todayCaloriesOut = computed(() => {
    return this.todayLog()?.totals.totalCaloriesOut || 0;
  });

  todayNetCalories = computed(() => {
    return this.todayCaloriesIn() - this.todayCaloriesOut();
  });

  // Fitness Metrics Computed Values
  weightUnit = computed(() => {
    const user = this.userStore.data() as any;
    const userData = user?.data || user;
    return userData?.unitsPreference?.weight || 'kg';
  });

  fitnessMetricsLabels = computed(() => {
    return this.fitnessMetrics().map(metric => {
      const date = new Date(metric.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    });
  });

  weightData = computed(() => {
    return this.fitnessMetrics().map(metric => metric.weight);
  });

  bmiData = computed(() => {
    return this.fitnessMetrics().map(metric => metric.bmi || null);
  });

  bmiLabels = computed(() => {
    return this.fitnessMetricsLabels().filter((_, index) => this.fitnessMetrics()[index]?.bmi != null);
  });

  bmiDataFiltered = computed(() => {
    return this.bmiData().filter(val => val !== null);
  });

  bodyFatData = computed(() => {
    return this.fitnessMetrics().map(metric => metric.bodyFatPercentage || null);
  });

  bodyFatLabels = computed(() => {
    return this.fitnessMetricsLabels().filter((_, index) => this.fitnessMetrics()[index]?.bodyFatPercentage != null);
  });

  bodyFatDataFiltered = computed(() => {
    return this.bodyFatData().filter(val => val !== null);
  });

  skeletalMuscleData = computed(() => {
    return this.fitnessMetrics().map(metric => metric.skeletalMuscleMass || null);
  });

  skeletalMuscleLabels = computed(() => {
    return this.fitnessMetricsLabels().filter((_, index) => this.fitnessMetrics()[index]?.skeletalMuscleMass != null);
  });

  skeletalMuscleDataFiltered = computed(() => {
    return this.skeletalMuscleData().filter(val => val !== null);
  });

  currentWeight = computed(() => {
    const latest = this.latestFitnessMetric();
    return latest ? `${latest.weight} ${this.weightUnit()}` : 'N/A';
  });

  constructor(){
    effect(()=>{
      if(!untracked(this.rangeIntakeStore.initialised)){
        this.rangeIntakeStore.postRequest(true,{
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        });
      }
    })

    effect(()=>{
      if(this.rangeIntakeStore.initialised() && this.dailyLogs().length > 0){
        setTimeout(() => {
          this.initializeCharts();
        }, 100);
      }
    })

    effect(()=>{
      if(!untracked(this.recentFitnessMetricsStore.initialised)){
        this.recentFitnessMetricsStore.getRequest(true,{limit: 10});
      }
    })

    effect(()=>{
      if(this.recentFitnessMetricsStore.initialised() && this.fitnessMetrics().length > 0){
        setTimeout(() => {
          this.initializeFitnessCharts();
        }, 100);
      }
    })

    effect(()=>{
      if(!untracked(this.latestFitnessMetricsStore.initialised)){
        this.latestFitnessMetricsStore.getRequest(true);
      }
    })

  }

  initializeCharts() {
    // Calories In vs Out Chart
    this.createCaloriesChart();
    
    // Macronutrients Doughnut Chart
    this.createMacronutrientsChart();
    
    // Weekly Trend Chart
    this.createWeeklyTrendChart();
    
    // Daily Macros Bar Chart
    this.createDailyMacrosChart();
  }

  createCaloriesChart() {
    const canvas = document.getElementById('caloriesChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dynamic import of Chart.js
    import('chart.js/auto').then((Chart) => {
      // Check Chart.js registry for existing chart
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Also check our instance map
      const ourInstance = this.chartInstances.get('caloriesChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('caloriesChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'line',
        data: {
          labels: this.weeklyLabels(),
          datasets: [
            {
              label: 'Calories In',
              data: this.caloriesInData(),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Calories Out',
              data: this.caloriesOutData(),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Calories In vs Calories Out'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'Calories'
              }
            }
          }
        }
      });
      this.chartInstances.set('caloriesChart', chart);
    });
  }

  createMacronutrientsChart() {
    const canvas = document.getElementById('macronutrientsChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const macros = this.macronutrientsData();
    import('chart.js/auto').then((Chart) => {
      // Check Chart.js registry for existing chart
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Also check our instance map
      const ourInstance = this.chartInstances.get('macronutrientsChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('macronutrientsChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Protein', 'Carbs', 'Fats'],
          datasets: [{
            data: [
              macros.protein * 4, // Convert to calories
              macros.carbs * 4,
              macros.fats * 9
            ],
            backgroundColor: [
              'rgb(59, 130, 246)',
              'rgb(34, 197, 94)',
              'rgb(251, 146, 60)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            title: {
              display: true,
              text: 'Macronutrients Breakdown'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const grams = label === 'Protein' ? value / 4 : label === 'Carbs' ? value / 4 : value / 9;
                  return `${label}: ${grams.toFixed(1)}g (${value.toFixed(0)} cal)`;
                }
              }
            }
          }
        }
      });
      this.chartInstances.set('macronutrientsChart', chart);
    });
  }

  createWeeklyTrendChart() {
    const canvas = document.getElementById('weeklyTrendChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    import('chart.js/auto').then((Chart) => {
      // Check Chart.js registry for existing chart
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Also check our instance map
      const ourInstance = this.chartInstances.get('weeklyTrendChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('weeklyTrendChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'bar',
        data: {
          labels: this.weeklyLabels(),
          datasets: [
            {
              label: 'Calories In',
              data: this.caloriesInData(),
              backgroundColor: 'rgba(99, 102, 241, 0.6)',
              borderColor: 'rgb(99, 102, 241)',
              borderWidth: 1
            },
            {
              label: 'Calories Out',
              data: this.caloriesOutData(),
              backgroundColor: 'rgba(239, 68, 68, 0.6)',
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Weekly Calories Trend'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'Calories'
              }
            }
          }
        }
      });
      this.chartInstances.set('weeklyTrendChart', chart);
    });
  }

  createDailyMacrosChart() {
    const canvas = document.getElementById('dailyMacrosChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dailyMacros = this.dailyMacrosData();
    import('chart.js/auto').then((Chart) => {
      // Check Chart.js registry for existing chart
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Also check our instance map
      const ourInstance = this.chartInstances.get('dailyMacrosChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('dailyMacrosChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'bar',
        data: {
          labels: this.weeklyLabels(),
          datasets: [
            {
              label: 'Protein (g)',
              data: dailyMacros.protein,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1
            },
            {
              label: 'Carbs (g)',
              data: dailyMacros.carbs,
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1
            },
            {
              label: 'Fats (g)',
              data: dailyMacros.fats,
              backgroundColor: 'rgba(251, 146, 60, 0.8)',
              borderColor: 'rgb(251, 146, 60)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Daily Macronutrients'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Grams'
              }
            }
          }
        }
      });
      this.chartInstances.set('dailyMacrosChart', chart);
    });
  }

  initializeFitnessCharts() {
    if (this.fitnessMetrics().length === 0) return;
    
    this.createWeightChart();
    this.createBMIChart();
    this.createBodyFatChart();
    this.createSkeletalMuscleChart();
  }

  createWeightChart() {
    const canvas = document.getElementById('weightChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    import('chart.js/auto').then((Chart) => {
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ourInstance = this.chartInstances.get('weightChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('weightChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'line',
        data: {
          labels: this.fitnessMetricsLabels(),
          datasets: [{
            label: `Weight (${this.weightUnit()})`,
            data: this.weightData(),
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Weight Trend'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: `Weight (${this.weightUnit()})`
              }
            }
          }
        }
      });
      this.chartInstances.set('weightChart', chart);
    });
  }

  createBMIChart() {
    const canvas = document.getElementById('bmiChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bmiData = this.bmiDataFiltered();
    if (bmiData.length === 0) return;

    import('chart.js/auto').then((Chart) => {
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ourInstance = this.chartInstances.get('bmiChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('bmiChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'line',
        data: {
          labels: this.bmiLabels(),
          datasets: [{
            label: 'BMI',
            data: this.bmiDataFiltered(),
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'BMI Trend'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'BMI'
              }
            }
          }
        }
      });
      this.chartInstances.set('bmiChart', chart);
    });
  }

  createBodyFatChart() {
    const canvas = document.getElementById('bodyFatChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bodyFatData = this.bodyFatDataFiltered();
    if (bodyFatData.length === 0) return;

    import('chart.js/auto').then((Chart) => {
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ourInstance = this.chartInstances.get('bodyFatChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('bodyFatChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'bar',
        data: {
          labels: this.bodyFatLabels(),
          datasets: [{
            label: 'Body Fat %',
            data: this.bodyFatDataFiltered(),
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Body Fat Percentage'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Percentage (%)'
              }
            }
          }
        }
      });
      this.chartInstances.set('bodyFatChart', chart);
    });
  }

  createSkeletalMuscleChart() {
    const canvas = document.getElementById('skeletalMuscleChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const muscleData = this.skeletalMuscleDataFiltered();
    if (muscleData.length === 0) return;

    import('chart.js/auto').then((Chart) => {
      const existingChart = Chart.default.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ourInstance = this.chartInstances.get('skeletalMuscleChart');
      if (ourInstance) {
        ourInstance.destroy();
        this.chartInstances.delete('skeletalMuscleChart');
      }

      const chart = new Chart.default(ctx, {
        type: 'line',
        data: {
          labels: this.skeletalMuscleLabels(),
          datasets: [{
            label: `Skeletal Muscle Mass (${this.weightUnit()})`,
            data: this.skeletalMuscleDataFiltered(),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Skeletal Muscle Mass Trend'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: `Mass (${this.weightUnit()})`
              }
            }
          }
        }
      });
      this.chartInstances.set('skeletalMuscleChart', chart);
    });
  }

}

