// update-imports.js - Run this after the migration to update all import statements

const fs = require('fs');
const path = require('path');

// Import mapping configuration
const IMPORT_MAPPINGS = {
  // Components mappings
  'components/Admin/': 'features/admin/components/',
  'components/Analytics/': 'features/analytics/components/',
  'components/Forms/': 'features/marketing/components/',
  'components/Layout/': 'shared/components/layout/',
  'components/Learning/': 'features/learning/components/',
  'components/Schedule/': 'features/scheduling/components/',
  'components/UI/': 'shared/components/ui/',
  
  // Contexts mappings
  'contexts/AdminContext': 'features/admin/contexts/AdminContext',
  'contexts/AuthContext': 'features/auth/contexts/AuthContext',
  'contexts/ThemeContext': 'shared/contexts/ThemeContext',
  
  // Hooks mappings
  'hooks/useArticle': 'features/learning/hooks/useArticle',
  'hooks/useArticles': 'features/learning/hooks/useArticles',
  'hooks/useClassSchedule': 'features/scheduling/hooks/useClassSchedule',
  'hooks/useUserProfiles': 'features/user-profile/hooks/useUserProfiles',
  
  // Pages mappings
  'pages/About': 'features/marketing/pages/About',
  'pages/AdminDashboard': 'features/admin/pages/AdminDashboard',
  'pages/AdminLogin': 'features/auth/pages/AdminLogin',
  'pages/ArticleView': 'features/learning/pages/ArticleView',
  'pages/BookClass': 'features/scheduling/pages/BookClass',
  'pages/Contact': 'features/marketing/pages/Contact',
  'pages/Home': 'features/marketing/pages/Home',
  'pages/Learning': 'features/learning/pages/Learning',
  'pages/Login': 'features/auth/pages/Login',
  'pages/Profile': 'features/user-profile/pages/Profile',
  'pages/Schedule': 'features/scheduling/pages/Schedule',
  'pages/Services': 'features/marketing/pages/Services',
  'pages/Testimonials': 'features/marketing/pages/Testimonials',
  'pages/NotFound': 'pages/NotFound', // Keep some pages in root if they're truly global
  
  // Types mappings
  'types/article': 'features/learning/types/article',
  
  // Lib mappings
  'lib/supabase': 'shared/lib/supabase',
  
  // Utils mappings
  'utils/fingerprint': 'shared/utils/fingerprint'
};

// Feature-based import mappings for cleaner imports
const FEATURE_IMPORTS = {
  // Instead of importing individual components, import from feature index
  'features/admin/components/ArticleEditor': 'features/admin',
  'features/admin/components/ArticleManagement': 'features/admin',
  'features/admin/components/BookingManagement': 'features/admin',
  'features/admin/components/BusinessSettings': 'features/admin',
  'features/admin/components/FormSubmissions': 'features/admin',
  'features/admin/components/InstructorManagement': 'features/admin',
  'features/admin/components/NewsletterManagement': 'features/admin',
  'features/admin/components/UserRoleManagement': 'features/admin',
  
  'features/learning/components/ArticleCard': 'features/learning',
  'features/learning/components/ArticleFilters': 'features/learning',
  'features/learning/components/RatingModule': 'features/learning',
  'features/learning/components/ShareButtons': 'features/learning',
  
  'features/scheduling/components/WeeklySchedule': 'features/scheduling',
  
  'features/analytics/components/DashboardMetrics': 'features/analytics',
  'features/analytics/components/UserEngagementChart': 'features/analytics',
  
  'features/marketing/components/NewsletterSignup': 'features/marketing'
};

function getAllFiles(dirPath, fileExtensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let files = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, fileExtensions));
    } else if (fileExtensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let hasChanges = false;
  
  // Update imports using the mapping
  Object.entries(IMPORT_MAPPINGS).forEach(([oldPath, newPath]) => {
    const oldImportPattern = new RegExp(`from\\s+['"](.*?)${oldPath.replace(/\//g, '\\/')}([^'"]*?)['"]`, 'g');
    const newContent = content.replace(oldImportPattern, (match, prefix, suffix) => {
      hasChanges = true;
      // Calculate relative path
      const currentDir = path.dirname(filePath);
      const targetPath = path.join('./src', newPath + suffix);
      const relativePath = path.relative(currentDir, targetPath)
        .replace(/\\/g, '/') // Convert Windows paths to Unix-style
        .replace(/^(?!\.)/, './'); // Ensure relative path starts with ./
      
      return `from '${relativePath}'`;
    });
    content = newContent;
  });
  
  // Update relative imports that might be broken
  const relativeImportPattern = /from\s+['"](\.\.[\/\\].*?)['"]|from\s+['"](\.\/.*?)['"]|from\s+['"]([^\.\/].*?)['"](?!\s*;)/g;
  
  content = content.replace(relativeImportPattern, (match, relativePath1, relativePath2, absolutePath) => {
    if (relativePath1 || relativePath2) {
      // Handle relative imports
      const importPath = relativePath1 || relativePath2;
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const srcPath = path.resolve('./src');
      
      if (resolvedPath.startsWith(srcPath)) {
        const relativeToSrc = path.relative(srcPath, resolvedPath);
        const mappedPath = findMappedPath(relativeToSrc);
        
        if (mappedPath) {
          hasChanges = true;
          const currentDir = path.dirname(filePath);
          const targetPath = path.join('./src', mappedPath);
          const newRelativePath = path.relative(currentDir, targetPath)
            .replace(/\\/g, '/')
            .replace(/^(?!\.)/, './');
          return `from '${newRelativePath}'`;
        }
      }
    }
    
    return match;
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated imports in: ${filePath}`);
  }
}

function findMappedPath(originalPath) {
  for (const [oldPath, newPath] of Object.entries(IMPORT_MAPPINGS)) {
    if (originalPath.includes(oldPath)) {
      return originalPath.replace(oldPath, newPath);
    }
  }
  return null;
}

function generateUpdatedAppTsx() {
  const appTsxContent = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import { AuthProvider } from './features/auth/contexts/AuthContext';
import { AdminProvider } from './features/admin/contexts/AdminContext';

// Shared components
import { Header, Footer } from './shared';

// Feature pages
import { Home, About, Services, Contact, Testimonials } from './features/marketing';
import { Learning, ArticleView } from './features/learning';
import { Schedule, BookClass } from './features/scheduling';
import { Profile } from './features/user-profile';
import { Login, AdminLogin } from './features/auth';
import { AdminDashboard } from './features/admin';

// Global pages
import NotFound from './pages/NotFound';

import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <Router>
            <div className="App">
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/book-class" element={<BookClass />} />
                  <Route path="/learning" element={<Learning />} />
                  <Route path="/article/:id" element={<ArticleView />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/testimonials" element={<Testimonials />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
`;

  fs.writeFileSync('./src/App.tsx', appTsxContent);
  console.log('✅ Updated App.tsx with new feature-based imports');
}

function createBarrelExports() {
  // Create main features index
  const featuresIndexContent = `// Features barrel exports
export * from './auth';
export * from './admin';
export * from './learning';
export * from './scheduling';
export * from './user-profile';
export * from './marketing';
export * from './analytics';
`;
  
  fs.writeFileSync('./src/features/index.ts', featuresIndexContent);
  console.log('✅ Created features/index.ts');
  
  // Create main src index for easier imports
  const srcIndexContent = `// Main application exports
export * from './features';
export * from './shared';
`;
  
  fs.writeFileSync('./src/index.ts', srcIndexContent);
  console.log('✅ Created src/index.ts');
}

function updateImports() {
  console.log('🔄 Starting import updates...\n');
  
  // Get all TypeScript/JavaScript files
  const files = getAllFiles('./src', ['.tsx', '.ts', '.jsx', '.js']);
  
  console.log(`Found ${files.length} files to update...\n`);