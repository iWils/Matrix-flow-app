import { logger } from './logger'
import { backupScheduler } from './backup-scheduler'

export async function initializeServices() {
  try {
    logger.info('Initializing application services...')
    
    // Initialize backup scheduler
    await backupScheduler.start()
    logger.info('Backup scheduler initialized')
    
    logger.info('All application services initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize application services', error instanceof Error ? error : undefined)
    throw error
  }
}

// Auto-initialize services when this module is imported
if (typeof window === 'undefined') { // Server-side only
  initializeServices().catch((error) => {
    logger.error('Critical error during service initialization', error instanceof Error ? error : undefined)
    process.exit(1)
  })
}