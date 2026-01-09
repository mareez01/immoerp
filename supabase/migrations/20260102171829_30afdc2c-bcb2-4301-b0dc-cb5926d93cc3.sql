-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'support', 'bookkeeping');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table for staff and user info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage profiles" ON public.profiles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create AMC responses table (matching your existing schema)
CREATE TABLE public.amc_responses (
    amc_form_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    problem_description TEXT,
    preferred_contact_method TEXT,
    consent_remote_access BOOLEAN DEFAULT false,
    payment_id TEXT,
    order_id TEXT,
    payment_status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_role TEXT NOT NULL,
    department TEXT,
    system_usage_purpose TEXT NOT NULL,
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    previous_service_history TEXT,
    remote_software_preference TEXT NOT NULL,
    languages_known TEXT NOT NULL,
    preferred_lang TEXT NOT NULL,
    amount TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'pending', 'in_progress', 'completed', 'cancelled')),
    amc_started BOOLEAN DEFAULT false,
    notes TEXT,
    issue_category TEXT,
    remote_tool TEXT,
    appointment_at TIMESTAMPTZ,
    assigned_to UUID REFERENCES public.profiles(id),
    service_work_description TEXT,
    unsubscribed BOOLEAN DEFAULT false,
    daily_usage_hours TEXT,
    usage_pattern TEXT,
    primary_usage_time TEXT,
    purchase_date DATE,
    purchase_location TEXT,
    warranty_status TEXT CHECK (warranty_status IN ('active', 'expired', 'unknown')),
    warranty_expiry_date DATE,
    last_service_date DATE,
    last_service_provider TEXT,
    current_performance TEXT CHECK (current_performance IN ('excellent', 'good', 'average', 'poor', 'very_poor')),
    performance_issues TEXT[],
    system_age_months INTEGER,
    backup_frequency TEXT CHECK (backup_frequency IN ('daily', 'weekly', 'monthly', 'rarely', 'never')),
    antivirus_installed BOOLEAN DEFAULT false,
    antivirus_name TEXT,
    regular_maintenance TEXT CHECK (regular_maintenance IN ('yes_professional', 'yes_self', 'no', 'occasionally')),
    network_environment TEXT CHECK (network_environment IN ('home', 'office', 'public', 'mixed')),
    power_backup BOOLEAN DEFAULT false,
    system_criticality TEXT CHECK (system_criticality IN ('business_critical', 'important', 'moderate', 'low')),
    downtime_tolerance TEXT CHECK (downtime_tolerance IN ('immediate_fix', 'same_day', 'within_week', 'flexible')),
    scheduled_date DATE,
    scheduled_time TIME,
    appointment_status TEXT DEFAULT 'scheduled' CHECK (appointment_status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    appointment_notes TEXT,
    customer_user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS on amc_responses
ALTER TABLE public.amc_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for amc_responses
CREATE POLICY "Staff can view all orders" ON public.amc_responses
FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support') OR
    public.has_role(auth.uid(), 'bookkeeping') OR
    (public.has_role(auth.uid(), 'technician') AND assigned_to IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ))
);

CREATE POLICY "Customers can view own orders" ON public.amc_responses
FOR SELECT TO authenticated USING (customer_user_id = auth.uid());

CREATE POLICY "Admin and support can create orders" ON public.amc_responses
FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

CREATE POLICY "Admin and support can update orders" ON public.amc_responses
FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

CREATE POLICY "Technicians can update assigned orders" ON public.amc_responses
FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'technician') AND assigned_to IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Create AMC systems table
CREATE TABLE public.amc_systems (
    id SERIAL PRIMARY KEY,
    amc_form_id UUID NOT NULL REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    device_name TEXT,
    operating_system TEXT,
    mac_address_enc TEXT,
    mac_iv TEXT,
    mac_tag TEXT,
    mac_address_hint TEXT,
    device_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on amc_systems
ALTER TABLE public.amc_systems ENABLE ROW LEVEL SECURITY;

-- RLS policies for amc_systems
CREATE POLICY "Systems viewable with order access" ON public.amc_systems
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.amc_responses ar 
        WHERE ar.amc_form_id = amc_systems.amc_form_id
        AND (
            public.has_role(auth.uid(), 'admin') OR 
            public.has_role(auth.uid(), 'support') OR
            public.has_role(auth.uid(), 'bookkeeping') OR
            ar.customer_user_id = auth.uid() OR
            (public.has_role(auth.uid(), 'technician') AND ar.assigned_to IN (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            ))
        )
    )
);

-- Create worksheets table for technician work logs
CREATE TABLE public.worksheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_order_id UUID NOT NULL REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id),
    time_spent_minutes INTEGER DEFAULT 0,
    tasks_performed TEXT,
    issues_resolved TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on worksheets
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

-- RLS policies for worksheets
CREATE POLICY "Technicians can manage own worksheets" ON public.worksheets
FOR ALL TO authenticated USING (
    staff_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all worksheets" ON public.worksheets
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view worksheets for their orders" ON public.worksheets
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.amc_responses ar 
        WHERE ar.amc_form_id = worksheets.amc_order_id 
        AND ar.customer_user_id = auth.uid()
    )
);

-- Create work_logs table for detailed technician logs
CREATE TABLE public.work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    log_type TEXT DEFAULT 'progress' CHECK (log_type IN ('progress', 'issue', 'resolution', 'note')),
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on work_logs
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_logs
CREATE POLICY "Work logs accessible with worksheet access" ON public.work_logs
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.worksheets w WHERE w.id = work_logs.worksheet_id
        AND (
            w.staff_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            OR public.has_role(auth.uid(), 'admin')
        )
    )
);

CREATE POLICY "Customers can view work logs for their orders" ON public.work_logs
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.worksheets w 
        JOIN public.amc_responses ar ON ar.amc_form_id = w.amc_order_id
        WHERE w.id = work_logs.worksheet_id 
        AND ar.customer_user_id = auth.uid()
    )
);

-- Create customer interactions table for support logs
CREATE TABLE public.customer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_order_id UUID NOT NULL REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id),
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'chat', 'visit')),
    summary TEXT NOT NULL,
    issues_resolved TEXT,
    internal_notes TEXT,
    customer_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on customer_interactions
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_interactions
CREATE POLICY "Staff can view interactions" ON public.customer_interactions
FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

CREATE POLICY "Support can manage interactions" ON public.customer_interactions
FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_order_id UUID NOT NULL REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    invoice_url TEXT,
    contract_url TEXT,
    validity_start DATE,
    validity_end DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Admin and bookkeeping can manage invoices" ON public.invoices
FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bookkeeping')
);

CREATE POLICY "Support can view invoices" ON public.invoices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Customers can view own invoices" ON public.invoices
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.amc_responses ar 
        WHERE ar.amc_form_id = invoices.amc_order_id 
        AND ar.customer_user_id = auth.uid()
    )
);

-- Create support tickets table for customer portal
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_order_id UUID REFERENCES public.amc_responses(amc_form_id) ON DELETE SET NULL,
    customer_user_id UUID NOT NULL REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Customers can manage own tickets" ON public.support_tickets
FOR ALL TO authenticated USING (customer_user_id = auth.uid());

CREATE POLICY "Staff can view all tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

CREATE POLICY "Staff can update tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
);

-- Create ticket_messages table for ticket conversations
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_messages
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = ticket_messages.ticket_id
        AND (
            st.customer_user_id = auth.uid() AND NOT is_internal
            OR public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'support')
        )
    )
);

CREATE POLICY "Users can create messages on their tickets" ON public.ticket_messages
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = ticket_messages.ticket_id
        AND (
            st.customer_user_id = auth.uid()
            OR public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'support')
        )
    )
);

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    year_part TEXT;
    seq_num INTEGER;
    new_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    new_number := 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amc_responses_updated_at
    BEFORE UPDATE ON public.amc_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worksheets_updated_at
    BEFORE UPDATE ON public.worksheets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();