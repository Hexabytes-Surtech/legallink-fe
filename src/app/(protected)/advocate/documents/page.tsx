'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';

interface DocumentInfo {
  id: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export default function AdvocateDocumentsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError('');
      try {
        if (USE_MOCK) {
          await mockDelay(500);
          const cachedDocs = localStorage.getItem('mock_advocate_documents');
          if (cachedDocs) {
            setDocuments(JSON.parse(cachedDocs));
          } else {
            // Default mock certificates
            const defaults: DocumentInfo[] = [
              {
                id: 'mock-cop-99',
                file_path: '#',
                file_type: 'application/pdf',
                uploaded_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
              }
            ];
            setDocuments(defaults);
            localStorage.setItem('mock_advocate_documents', JSON.stringify(defaults));
          }
        } else {
          const res = await apiClient<DocumentInfo[]>('/advocate/documents');
          if (res.success && res.data) {
            setDocuments(res.data);
          } else {
            throw new Error(res.error || 'Failed to fetch certificates.');
          }
        }
      } catch {
        setError(language === 'en' ? 'Could not load your uploaded certificates.' : 'আপনার আপলোড করা প্রশংসাপত্রগুলি লোড করা যায়নি।');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDocuments();
    }
  }, [user, language]);

  // Upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError('');
    setSuccess('');
    setUploading(true);

    const file = files[0];
    try {
      if (USE_MOCK) {
        await mockDelay(800);
        const newDoc: DocumentInfo = {
          id: 'mock-doc-' + Date.now(),
          file_path: URL.createObjectURL(file),
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        };
        const updated = [...documents, newDoc];
        setDocuments(updated);
        localStorage.setItem('mock_advocate_documents', JSON.stringify(updated));
        
        // Notify other components (like onboarding wizard)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('advocate-profile-updated'));
        }
      } else {
        const formData = new FormData();
        formData.append('document', file);

        const res = await apiClient<DocumentInfo>('/advocate/documents', {
          method: 'POST',
          formData,
        });

        if (res.success && res.data) {
          setDocuments(prev => [...prev, res.data!]);
          // Notify other components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('advocate-profile-updated'));
          }
        } else {
          throw new Error(res.error || 'Failed to upload certificate.');
        }
      }
      setSuccess(language === 'en' ? 'Certificate uploaded successfully!' : 'শংসাপত্র সফলভাবে আপলোড করা হয়েছে!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  // Delete handler
  async function handleDelete(id: string) {
    setError('');
    setSuccess('');
    try {
      if (USE_MOCK) {
        await mockDelay(300);
        const updated = documents.filter(d => d.id !== id);
        setDocuments(updated);
        localStorage.setItem('mock_advocate_documents', JSON.stringify(updated));
        
        // Notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('advocate-profile-updated'));
        }
      } else {
        // Attempt API deletion
        await apiClient(`/advocate/documents/${id}`, {
          method: 'DELETE',
        });
        
        const updated = documents.filter(d => d.id !== id);
        setDocuments(updated);
        
        // Notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('advocate-profile-updated'));
        }
      }
      setSuccess(language === 'en' ? 'Certificate deleted successfully.' : 'শংসাপত্র সফলভাবে মুছে ফেলা হয়েছে।');
    } catch {
      setError(language === 'en' ? 'Failed to delete certificate.' : 'শংসাপত্র মুছে ফেলতে ব্যর্থ হয়েছে।');
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '3.5rem', width: '30%', marginBottom: '2.5rem' }} />
        <div className="skeleton" style={{ height: '220px', borderRadius: '1.25rem', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '80px', borderRadius: '0.75rem' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{`
        .vault-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 1.25rem;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          margin-bottom: 2rem;
        }
        .upload-dropzone {
          border: 2px dashed rgba(201,168,76,0.35);
          background: rgba(201,168,76,0.02);
          border-radius: 1rem;
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
          transition: all 0.2s;
          cursor: pointer;
        }
        .upload-dropzone:hover {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.04);
        }
        .doc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: #FAF9F6;
          border: 1px solid #E5E7EB;
          border-radius: 0.85rem;
          margin-bottom: 0.75rem;
          transition: all 0.2s;
        }
        .doc-row:hover {
          border-color: #C9A84C;
        }
      `}</style>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-headline" style={{ color: 'var(--color-navy)', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en' ? 'Verification Vault' : 'যাচাইকরণ ভল্ট'}
        </h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '1.05rem', marginTop: '0.25rem', fontFamily: language === 'bn' ? 'var(--font-bangla)' : 'inherit' }}>
          {language === 'en'
            ? 'Upload and manage your BCI enrollment, CoP certificates, and professional IDs.'
            : 'আপনার বার কাউন্সিল নথিভুক্তি শংসাপত্র, CoP শংসাপত্র এবং পেশাগত আইডিগুলি আপলোড এবং পরিচালনা করুন।'}
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* Upload zone */}
      <div className="vault-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.25rem' }}>
          {language === 'en' ? 'Upload Verification Credentials' : 'যাচাইকরণ শংসাপত্র আপলোড করুন'}
        </h3>

        <div className="upload-dropzone">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📁</div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
            {language === 'en' ? 'Upload certificate' : 'শংসাপত্র আপলোড করুন'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-400)', marginBottom: '1rem' }}>
            {language === 'en' ? 'Accepts PDF, PNG, or JPG (Max 5MB)' : 'পিডিএফ, পিএনজি, অথবা জেপিজি ফাইল গ্রহণযোগ্য (সর্বোচ্চ ৫ মেগাবাইট)'}
          </p>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />

          {uploading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '1rem',
              fontWeight: 700,
              color: 'var(--color-navy)',
            }}>
              ⏳ {language === 'en' ? 'Uploading file...' : 'ফাইল আপলোড হচ্ছে...'}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="vault-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Verification Documents Vault' : 'যাচাইকরণ নথিপত্র ভল্ট'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {documents.map((doc) => {
            const extension = doc.file_type.split('/')[1] || 'pdf';
            const displayName = doc.id.startsWith('mock') 
              ? `Bar_Council_Enrolment_Certificate.${extension}`
              : `Uploaded_Certificate_${doc.id.substring(0, 8)}.${extension}`;
            return (
              <div key={doc.id} className="doc-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                      {language === 'en' ? 'Uploaded On:' : 'আপলোডের তারিখ:'} {new Date(doc.uploaded_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#C9A84C', fontWeight: 700 }}
                  >
                    👁️ {language === 'en' ? 'View' : 'দেখুন'}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#EF4444' }}
                  >
                    🗑️ {language === 'en' ? 'Delete' : 'মুছুন'}
                  </button>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--color-gray-400)',
              border: '1px dashed #E5E7EB',
              borderRadius: '0.75rem',
              fontStyle: 'italic',
            }}>
              {language === 'en' ? 'No verification certificates uploaded yet.' : 'এখনও কোনো যাচাইকরণ শংসাপত্র আপলোড করা হয়নি।'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
