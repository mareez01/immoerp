-- Create storage bucket for invoices and contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Create storage policies for documents bucket
CREATE POLICY "Admin and bookkeeping can manage documents"
ON storage.objects FOR ALL 
TO authenticated
USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'bookkeeping')
  )
);

CREATE POLICY "Customers can view own documents"
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] IN (
    SELECT amc_form_id::text FROM public.amc_responses 
    WHERE customer_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all documents"
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support') OR
    public.has_role(auth.uid(), 'bookkeeping')
  )
);