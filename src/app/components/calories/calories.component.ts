import { ChangeDetectionStrategy, Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { RangeIntakeStore } from '../../core/stores/rangeIntake.store';

interface Food {
  _id: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  servingSizeValue?: number;
  avgFoodServingSize?: number;
  servingUnitName?: string;
}

interface LoggedFood {
  _id?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  foodItem: Food | { _id: string; name: string };
  quantity: number;
  totalGramsConsumed: number;
  hasQuantity?: boolean;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  createdAt?: string;
}

interface DailyLogTotals {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  totalProteinIn: number;
  totalCarbsIn: number;
  totalFatsIn: number;
  totalFibreIn: number;
}

interface DailyLogResponse {
  dailyLog: DailyLogTotals;
  foodData: LoggedFood[];
}

interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-calories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calories.component.html',
  styleUrl: './calories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaloriesComponent implements OnInit {
  private apiService = inject(ApiService);
  private rangeIntakeStore = inject(RangeIntakeStore);

  // Selected date for adding/viewing meals
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  
  // Food search
  searchQuery = signal<string>('');
  searchResults = signal<Food[]>([]);
  isSearching = signal<boolean>(false);
  
  // Current meal being added
  currentMealType = signal<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  selectedFood = signal<Food | null>(null);
  foodQuantity = signal<number>(1);
  foodGrams = signal<number | null>(null);
  useGrams = signal<boolean>(false);
  
  // Daily log data
  dailyLog = signal<DailyLogResponse | null>(null);
  isLoadingLog = signal<boolean>(false);
  isAddingFood = signal<boolean>(false);
  deletingFoodId = signal<string | null>(null);
  
  // Custom food form
  showCustomFoodModal = signal<boolean>(false);
  isAddingCustomFood = signal<boolean>(false);
  customFood = signal({
    dishName: '',
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fats: 0,
    fiber: 0,
    avgFoodServingSize: 100,
    servingUnitName: 'serving'
  });

  // Grouped meals by type
  groupedMeals = computed(() => {
    const log = this.dailyLog();
    if (!log || !log.foodData) return {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    };

    return {
      breakfast: log.foodData.filter(f => f.mealType === 'breakfast'),
      lunch: log.foodData.filter(f => f.mealType === 'lunch'),
      dinner: log.foodData.filter(f => f.mealType === 'dinner'),
      snacks: log.foodData.filter(f => f.mealType === 'snacks')
    };
  });

  // Total calories for selected date
  totalCalories = computed(() => {
    const log = this.dailyLog();
    return log?.dailyLog?.totalCaloriesIn || 0;
  });

  ngOnInit() {
    this.loadDailyLog();
  }

  onDateChange() {
    this.loadDailyLog();
  }

  loadDailyLog() {
    this.isLoadingLog.set(true);
    
    const date = this.selectedDate();
    
    this.apiService.get<ApiResponse<DailyLogResponse>>(
      true,
      API_ENDPOINTS.GET_CALORIE_INTAKE,
      { params: { date: date } }
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.dailyLog.set(response.response.data);
        } else {
          // If no log found, set empty state
          this.dailyLog.set({
            dailyLog: {
              totalCaloriesIn: 0,
              totalCaloriesOut: 0,
              totalProteinIn: 0,
              totalCarbsIn: 0,
              totalFatsIn: 0,
              totalFibreIn: 0
            },
            foodData: []
          });
        }
        this.isLoadingLog.set(false);
      },
      error: (error) => {
        console.error('Error loading daily log:', error);
        // Set empty state on error
        this.dailyLog.set({
          dailyLog: {
            totalCaloriesIn: 0,
            totalCaloriesOut: 0,
            totalProteinIn: 0,
            totalCarbsIn: 0,
            totalFatsIn: 0,
            totalFibreIn: 0
          },
          foodData: []
        });
        this.isLoadingLog.set(false);
      }
    });
  }

  searchFood() {
    const query = this.searchQuery().trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);

    this.apiService.get<ApiResponse<Food[]>>(
      true,
      API_ENDPOINTS.SEARCH_FOOD,
      { params: { search: query, page: 1, limit: 20 } }
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.searchResults.set(response.response.data);
        } else {
          this.searchResults.set([]);
        }
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Error searching food:', error);
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  selectFood(food: Food) {
    this.selectedFood.set(food);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.foodQuantity.set(1);
    this.foodGrams.set(null);
    this.useGrams.set(false);
  }

  addFoodToMeal() {
    const food = this.selectedFood();
    if (!food) return;

    const quantity = this.foodQuantity();
    const grams = this.foodGrams();
    const mealType = this.currentMealType();
    const date = this.selectedDate();

    const foodData = {
      date: date,
      foods: [{
        mealType: mealType,
        foodId: food._id,
        quantity: grams ? null : quantity,
        grams: grams || null
      }]
    };

    this.isAddingFood.set(true);

    this.apiService.post<ApiResponse<any>>(
      true,
      API_ENDPOINTS.ADD_CALORIE_INTAKE,
      foodData
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          // Reload the daily log to get updated data
          this.loadDailyLog();
          // Reset form
          this.selectedFood.set(null);
          this.foodQuantity.set(1);
          this.foodGrams.set(null);
          this.useGrams.set(false);
          this.rangeIntakeStore.clearState();
        }
        this.isAddingFood.set(false);
      },
      error: (error) => {
        console.error('Error adding food:', error);
        this.isAddingFood.set(false);
      }
    });
  }

  openCustomFoodModal() {
    this.showCustomFoodModal.set(true);
  }

  closeCustomFoodModal() {
    this.showCustomFoodModal.set(false);
    this.customFood.set({
      dishName: '',
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fats: 0,
      fiber: 0,
      avgFoodServingSize: 100,
      servingUnitName: 'serving'
    });
  }

  addCustomFood() {
    const customFoodData = this.customFood();
    
    if (!customFoodData.dishName || !customFoodData.calories) {
      alert('Please fill in at least dish name and calories');
      return;
    }

    this.isAddingCustomFood.set(true);

    this.apiService.post<ApiResponse<Food>>(
      true,
      API_ENDPOINTS.ADD_FOOD,
      customFoodData
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          // Select the newly added food
          this.selectFood(response.response.data);
          this.closeCustomFoodModal();
        }
        this.isAddingCustomFood.set(false);
      },
      error: (error) => {
        console.error('Error adding custom food:', error);
        this.isAddingCustomFood.set(false);
      }
    });
  }

  getFoodName(foodItem: Food | { _id: string; name: string } | string): string {
    if (typeof foodItem === 'string') return foodItem;
    if ('name' in foodItem) return foodItem.name;
    return 'Unknown Food';
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

  titleCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  updateCustomFoodDishName(value: string) {
    const current = this.customFood();
    this.customFood.set({ ...current, dishName: value });
  }

  updateCustomFoodCalories(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, calories: value });
  }

  updateCustomFoodProtein(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, protein: value });
  }

  updateCustomFoodCarbohydrates(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, carbohydrates: value });
  }

  updateCustomFoodFats(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, fats: value });
  }

  updateCustomFoodFiber(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, fiber: value });
  }

  updateCustomFoodServingSize(value: number) {
    const current = this.customFood();
    this.customFood.set({ ...current, avgFoodServingSize: value });
  }

  updateCustomFoodServingUnit(value: string) {
    const current = this.customFood();
    this.customFood.set({ ...current, servingUnitName: value });
  }

  deleteFoodItem(loggedFoodId: string | undefined) {
    if (!loggedFoodId) return;

    if (!confirm('Are you sure you want to delete this food item?')) {
      return;
    }

    this.deletingFoodId.set(loggedFoodId);

    this.apiService.delete<ApiResponse<any>>(
      true,
      `${API_ENDPOINTS.DELETE_CALORIE_INTAKE}/${loggedFoodId}`
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          // Reload the daily log to get updated data
          this.loadDailyLog();
          this.rangeIntakeStore.clearState();
        }
        this.deletingFoodId.set(null);
      },
      error: (error) => {
        console.error('Error deleting food item:', error);
        this.deletingFoodId.set(null);
      }
    });
  }

  getCaloriesDisplay(food: Food): string {
    // Calculate calories per average serving size (calories in DB are per 100g)
    if (food.avgFoodServingSize && food.avgFoodServingSize !== 100) {
      const caloriesPerServing = Math.round((food.calories * food.avgFoodServingSize) / 100);
      if (food.servingUnitName) {
        return `${caloriesPerServing} cal / ${food.servingUnitName}`;
      } else {
        return `${caloriesPerServing} cal / ${food.avgFoodServingSize}g`;
      }
    } else if (food.servingUnitName) {
      // If serving unit name exists but avgFoodServingSize is 100g or not set, use original calories
      return `${food.calories} cal / ${food.servingUnitName}`;
    } else {
      // Default fallback to 100g
      return `${food.calories} cal / 100g`;
    }
  }
}
