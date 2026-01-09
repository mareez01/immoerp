// User & Auth Types
export type UserRole = 'admin' | 'technician' | 'support' | 'bookkeeping';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar?: string;
  active: boolean;
  created_at: string;
}

// AMC Order Types
export type OrderStatus = 'new' | 'active' | 'inactive' | 'cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'overdue' | 'refunded';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled';
export type WorkStatus = 'pending' | 'in_progress' | 'completed' | 'awaiting_approval';

export interface AMCOrder {
  amc_form_id: string;
  full_name: string;
  company_name?: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  state: string;
  problem_description?: string;
  preferred_contact_method?: string;
  consent_remote_access: boolean;
  payment_id?: string;
  order_id?: string;
  payment_status: PaymentStatus | string;
  created_at: string;
  updated_at: string;
  user_role: string;
  department?: string;
  system_usage_purpose: string;
  urgency_level?: UrgencyLevel;
  previous_service_history?: string;
  remote_software_preference: string;
  languages_known: string;
  preferred_lang: string;
  amount?: string;
  status: OrderStatus;
  work_status?: WorkStatus;
  amc_started: boolean;
  notes?: string;
  issue_category?: string;
  remote_tool?: string;
  appointment_at?: string;
  assigned_to?: string;
  service_work_description?: string;
  unsubscribed: boolean;
  
  // Subscription tracking
  subscription_start_date?: string;
  subscription_end_date?: string;
  
  // Usage pattern fields
  daily_usage_hours?: string;
  usage_pattern?: string;
  primary_usage_time?: string;
  
  // System info fields
  purchase_date?: string;
  purchase_location?: string;
  warranty_status?: 'active' | 'expired' | 'unknown';
  warranty_expiry_date?: string;
  last_service_date?: string;
  last_service_provider?: string;
  current_performance?: 'excellent' | 'good' | 'average' | 'poor' | 'very_poor';
  performance_issues?: string[];
  system_age_months?: number;
  
  // Additional fields
  backup_frequency?: 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never';
  antivirus_installed?: boolean;
  antivirus_name?: string;
  regular_maintenance?: 'yes_professional' | 'yes_self' | 'no' | 'occasionally';
  network_environment?: 'home' | 'office' | 'public' | 'mixed';
  power_backup?: boolean;
  system_criticality?: 'business_critical' | 'important' | 'moderate' | 'low';
  downtime_tolerance?: 'immediate_fix' | 'same_day' | 'within_week' | 'flexible';
  
  // Appointment fields
  scheduled_date?: string;
  scheduled_time?: string;
  appointment_status?: AppointmentStatus;
  appointment_notes?: string;
  
  // Related data
  systems?: AMCSystem[];
  worksheets?: Worksheet[];
  interactions?: CustomerInteraction[];
}

export interface AMCSystem {
  id: number;
  amc_form_id: string;
  device_name?: string;
  operating_system?: string;
  device_type: string;
  created_at: string;
}

// Staff Types
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  avatar?: string;
  active: boolean;
  assigned_orders_count?: number;
  created_at: string;
}

// Customer Types
export type CustomerStatus = 'active' | 'inactive' | 'unsubscribed';

export interface Customer {
  id: string;
  name: string;
  company_name?: string;
  email: string;
  phone: string;
  location: string;
  status: CustomerStatus;
  total_orders: number;
  total_spent: number;
  subscription_valid_until?: string;
  created_at: string;
}

// Worksheet Types
export interface Worksheet {
  id: string;
  amc_order_id: string;
  staff_id: string;
  staff_name?: string;
  time_spent_minutes: number;
  tasks_performed: string;
  issues_resolved?: string;
  work_logs: WorkLog[];
  status: 'draft' | 'submitted' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface WorkLog {
  id: string;
  timestamp: string;
  description: string;
  images?: string[];
  type: 'progress' | 'issue' | 'resolution' | 'note';
}

// Customer Interaction Types
export interface CustomerInteraction {
  id: string;
  amc_order_id: string;
  staff_id: string;
  staff_name?: string;
  interaction_type: 'call' | 'email' | 'chat' | 'visit';
  summary: string;
  issues_resolved?: string;
  internal_notes?: string;
  customer_feedback?: string;
  created_at: string;
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  amc_order_id: string;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  invoice_url?: string;
  contract_url?: string;
  validity_start?: string;
  validity_end?: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface InvoiceWithCustomer extends Invoice {
  customer_name: string;
  customer_email: string;
}

// Dashboard Types
export interface DashboardStats {
  total_orders: number;
  active_subscriptions: number;
  pending_invoices: number;
  total_revenue: number;
  orders_by_status: Record<OrderStatus, number>;
  monthly_revenue: { month: string; revenue: number }[];
  recent_orders: AMCOrder[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'reminder' | 'alert' | 'info';
  title: string;
  message: string;
  target_type: 'customer' | 'staff';
  target_id: string;
  sent_via: ('email' | 'sms')[];
  sent_at: string;
  read: boolean;
}
