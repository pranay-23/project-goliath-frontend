import { ChangeDetectionStrategy, Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints.constants';
import { UserStore } from '../../core/stores/user.store';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
}

interface Connection {
  _id: string;
  fromUserId?: User;
  toUserId?: User;
  friend?: User; // Friend information (the user who is not the current user)
  status: 'accepted' | 'interested' | 'rejected' | 'ignored';
  createdAt?: string;
}

interface Friend {
  _id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  connectionId: string;
}

interface DailyLogTotals {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  totalProteinIn: number;
  totalCarbsIn: number;
  totalFatsIn: number;
  totalFibreIn: number;
}

interface LoggedFood {
  _id?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  foodItem: { _id: string; name: string };
  quantity: number;
  totalGramsConsumed: number;
  hasQuantity?: boolean;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
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

type TabType = 'friends' | 'available' | 'requests';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsComponent implements OnInit {
  private apiService = inject(ApiService);
  private userStore = inject(UserStore);

  // Active tab
  activeTab = signal<TabType>('friends');
  
  // Friends list
  friends = signal<Friend[]>([]);
  isLoadingFriends = signal<boolean>(false);
  friendsSearchQuery = signal<string>('');
  
  // Filtered friends based on search
  filteredFriends = computed(() => {
    const query = this.friendsSearchQuery().toLowerCase().trim();
    if (!query) return this.friends();
    return this.friends().filter(friend => 
      `${friend.firstName} ${friend.lastName}`.toLowerCase().includes(query)
    );
  });
  
  // Available users
  availableUsers = signal<User[]>([]);
  isLoadingAvailableUsers = signal<boolean>(false);
  
  // Pending requests
  pendingRequests = signal<Connection[]>([]);
  isLoadingRequests = signal<boolean>(false);
  
  // Selected friend for viewing daily log
  selectedFriend = signal<Friend | null>(null);
  friendDailyLog = signal<DailyLogResponse | null>(null);
  isLoadingFriendLog = signal<boolean>(false);
  friendLogDate = signal<string>(new Date().toISOString().split('T')[0]);
  showFriendLogModal = signal<boolean>(false);
  
  // Action states
  processingRequestId = signal<string | null>(null);
  sendingRequestToUserId = signal<string | null>(null);

  ngOnInit() {
    this.loadFriends();
    this.loadAvailableUsers();
    this.loadPendingRequests();
  }

  switchTab(tab: TabType) {
    this.activeTab.set(tab);
    if (tab === 'friends') {
      this.loadFriends();
    } else if (tab === 'available') {
      this.loadAvailableUsers();
    } else if (tab === 'requests') {
      this.loadPendingRequests();
    }
  }

  loadFriends() {
    this.isLoadingFriends.set(true);
    
    this.apiService.get<ApiResponse<Connection[]>>(
      true,
      API_ENDPOINTS.GET_FRIENDS
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          // Backend now returns connections with friend information already filtered
          const connections = response.response.data;
          
          const friendsList: Friend[] = connections
            .filter(conn => conn.friend && conn.friend._id) // Only include connections with valid friend data
            .map(conn => ({
              _id: String(conn.friend!._id),
              firstName: conn.friend!.firstName,
              lastName: conn.friend!.lastName,
              profilePictureUrl: conn.friend!.profilePictureUrl,
              connectionId: conn._id
            }));
          
          this.friends.set(friendsList);
        } else {
          this.friends.set([]);
        }
        this.isLoadingFriends.set(false);
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.friends.set([]);
        this.isLoadingFriends.set(false);
      }
    });
  }

  loadAvailableUsers() {
    this.isLoadingAvailableUsers.set(true);
    
    this.apiService.get<ApiResponse<User[]>>(
      true,
      API_ENDPOINTS.GET_AVAILABLE_USERS,
      { params: { page: 1, limit: 50 } }
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.availableUsers.set(response.response.data);
        } else {
          this.availableUsers.set([]);
        }
        this.isLoadingAvailableUsers.set(false);
      },
      error: (error) => {
        console.error('Error loading available users:', error);
        this.availableUsers.set([]);
        this.isLoadingAvailableUsers.set(false);
      }
    });
  }

  loadPendingRequests() {
    this.isLoadingRequests.set(true);
    
    this.apiService.get<ApiResponse<Connection[]>>(
      true,
      API_ENDPOINTS.GET_PENDING_REQUESTS
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.pendingRequests.set(response.response.data);
        } else {
          this.pendingRequests.set([]);
        }
        this.isLoadingRequests.set(false);
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
        this.pendingRequests.set([]);
        this.isLoadingRequests.set(false);
      }
    });
  }

  sendConnectionRequest(toUserId: string) {
    this.sendingRequestToUserId.set(toUserId);
    
    this.apiService.get<ApiResponse<any>>(
      true,
      `${API_ENDPOINTS.SEND_CONNECTION_REQUEST}/interested/${toUserId}`
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          // Reload available users to remove the one we just sent request to
          this.loadAvailableUsers();
        }
        this.sendingRequestToUserId.set(null);
      },
      error: (error) => {
        console.error('Error sending connection request:', error);
        this.sendingRequestToUserId.set(null);
      }
    });
  }

  acceptRequest(requestId: string) {
    this.processingRequestId.set(requestId);
    
    this.apiService.get<ApiResponse<any>>(
      true,
      `${API_ENDPOINTS.REVIEW_CONNECTION_REQUEST}/accepted/${requestId}`
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          // Reload requests and friends
          this.loadPendingRequests();
          this.loadFriends();
        }
        this.processingRequestId.set(null);
      },
      error: (error) => {
        console.error('Error accepting request:', error);
        this.processingRequestId.set(null);
      }
    });
  }

  rejectRequest(requestId: string) {
    this.processingRequestId.set(requestId);
    
    this.apiService.get<ApiResponse<any>>(
      true,
      `${API_ENDPOINTS.REVIEW_CONNECTION_REQUEST}/rejected/${requestId}`
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success) {
          // Reload requests
          this.loadPendingRequests();
        }
        this.processingRequestId.set(null);
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
        this.processingRequestId.set(null);
      }
    });
  }

  viewFriendDailyLog(friend: Friend) {
    this.selectedFriend.set(friend);
    this.friendLogDate.set(new Date().toISOString().split('T')[0]);
    this.showFriendLogModal.set(true);
    this.loadFriendDailyLog();
  }

  onFriendLogDateChange() {
    this.loadFriendDailyLog();
  }

  loadFriendDailyLog() {
    const friend = this.selectedFriend();
    if (!friend) return;

    this.isLoadingFriendLog.set(true);
    
    this.apiService.get<ApiResponse<DailyLogResponse>>(
      true,
      API_ENDPOINTS.GET_FRIEND_DAILY_LOG,
      { params: { friendId: friend._id, date: this.friendLogDate() } }
    ).subscribe({
      next: (response) => {
        if (response.responseHeader.success && response.response?.data) {
          this.friendDailyLog.set(response.response.data);
        } else {
          this.friendDailyLog.set({
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
        this.isLoadingFriendLog.set(false);
      },
      error: (error) => {
        console.error('Error loading friend daily log:', error);
        this.friendDailyLog.set({
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
        this.isLoadingFriendLog.set(false);
      }
    });
  }

  closeFriendLogModal() {
    this.showFriendLogModal.set(false);
    this.selectedFriend.set(null);
    this.friendDailyLog.set(null);
  }

  getUserInitials(user: User | Friend): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getUserFullName(user: User | Friend): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Generate a consistent color gradient based on user's name
   * Similar to Gmail's avatar color generation
   */
  getAvatarColorGradient(user: User | Friend): string {
    const fullName = `${user.firstName}${user.lastName}`.toLowerCase();
    
    // Simple hash function to convert name to a number
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Predefined color palette (Gmail-like colors)
    const colorPalette = [
      { from: 'from-red-500', to: 'to-pink-500' },
      { from: 'from-orange-500', to: 'to-red-500' },
      { from: 'from-amber-500', to: 'to-orange-500' },
      { from: 'from-yellow-500', to: 'to-amber-500' },
      { from: 'from-lime-500', to: 'to-yellow-500' },
      { from: 'from-green-500', to: 'to-emerald-500' },
      { from: 'from-emerald-500', to: 'to-teal-500' },
      { from: 'from-teal-500', to: 'to-cyan-500' },
      { from: 'from-cyan-500', to: 'to-sky-500' },
      { from: 'from-blue-500', to: 'to-indigo-500' },
      { from: 'from-indigo-500', to: 'to-violet-500' },
      { from: 'from-violet-500', to: 'to-purple-500' },
      { from: 'from-purple-500', to: 'to-fuchsia-500' },
      { from: 'from-pink-500', to: 'to-rose-500' },
      { from: 'from-rose-500', to: 'to-red-500' },
      { from: 'from-blue-600', to: 'to-cyan-600' },
      { from: 'from-indigo-600', to: 'to-purple-600' },
      { from: 'from-purple-600', to: 'to-pink-600' },
      { from: 'from-green-600', to: 'to-teal-600' },
      { from: 'from-teal-600', to: 'to-blue-600' }
    ];
    
    // Use absolute value and modulo to get a consistent index
    const index = Math.abs(hash) % colorPalette.length;
    const colors = colorPalette[index];
    
    return `bg-gradient-to-br ${colors.from} ${colors.to}`;
  }
  
  updateFriendsSearchQuery(value: string) {
    this.friendsSearchQuery.set(value);
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

  getFoodName(foodItem: { _id: string; name: string } | string): string {
    if (typeof foodItem === 'string') return foodItem;
    return foodItem.name;
  }

  groupedMeals = computed(() => {
    const log = this.friendDailyLog();
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
}
