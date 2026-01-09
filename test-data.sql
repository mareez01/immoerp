-- Test data for FL Smartech AMC ERP Database
-- This file contains sample data to populate all tables for testing

BEGIN;

-- First, let's insert some test users into auth.users (this would normally be handled by Supabase Auth)
-- Note: In a real environment, you'd create users through Supabase Auth, not directly in auth.users

-- Insert test profiles (staff and customers)
INSERT INTO "public"."profiles" (
  "id", 
  "user_id", 
  "full_name", 
  "email", 
  "phone", 
  "department", 
  "is_active", 
  "avatar_url", 
  "created_at", 
  "updated_at"
) VALUES 
-- Staff profiles
('staff-admin-001', 'auth-admin-001', 'Admin User', 'admin@flsmartech.com', '+917094989001', 'Management', true, null, '2024-01-01 08:00:00+00', '2024-01-01 08:00:00+00'),
('staff-tech-001', 'auth-tech-001', 'Rajesh Kumar', 'rajesh.tech@flsmartech.com', '+917094989002', 'Technical Support', true, null, '2024-01-01 08:00:00+00', '2024-01-01 08:00:00+00'),
('staff-tech-002', 'auth-tech-002', 'Priya Sharma', 'priya.tech@flsmartech.com', '+917094989003', 'Technical Support', true, null, '2024-01-01 08:00:00+00', '2024-01-01 08:00:00+00'),
('staff-support-001', 'auth-support-001', 'Mohammed Ali', 'mohammed.support@flsmartech.com', '+917094989004', 'Customer Support', true, null, '2024-01-01 08:00:00+00', '2024-01-01 08:00:00+00'),
('staff-book-001', 'auth-book-001', 'Lakshmi Narayanan', 'lakshmi.accounts@flsmartech.com', '+917094989005', 'Finance', true, null, '2024-01-01 08:00:00+00', '2024-01-01 08:00:00+00'),

-- Customer profiles
('customer-001', 'auth-customer-001', 'Siva Raman', 'siva22012005@gmail.com', '+917094989578', null, true, null, '2024-01-15 10:00:00+00', '2024-01-15 10:00:00+00'),
('customer-002', 'auth-customer-002', 'Senthilkumar Sivaraman', 'senthil@velavantraders.com', '+917094989579', null, true, null, '2024-02-01 09:00:00+00', '2024-02-01 09:00:00+00'),
('customer-003', 'auth-customer-003', 'Karthik Subramanian', 'karthik@techsolutions.com', '+917094989580', null, true, null, '2024-02-15 11:00:00+00', '2024-02-15 11:00:00+00'),
('customer-004', 'auth-customer-004', 'Divya Prakash', 'divya@designstudio.com', '+917094989581', null, true, null, '2024-03-01 14:00:00+00', '2024-03-01 14:00:00+00'),
('customer-005', 'auth-customer-005', 'Anand Kumar', 'anand@tradingcorp.com', '+917094989582', null, true, null, '2024-03-15 16:00:00+00', '2024-03-15 16:00:00+00');

-- Insert user roles
INSERT INTO "public"."user_roles" ("user_id", "role") VALUES 
('auth-admin-001', 'admin'),
('auth-tech-001', 'technician'),
('auth-tech-002', 'technician'),
('auth-support-001', 'support'),
('auth-book-001', 'bookkeeping');
-- Note: Customers don't have roles in user_roles table as they use customer portal

-- Insert AMC responses (service requests)
INSERT INTO "public"."amc_responses" (
  "amc_form_id",
  "full_name",
  "company_name", 
  "email",
  "phone",
  "city",
  "district",
  "state",
  "problem_description",
  "preferred_contact_method",
  "consent_remote_access",
  "payment_id",
  "order_id", 
  "payment_status",
  "created_at",
  "user_role",
  "department",
  "system_usage_purpose",
  "urgency_level",
  "previous_service_history", 
  "remote_software_preference",
  "languages_known",
  "preferred_lang",
  "amount",
  "status",
  "amc_started",
  "notes",
  "updated_at",
  "daily_usage_hours",
  "usage_pattern", 
  "primary_usage_time",
  "purchase_date",
  "purchase_location",
  "warranty_status",
  "warranty_expiry_date",
  "current_performance",
  "performance_issues",
  "system_age_months",
  "backup_frequency",
  "antivirus_installed",
  "antivirus_name",
  "regular_maintenance",
  "network_environment",
  "power_backup",
  "system_criticality",
  "downtime_tolerance",
  "scheduled_date",
  "scheduled_time",
  "appointment_status",
  "assigned_to",
  "customer_user_id"
) VALUES 

-- Active service requests
('amc-form-001', 'Siva Raman', 'Test Company', 'siva22012005@gmail.com', '+917094989578', 'Chennai', 'Chennai', 'Tamil Nadu', 
 'System running very slow, frequent crashes during work hours', 'WhatsApp', true, 
 'pay_test001', 'order_test001', 'SUCCESS', '2024-11-13 04:49:15.765346+00', 
 'Employee', 'IT', 'Business operations and data entry', 'High', 'None', 'TeamViewer', 
 'Tamil, English', 'Tamil', '2999', 'in_progress', true, 'Customer reports blue screen errors twice this week',
 '2025-01-02 10:30:00+00', '6-8 hours', 'Daily', 'Morning', '2023-05-15', 'Amazon', 
 'active', '2026-05-15', 'poor', ARRAY['slow_startup', 'blue_screen', 'software_crashes'], 
 18, 'weekly', true, 'Windows Defender', 'occasionally', 'office', true, 'business_critical', 
 'same_day', '2026-01-08', '10:00', 'scheduled', 'staff-tech-001', 'auth-customer-001'),

('amc-form-002', 'Senthilkumar Sivaraman', 'Velavan Traders', 'senthil@velavantraders.com', '+917094989579', 'Srivilliputtur', 'Virudhunagar', 'Tamil Nadu', 
 'Need complete system setup for new office branch', 'Phone', true, 
 null, 'order_test002', 'Pending', '2025-12-07 09:22:38.045132+00', 
 'Business Owner', 'Operations', 'Inventory management and billing', 'Medium', 'FL Smartech AMC', 'AnyDesk', 
 'Tamil', 'Tamil', '7500', 'new', false, 'New office setup - 5 workstations needed',
 '2025-12-07 14:52:39+00', '8+ hours', 'Daily', 'Full day', '2024-01-22', 'Local dealer', 
 'active', '2027-01-22', 'good', ARRAY['network_connectivity'], 
 12, 'daily', true, 'McAfee', 'yes_professional', 'office', true, 'important', 
 'next_day', '2026-01-10', '09:00', 'scheduled', 'staff-tech-002', 'auth-customer-002'),

('amc-form-003', 'Karthik Subramanian', 'TechSolutions Pvt Ltd', 'karthik@techsolutions.com', '+917094989580', 'Coimbatore', 'Coimbatore', 'Tamil Nadu',
 'Server maintenance and performance optimization required', 'Email', true,
 'pay_test003', 'order_test003', 'SUCCESS', '2025-11-20 11:15:30.123456+00',
 'IT Manager', 'Technology', 'Web development and server hosting', 'Critical', 'Previous vendor', 'TeamViewer',
 'English', 'English', '15000', 'completed', true, 'Server optimization completed successfully. Performance improved by 40%',
 '2025-12-01 15:20:00+00', '24/7', 'Continuous', 'All day', '2022-08-10', 'Dell Direct', 
 'active', '2025-08-10', 'excellent', null,
 28, 'daily', true, 'Enterprise Antivirus', 'yes_professional', 'data_center', true, 'business_critical',
 'immediate', '2025-11-22', '14:00', 'completed', 'staff-tech-001', 'auth-customer-003'),

('amc-form-004', 'Divya Prakash', 'Creative Design Studio', 'divya@designstudio.com', '+917094989581', 'Madurai', 'Madurai', 'Tamil Nadu',
 'Graphics workstation needs hardware upgrade and software optimization', 'WhatsApp', true,
 null, 'order_test004', 'Pending', '2026-01-04 08:48:09.319912+00',
 'Creative Director', 'Design', 'Graphic design and video editing', 'Medium', 'None', 'Chrome Remote Desktop',
 'Tamil, English', 'English', '5500', 'pending', false, 'High-end graphics work requires system optimization',
 '2026-01-04 14:18:11+00', '4-6 hours', 'Daily', 'Afternoon', '2023-12-10', 'Amazon', 
 'active', '2026-12-10', 'average', ARRAY['slow_startup', 'overheating'],
 13, 'weekly', true, 'Norton', 'occasionally', 'home_office', false, 'moderate',
 'within_week', '2026-01-12', '15:30', 'scheduled', null, 'auth-customer-004'),

('amc-form-005', 'Anand Kumar', 'Trading Corporation', 'anand@tradingcorp.com', '+917094989582', 'Salem', 'Salem', 'Tamil Nadu',
 'Annual maintenance contract renewal and system health check', 'Email', false,
 'pay_test005', 'order_test005', 'SUCCESS', '2025-12-29 05:07:08.348098+00',
 'Manager', 'Finance', 'Financial data processing and reports', 'Low', 'FL Smartech AMC', 'None',
 'English, Hindi', 'English', '3500', 'scheduled', true, 'Regular annual maintenance - all systems running well',
 '2026-01-02 05:39:21+00', '1-3 hours', 'Occasional', 'Evening', '2021-06-15', 'Local vendor',
 'active', '2024-06-15', 'good', null,
 54, 'monthly', true, 'Windows Defender', 'yes_professional', 'office', true, 'moderate',
 'same_day', '2026-01-28', '16:00', 'scheduled', 'staff-tech-002', 'auth-customer-005');

-- Insert AMC systems information
INSERT INTO "public"."amc_systems" (
  "amc_form_id",
  "device_name", 
  "device_type",
  "operating_system",
  "mac_address_hint",
  "created_at"
) VALUES 
-- Systems for amc-form-001
('amc-form-001', 'Main Workstation', 'desktop', 'Windows 11 Pro', '**:**:**:**:78', '2024-11-13 04:49:15+00'),
('amc-form-001', 'Backup Laptop', 'laptop', 'Windows 10 Pro', '**:**:**:**:92', '2024-11-13 04:49:15+00'),

-- Systems for amc-form-002
('amc-form-002', 'Office PC 1', 'desktop', 'Windows 11', '**:**:**:**:45', '2025-12-07 09:22:38+00'),
('amc-form-002', 'Office PC 2', 'desktop', 'Windows 11', '**:**:**:**:46', '2025-12-07 09:22:38+00'),
('amc-form-002', 'Office PC 3', 'desktop', 'Windows 11', '**:**:**:**:47', '2025-12-07 09:22:38+00'),
('amc-form-002', 'Manager Laptop', 'laptop', 'Windows 11 Pro', '**:**:**:**:48', '2025-12-07 09:22:38+00'),
('amc-form-002', 'Billing Terminal', 'desktop', 'Windows 10', '**:**:**:**:49', '2025-12-07 09:22:38+00'),

-- Systems for amc-form-003  
('amc-form-003', 'Web Server', 'server', 'Ubuntu 20.04 LTS', '**:**:**:**:31', '2025-11-20 11:15:30+00'),
('amc-form-003', 'Database Server', 'server', 'Ubuntu 20.04 LTS', '**:**:**:**:32', '2025-11-20 11:15:30+00'),
('amc-form-003', 'Development Workstation', 'desktop', 'Ubuntu 22.04 LTS', '**:**:**:**:33', '2025-11-20 11:15:30+00'),

-- Systems for amc-form-004
('amc-form-004', 'Design Workstation Pro', 'desktop', 'Windows 11 Pro', '**:**:**:**:21', '2026-01-04 08:48:09+00'),
('amc-form-004', 'Render Farm Node 1', 'desktop', 'Windows 11', '**:**:**:**:22', '2026-01-04 08:48:09+00'),
('amc-form-004', 'Mobile Workstation', 'laptop', 'Windows 11 Pro', '**:**:**:**:23', '2026-01-04 08:48:09+00'),

-- Systems for amc-form-005
('amc-form-005', 'Accounting PC', 'desktop', 'Windows 10 Pro', '**:**:**:**:61', '2025-12-29 05:07:08+00'),
('amc-form-005', 'Manager PC', 'desktop', 'Windows 10 Pro', '**:**:**:**:62', '2025-12-29 05:07:08+00');

-- Insert invoices
INSERT INTO "public"."invoices" (
  "amc_order_id",
  "invoice_number", 
  "amount",
  "status",
  "due_date",
  "created_at",
  "updated_at",
  "validity_start",
  "validity_end",
  "paid_at",
  "invoice_url",
  "contract_url"
) VALUES 
('amc-form-001', 'INV-2024-001', 2999.00, 'paid', '2024-12-13', '2024-11-13 04:49:15+00', '2024-11-20 10:30:00+00', 
 '2024-11-13', '2025-11-13', '2024-11-20 10:30:00+00', 
 'https://storage.example.com/invoices/INV-2024-001.pdf', 
 'https://storage.example.com/contracts/CONTRACT-2024-001.pdf'),

('amc-form-002', 'INV-2024-002', 7500.00, 'sent', '2025-01-07', '2025-12-07 09:22:38+00', '2025-12-07 09:22:38+00',
 '2025-12-07', '2026-12-07', null, 
 'https://storage.example.com/invoices/INV-2024-002.pdf', null),

('amc-form-003', 'INV-2024-003', 15000.00, 'paid', '2025-12-20', '2025-11-20 11:15:30+00', '2025-11-25 14:20:00+00',
 '2025-11-20', '2026-11-20', '2025-11-25 14:20:00+00',
 'https://storage.example.com/invoices/INV-2024-003.pdf',
 'https://storage.example.com/contracts/CONTRACT-2024-003.pdf'),

('amc-form-005', 'INV-2025-001', 3500.00, 'paid', '2026-01-29', '2025-12-29 05:07:08+00', '2026-01-03 16:45:00+00',
 '2025-12-29', '2026-12-29', '2026-01-03 16:45:00+00',
 'https://storage.example.com/invoices/INV-2025-001.pdf',
 'https://storage.example.com/contracts/CONTRACT-2025-001.pdf');

-- Insert worksheets (work completed by technicians)
INSERT INTO "public"."worksheets" (
  "amc_order_id",
  "staff_id",
  "time_spent_minutes",
  "tasks_performed", 
  "issues_resolved",
  "status",
  "created_at",
  "updated_at"
) VALUES 
('amc-form-003', 'staff-tech-001', 240, 
 'Server performance optimization, database tuning, cache configuration, security updates', 
 'Resolved slow query issues, optimized database indexes, configured Redis cache, applied security patches',
 'submitted', '2025-11-22 14:00:00+00', '2025-11-22 18:00:00+00'),

('amc-form-001', 'staff-tech-001', 180,
 'System diagnostics, malware scan, driver updates, performance optimization',
 'Removed malware, updated outdated drivers, cleaned registry, optimized startup programs',
 'in_progress', '2026-01-06 10:00:00+00', '2026-01-06 13:00:00+00');

-- Insert work logs
INSERT INTO "public"."work_logs" (
  "worksheet_id",
  "description",
  "log_type",
  "created_at"
) VALUES 
-- Logs for completed server work
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Started server maintenance session', 'progress', '2025-11-22 14:00:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Identified slow database queries affecting performance', 'issue', '2025-11-22 14:30:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Optimized database indexes and query performance', 'resolution', '2025-11-22 15:45:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Configured Redis cache for improved response times', 'progress', '2025-11-22 16:30:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Applied latest security patches and updates', 'progress', '2025-11-22 17:15:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-003'), 'Completed maintenance. Server performance improved by 40%', 'completion', '2025-11-22 18:00:00+00'),

-- Logs for ongoing work
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-001'), 'Connected to customer system via TeamViewer', 'progress', '2026-01-06 10:00:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-001'), 'Found multiple malware infections and outdated drivers', 'issue', '2026-01-06 10:30:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-001'), 'Running comprehensive malware removal and driver updates', 'progress', '2026-01-06 11:15:00+00'),
((SELECT id FROM worksheets WHERE amc_order_id = 'amc-form-001'), 'System cleanup in progress, performance showing improvement', 'progress', '2026-01-06 13:00:00+00');

-- Insert customer interactions
INSERT INTO "public"."customer_interactions" (
  "amc_order_id",
  "staff_id",
  "interaction_type",
  "summary",
  "customer_feedback",
  "internal_notes",
  "issues_resolved",
  "created_at"
) VALUES 
('amc-form-001', 'staff-support-001', 'phone_call', 
 'Initial consultation about system performance issues',
 'Customer very happy with quick response time and professional approach',
 'Customer mentioned system has been slow for 2 weeks. Blue screen occurred twice.',
 'Scheduled remote session for detailed diagnosis',
 '2024-11-13 10:30:00+00'),

('amc-form-003', 'staff-tech-001', 'remote_session',
 'Server maintenance and optimization completed',
 'Excellent work! Server is running much faster now. Very satisfied with the service.',
 'Customer was present during entire session. Explained all changes made.',
 'Database optimization, cache configuration, security updates completed',
 '2025-11-22 18:30:00+00'),

('amc-form-002', 'staff-support-001', 'email',
 'New office setup coordination and scheduling',
 'Appreciate the detailed planning. Looking forward to the setup.',
 'Customer needs 5 workstations configured. Scheduled for next week.',
 'Confirmed requirements and appointment time',
 '2025-12-08 09:15:00+00');

-- Insert support tickets
INSERT INTO "public"."support_tickets" (
  "customer_user_id",
  "amc_order_id",
  "subject",
  "description",
  "priority",
  "status", 
  "assigned_to",
  "created_at",
  "updated_at"
) VALUES 
('auth-customer-001', 'amc-form-001', 'System still running slow after maintenance',
 'Hi, the system seems to be running better but still experiencing some slowness during large file operations. Could you please check?',
 'medium', 'open', 'staff-tech-001', '2026-01-06 15:30:00+00', '2026-01-06 15:30:00+00'),

('auth-customer-004', null, 'Question about graphics card compatibility',
 'I am planning to upgrade my graphics card for better rendering performance. Can you recommend compatible options for my workstation?',
 'low', 'open', 'staff-support-001', '2026-01-05 11:20:00+00', '2026-01-05 11:20:00+00'),

('auth-customer-002', 'amc-form-002', 'Additional software installation request',
 'We need accounting software installed on all 5 workstations. Can this be included in the setup package?',
 'medium', 'in_progress', 'staff-tech-002', '2025-12-10 14:45:00+00', '2025-12-12 09:30:00+00');

-- Insert ticket messages
INSERT INTO "public"."ticket_messages" (
  "ticket_id",
  "sender_id",
  "message",
  "is_internal",
  "created_at"
) VALUES 
-- Messages for ticket 1
((SELECT id FROM support_tickets WHERE subject = 'System still running slow after maintenance'), 
 'auth-customer-001', 'System still running slow after maintenance. Hi, the system seems to be running better but still experiencing some slowness during large file operations. Could you please check?', 
 false, '2026-01-06 15:30:00+00'),
 
((SELECT id FROM support_tickets WHERE subject = 'System still running slow after maintenance'), 
 'staff-tech-001', 'I will remote in tomorrow morning to check the large file operation performance. May need to optimize disk I/O settings.',
 false, '2026-01-06 16:45:00+00'),

-- Messages for ticket 2  
((SELECT id FROM support_tickets WHERE subject = 'Question about graphics card compatibility'),
 'auth-customer-004', 'I am planning to upgrade my graphics card for better rendering performance. Can you recommend compatible options for my workstation?',
 false, '2026-01-05 11:20:00+00'),

((SELECT id FROM support_tickets WHERE subject = 'Question about graphics card compatibility'),
 'staff-support-001', 'Based on your workstation specs, I recommend RTX 4070 or RTX 4080. Let me prepare a detailed compatibility report.',
 false, '2026-01-05 14:30:00+00'),

-- Messages for ticket 3
((SELECT id FROM support_tickets WHERE subject = 'Additional software installation request'),
 'auth-customer-002', 'We need accounting software installed on all 5 workstations. Can this be included in the setup package?',
 false, '2025-12-10 14:45:00+00'),

((SELECT id FROM support_tickets WHERE subject = 'Additional software installation request'),
 'staff-tech-002', 'Yes, we can include Tally or similar accounting software. Will add 2 hours to the setup time. Please confirm which software you prefer.',
 false, '2025-12-12 09:30:00+00'),

((SELECT id FROM support_tickets WHERE subject = 'Additional software installation request'),
 'staff-tech-002', 'Internal note: Need to check accounting software licenses and pricing for bulk installation',
 true, '2025-12-12 09:35:00+00');

COMMIT;

-- Summary of test data inserted:
-- - 10 profiles (5 staff + 5 customers)  
-- - 5 user roles (admin, 2 technicians, support, bookkeeping)
-- - 5 AMC service requests with different statuses
-- - 14 system records across the AMC requests
-- - 4 invoices (mix of paid/pending/sent)
-- - 2 worksheets (1 completed, 1 in progress)
-- - 10 work log entries
-- - 3 customer interaction records
-- - 3 support tickets with different priorities
-- - 7 ticket messages (including internal notes)

-- This data covers:
-- ✅ Different user roles and permissions
-- ✅ Various AMC request statuses (new, in_progress, completed, pending, scheduled)
-- ✅ Multiple system types (desktop, laptop, server)
-- ✅ Different operating systems (Windows 10/11, Ubuntu)
-- ✅ Various payment statuses and invoice states
-- ✅ Work tracking with logs and time spent
-- ✅ Customer communication through tickets and interactions
-- ✅ Different geographic locations across Tamil Nadu
-- ✅ Range of business types and use cases
-- ✅ Performance issues and resolutions