/**
 * Web Components Language Server Configuration
 * 
 * This configuration helps the wctools MCP server understand
 * the SDUI component structure for AI-assisted development.
 * 
 * @see https://github.com/IBM/wctools
 */

export default {
  /** Include web app source files for component analysis */
  include: [
    'apps/web/src/**/*.ts',
    'apps/web/src/**/*.tsx',
    'apps/web/src/**/*.html'
  ],
  
  /** Exclude test files and node_modules */
  exclude: [
    '**/node_modules/**',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/tests/**',
    '**/__tests__/**'
  ],
  
  /** Enable debugging for troubleshooting */
  debug: false,
  
  /** Diagnostic severity levels */
  diagnosticSeverity: {
    /** Show unknown elements as warnings (not errors) for components that may be defined elsewhere */
    unknownElement: 'warning',
    /** Show unknown attributes as info level */
    unknownAttribute: 'info',
    /** Treat duplicate attributes as warnings */
    duplicateAttribute: 'warning'
  },
  
  /** Library-specific configurations */
  libraries: {
    /** Material UI components (commonly used in SDUI) */
    '@mui/material': {
      manifestSrc: undefined, // Will use package's built-in manifest if available
      diagnosticSeverity: {
        unknownElement: 'off',
        unknownAttribute: 'off'
      }
    },
    /** React components */
    'react': {
      diagnosticSeverity: {
        unknownElement: 'off',
        unknownAttribute: 'off'
      }
    }
  }
};
