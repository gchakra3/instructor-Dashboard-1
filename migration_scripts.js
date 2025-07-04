// migration-script.js - Run this with Node.js to migrate your project structure

const fs = require('fs');
const path = require('path');

// Migration configuration
const MIGRATION_CONFIG = {
  srcPath: './src',
  features: {
    auth: {
      components: ['ProtectedAdminRoute.tsx'],
      contexts: ['AuthContext.tsx'],
      pages: ['Login.tsx', 'AdminLogin.tsx'],
      hooks: [],
      types: []
    },
    admin: {
      components: [
        'ArticleEditor.tsx',
        'ArticleManagement.tsx', 
        'BookingManagement.tsx',
        'BusinessSettings.tsx',
        'FormSubmissions.tsx',
        'InstructorManagement.tsx',
        'NewsletterManagement.tsx',
        'UserRoleManagement.tsx'
      ],
      contexts: ['AdminContext.tsx'],
      pages: ['AdminDashboard.tsx'],
      hooks: [],
      types: []
    },
    learning: {
      components: [
        'ArticleCard.tsx',
        'ArticleFilters.tsx', 
        'RatingModule.tsx',
        'ShareButtons.tsx'
      ],
      contexts: [],
      pages: ['Learning.tsx', 'ArticleView.tsx'],
      hooks: ['useArticle.ts', 'useArticles.ts'],
      types: ['article.ts']
    },
    scheduling: {
      components: ['WeeklySchedule.tsx'],
      contexts: [],
      pages: ['Schedule.tsx', 'BookClass.tsx'],
      hooks: ['useClassSchedule.ts'],
      types: []
    },
    'user-profile': {
      components: [],
      contexts: [],
      pages: ['Profile.tsx'],
      hooks: ['useUserProfiles.ts'],
      types: []
    },
    marketing: {
      components: ['NewsletterSignup.tsx'],
      contexts: [],
      pages: ['Home.tsx', 'About.tsx', 'Services.tsx', 'Contact.tsx', 'Testimonials.tsx'],
      hooks: [],
      types: []
    },
    analytics: {
      components: ['DashboardMetrics.tsx', 'UserEngagementChart.tsx'],
      contexts: [],
      pages: [],
      hooks: [],
      types: []
    }
  },
  shared: {
    components: {
      ui: ['Button.tsx', 'LoadingSpinner.tsx'],
      layout: ['Header.tsx', 'Footer.tsx']
    },
    contexts: ['ThemeContext.tsx'],
    lib: ['supabase.ts'],
    utils: ['fingerprint.ts'],
    types: []
  }
};

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function moveFile(oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    ensureDirectoryExists(path.dirname(newPath));
    fs.renameSync(oldPath, newPath);
    console.log(`Moved: ${oldPath} -> ${newPath}`);
    return true;
  }
  return false;
}

function createIndexFile(featurePath, featureName, config) {
  const indexContent = generateFeatureIndex(featureName, config);
  const indexPath = path.join(featurePath, 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log(`Created index file: ${indexPath}`);
}

function generateFeatureIndex(featureName, config) {
  let content = `// ${featureName} feature exports\n\n`;
  
  // Export components
  if (config.components && config.components.length > 0) {
    content += '// Components\n';
    config.components.forEach(component => {
      const componentName = component.replace('.tsx', '');
      content += `export { default as ${componentName} } from './components/${component}';\n`;
    });
    content += '\n';
  }
  
  // Export hooks
  if (config.hooks && config.hooks.length > 0) {
    content += '// Hooks\n';
    config.hooks.forEach(hook => {
      content += `export * from './hooks/${hook}';\n`;
    });
    content += '\n';
  }
  
  // Export contexts
  if (config.contexts && config.contexts.length > 0) {
    content += '// Contexts\n';
    config.contexts.forEach(context => {
      const contextName = context.replace('.tsx', '');
      content += `export { default as ${contextName}, ${contextName.replace('Context', 'Provider')} } from './contexts/${context}';\n`;
    });
    content += '\n';
  }
  
  // Export pages
  if (config.pages && config.pages.length > 0) {
    content += '// Pages\n';
    config.pages.forEach(page => {
      const pageName = page.replace('.tsx', '');
      content += `export { default as ${pageName} } from './pages/${page}';\n`;
    });
    content += '\n';
  }
  
  // Export types
  if (config.types && config.types.length > 0) {
    content += '// Types\n';
    config.types.forEach(type => {
      content += `export * from './types/${type}';\n`;
    });
    content += '\n';
  }
  
  return content;
}

// Main migration function
function migrateToFeatureStructure() {
  console.log('Starting migration to feature-based structure...\n');
  
  const srcPath = MIGRATION_CONFIG.srcPath;
  
  // Step 1: Create feature directories
  console.log('Step 1: Creating feature directories...');
  Object.keys(MIGRATION_CONFIG.features).forEach(featureName => {
    const featurePath = path.join(srcPath, 'features', featureName);
    ensureDirectoryExists(featurePath);
    ensureDirectoryExists(path.join(featurePath, 'components'));
    ensureDirectoryExists(path.join(featurePath, 'hooks'));
    ensureDirectoryExists(path.join(featurePath, 'contexts'));
    ensureDirectoryExists(path.join(featurePath, 'pages'));
    ensureDirectoryExists(path.join(featurePath, 'types'));
  });
  
  // Step 2: Create shared directories
  console.log('\nStep 2: Creating shared directories...');
  const sharedPath = path.join(srcPath, 'shared');
  ensureDirectoryExists(sharedPath);
  ensureDirectoryExists(path.join(sharedPath, 'components', 'ui'));
  ensureDirectoryExists(path.join(sharedPath, 'components', 'layout'));
  ensureDirectoryExists(path.join(sharedPath, 'contexts'));
  ensureDirectoryExists(path.join(sharedPath, 'lib'));
  ensureDirectoryExists(path.join(sharedPath, 'utils'));
  ensureDirectoryExists(path.join(sharedPath, 'types'));
  
  // Step 3: Move feature files
  console.log('\nStep 3: Moving feature files...');
  Object.entries(MIGRATION_CONFIG.features).forEach(([featureName, config]) => {
    const featurePath = path.join(srcPath, 'features', featureName);
    
    // Move components
    config.components.forEach(component => {
      const oldPath = path.join(srcPath, 'components', getComponentSubfolder(component), component);
      const newPath = path.join(featurePath, 'components', component);
      moveFile(oldPath, newPath);
    });
    
    // Move hooks
    config.hooks.forEach(hook => {
      const oldPath = path.join(srcPath, 'hooks', hook);
      const newPath = path.join(featurePath, 'hooks', hook);
      moveFile(oldPath, newPath);
    });
    
    // Move contexts
    config.contexts.forEach(context => {
      const oldPath = path.join(srcPath, 'contexts', context);
      const newPath = path.join(featurePath, 'contexts', context);
      moveFile(oldPath, newPath);
    });
    
    // Move pages
    config.pages.forEach(page => {
      const oldPath = path.join(srcPath, 'pages', page);
      const newPath = path.join(featurePath, 'pages', page);
      moveFile(oldPath, newPath);
    });
    
    // Move types
    config.types.forEach(type => {
      const oldPath = path.join(srcPath, 'types', type);
      const newPath = path.join(featurePath, 'types', type);
      moveFile(oldPath, newPath);
    });
  });
  
  // Step 4: Move shared files
  console.log('\nStep 4: Moving shared files...');
  const sharedPath = path.join(srcPath, 'shared');
  
  // Move UI components
  MIGRATION_CONFIG.shared.components.ui.forEach(component => {
    const oldPath = path.join(srcPath, 'components', 'UI', component);
    const newPath = path.join(sharedPath, 'components', 'ui', component);
    moveFile(oldPath, newPath);
  });
  
  // Move Layout components
  MIGRATION_CONFIG.shared.components.layout.forEach(component => {
    const oldPath = path.join(srcPath, 'components', 'Layout', component);
    const newPath = path.join(sharedPath, 'components', 'layout', component);
    moveFile(oldPath, newPath);
  });
  
  // Move shared contexts
  MIGRATION_CONFIG.shared.contexts.forEach(context => {
    const oldPath = path.join(srcPath, 'contexts', context);
    const newPath = path.join(sharedPath, 'contexts', context);
    moveFile(oldPath, newPath);
  });
  
  // Move lib files
  MIGRATION_CONFIG.shared.lib.forEach(lib => {
    const oldPath = path.join(srcPath, 'lib', lib);
    const newPath = path.join(sharedPath, 'lib', lib);
    moveFile(oldPath, newPath);
  });
  
  // Move utils
  MIGRATION_CONFIG.shared.utils.forEach(util => {
    const oldPath = path.join(srcPath, 'utils', util);
    const newPath = path.join(sharedPath, 'utils', util);
    moveFile(oldPath, newPath);
  });
  
  // Step 5: Create index files
  console.log('\nStep 5: Creating index files...');
  Object.entries(MIGRATION_CONFIG.features).forEach(([featureName, config]) => {
    const featurePath = path.join(srcPath, 'features', featureName);
    createIndexFile(featurePath, featureName, config);
  });
  
  // Step 6: Create shared index file
  const sharedIndexContent = `// Shared exports
export * from './components/ui/Button';
export * from './components/ui/LoadingSpinner';
export * from './components/layout/Header';
export * from './components/layout/Footer';
export * from './contexts/ThemeContext';
export * from './lib/supabase';
export * from './utils/fingerprint';
`;
  
  fs.writeFileSync(path.join(sharedPath, 'index.ts'), sharedIndexContent);
  
  console.log('\n✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update import statements in your components');
  console.log('2. Run the import-update script');
  console.log('3. Test your application');
  console.log('4. Remove empty directories');
}

// Helper function to determine component subfolder
function getComponentSubfolder(componentName) {
  const componentMap = {
    'ArticleEditor.tsx': 'Admin',
    'ArticleManagement.tsx': 'Admin',
    'BookingManagement.tsx': 'Admin',
    'BusinessSettings.tsx': 'Admin',
    'FormSubmissions.tsx': 'Admin',
    'InstructorManagement.tsx': 'Admin',
    'NewsletterManagement.tsx': 'Admin',
    'ProtectedAdminRoute.tsx': 'Admin',
    'UserRoleManagement.tsx': 'Admin',
    'DashboardMetrics.tsx': 'Analytics',
    'UserEngagementChart.tsx': 'Analytics',
    'NewsletterSignup.tsx': 'Forms',
    'Footer.tsx': 'Layout',
    'Header.tsx': 'Layout',
    'ArticleCard.tsx': 'Learning',
    'ArticleFilters.tsx': 'Learning',
    'RatingModule.tsx': 'Learning',
    'ShareButtons.tsx': 'Learning',
    'WeeklySchedule.tsx': 'Schedule',
    'Button.tsx': 'UI',
    'LoadingSpinner.tsx': 'UI'
  };
  
  return componentMap[componentName] || '';
}

// Run migration
if (require.main === module) {
  migrateToFeatureStructure();
}

module.exports = {
  migrateToFeatureStructure,
  MIGRATION_CONFIG
};