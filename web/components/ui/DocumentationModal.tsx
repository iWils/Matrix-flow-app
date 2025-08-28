'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DocPage {
  id: string;
  title: string;
  filename: string;
  icon: string;
  description: string;
}

const docPages: DocPage[] = [
  {
    id: 'user-guide',
    title: 'Guide Utilisateur',
    filename: 'guide-utilisateur.html',
    icon: '📖',
    description: 'Guide complet pour utiliser Matrix Flow'
  },
  {
    id: 'admin-guide',
    title: 'Guide Administrateur',
    filename: 'guide-administrateur.html',
    icon: '⚙️',
    description: 'Guide d\'administration et configuration'
  },
  {
    id: 'api-docs',
    title: 'Documentation API',
    filename: 'api-documentation.html',
    icon: '🔌',
    description: 'Documentation complète de l\'API REST'
  },
  {
    id: 'tech-docs',
    title: 'Documentation Technique',
    filename: 'documentation-technique.html',
    icon: '🛠️',
    description: 'Architecture et détails techniques'
  }
];

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadDocumentation = async (filename: string, docId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/docs/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load documentation');
      }
      const html = await response.text();
      
      // Extract only the main content and sidebar from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Get the main content container
      const mainContainer = doc.querySelector('.main');
      if (mainContainer) {
        // Fix relative links to open in new tab
        const links = mainContainer.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = mainContainer.querySelector(link.getAttribute('href') || '');
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          });
        });
        
        setDocContent(mainContainer.outerHTML);
      } else {
        // Fallback: get body content
        const body = doc.querySelector('body');
        setDocContent(body?.innerHTML || html);
      }
      
      setSelectedDoc(docId);
    } catch (error) {
      console.error('Error loading documentation:', error);
      setDocContent('<p class="text-red-500">Erreur lors du chargement de la documentation.</p>');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedDoc(null);
    setDocContent('');
  };

  const handleClose = () => {
    setSelectedDoc(null);
    setDocContent('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      className="max-w-6xl w-full"
    >
      <div className="h-[80vh] flex flex-col">
        {!selectedDoc ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                📚 Documentation Matrix Flow
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {docPages.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => loadDocumentation(doc.filename, doc.id)}
                  className="p-6 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{doc.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
                        {doc.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {doc.description}
                      </p>
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={handleBack}
                className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {docPages.find(doc => doc.id === selectedDoc)?.title}
              </h2>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div 
                  className="h-full overflow-y-auto doc-content"
                  dangerouslySetInnerHTML={{ __html: docContent }}
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.6'
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
      
      <style jsx global>{`
        /* Container principal avec layout flex fixe */
        .doc-content .main {
          display: flex !important;
          gap: 1.5rem;
          padding: 0;
          height: 100%;
          min-height: 60vh;
          align-items: flex-start;
        }
        
        /* Table des matières - position fixe à gauche */
        .doc-content .sidebar {
          flex: 0 0 280px;
          width: 280px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1.5rem;
          height: 60vh;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
        
        .dark .doc-content .sidebar {
          background-color: #1e293b;
          border-color: #475569;
        }
        
        /* Contenu principal - occupe l'espace restant */
        .doc-content .content {
          flex: 1;
          min-width: 0;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 2rem;
          height: 60vh;
          overflow-y: auto;
          position: relative;
          z-index: 0;
        }
        
        .dark .doc-content .content {
          background-color: #0f172a;
          border-color: #475569;
          color: #e2e8f0;
        }
        
        /* Styles de la table des matières */
        .doc-content .sidebar h3 {
          color: #3b82f6;
          margin-bottom: 1rem;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        
        .doc-content .sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .doc-content .sidebar li {
          margin-bottom: 0.5rem;
        }
        
        .doc-content .sidebar a {
          color: #64748b;
          text-decoration: none;
          font-size: 0.9rem;
          display: block;
          padding: 0.5rem 0;
          transition: all 0.2s;
          border-radius: 0.375rem;
        }
        
        .doc-content .sidebar a:hover {
          color: #3b82f6;
          background-color: #f1f5f9;
          padding-left: 0.5rem;
        }
        
        .dark .doc-content .sidebar a {
          color: #94a3b8;
        }
        
        .dark .doc-content .sidebar a:hover {
          color: #60a5fa;
          background-color: #334155;
        }
        
        /* Styles du contenu */
        .doc-content .content h1,
        .doc-content .content h2,
        .doc-content .content h3 {
          color: #1e293b;
          margin-top: 0;
        }
        
        .dark .doc-content .content h1,
        .dark .doc-content .content h2,
        .dark .doc-content .content h3 {
          color: #e2e8f0;
        }
        
        .doc-content .content p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }
        
        .doc-content .content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .doc-content .content th,
        .doc-content .content td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .dark .doc-content .content th,
        .dark .doc-content .content td {
          border-bottom-color: #475569;
        }
        
        /* Responsive design pour mobile */
        @media (max-width: 1024px) {
          .doc-content .sidebar {
            flex: 0 0 240px;
            width: 240px;
          }
        }
        
        @media (max-width: 768px) {
          .doc-content .main {
            flex-direction: column !important;
            gap: 1rem;
          }
          
          .doc-content .sidebar {
            flex: 0 0 auto;
            width: 100%;
            height: auto;
            max-height: 25vh;
            order: 1;
          }
          
          .doc-content .content {
            flex: 1;
            height: 50vh;
            order: 2;
          }
        }
        
        /* Force l'affichage correct même si le HTML original a d'autres styles */
        .doc-content .main > * {
          position: relative !important;
        }
        
        .doc-content .sidebar {
          float: none !important;
          position: relative !important;
        }
        
        .doc-content .content {
          float: none !important;
          position: relative !important;
        }
      `}</style>
    </Modal>
  );
};