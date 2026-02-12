const cron = require('node-cron');
const feedbackService = require('../services/feedback.service');
const logger = require('./logger/logger');

/**
 * Initialize all scheduled tasks
 */
const initCronJobs = () => {
    // SLA Escalation check: Every hour
    // Checks for complaints not resolved within 48 hours
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Running SLA Escalation cron job...');
            const escalatedCount = await feedbackService.runSLAEscalation();
            if (escalatedCount > 0) {
                logger.info(`SLA Escalation completed: ${escalatedCount} feedbacks escalated.`);
            }
        } catch (error) {
            logger.error('SLA Escalation cron job failed:', error);
        }
    });

    logger.info('⏰ Cron jobs initialized');
};

module.exports = { initCronJobs };
