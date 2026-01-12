import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-helpers';
import { useToast } from './use-toast';

/**
 * Hook for safely viewing certificates using blob URLs to bypass Chrome blocking issues
 * @returns Object with loadCertificate function, cleanup function, and certificate data
 */
export const useCertificateViewer = () => {
  const { toast } = useToast();
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [certificateType, setCertificateType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Load a certificate from Supabase storage and create a blob URL
   * @param path - Storage path to the certificate file
   */
  const loadCertificate = useCallback(async (path: string) => {
    if (!path) {
      toast({
        title: 'Error',
        description: 'No certificate path provided',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      let url = path;

      // Get signed URL if path doesn't start with http
      if (!path.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('certificates')
          .createSignedUrl(path, 60 * 60); // 1 hour expiry

        if (error) throw error;
        url = data?.signedUrl || '';
      }

      if (!url) {
        throw new Error('Failed to generate certificate URL');
      }

      // Fetch the certificate as a blob to bypass Chrome iframe blocking
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch certificate: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Determine file type
      const fileType = path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';

      setCertificateUrl(blobUrl);
      setCertificateType(fileType);
    } catch (error: any) {
      console.error('Certificate loading error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load certificate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Cleanup blob URL to prevent memory leaks
   */
  const cleanup = useCallback(() => {
    if (certificateUrl && certificateUrl.startsWith('blob:')) {
      URL.revokeObjectURL(certificateUrl);
    }
    setCertificateUrl(null);
    setCertificateType(null);
  }, [certificateUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (certificateUrl && certificateUrl.startsWith('blob:')) {
        URL.revokeObjectURL(certificateUrl);
      }
    };
  }, [certificateUrl]);

  return {
    loadCertificate,
    cleanup,
    certificateUrl,
    certificateType,
    loading,
  };
};
