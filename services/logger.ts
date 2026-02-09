import { appSupabase, isAppSupabaseConfigured } from './appSupabase';

// Session ID is generated once per page load to group events
const sessionId = crypto.randomUUID();

export type EventCategory = 'AUTH' | 'ANALYSIS' | 'DATA' | 'SYSTEM' | 'MODELING' | 'CONFIG';
export type EventType =
    | 'APP_LOAD'
    | 'LOGIN'
    | 'LOGOUT'
    | 'DB_CONNECT'
    | 'QUERY_EXECUTE'
    | 'EXPORT'
    | 'PIVOT_UPDATE'
    | 'FILTER_ADD'
    | 'MODEL_UPDATE'
    | 'CONFIG_SAVE'
    | 'SCHEMA_DRIFT';

/**
 * Log a user event to the neuronlink_analytics.user_events table.
 * This is "fire-and-forget" - we don't await the result to avoid blocking UI.
 */
export const logEvent = async (category: EventCategory, type: EventType, metadata: Record<string, any> = {}) => {
    if (!isAppSupabaseConfigured()) return;

    try {
        const { data } = await appSupabase.auth.getUser();
        const user = data?.user;

        if (!user) {
            // Can't log if no user (RLS requires auth.uid())
            return;
        }

        // Use default schema (public) to avoid 406 errors
        const { error } = await appSupabase
            .from('user_events')
            .insert({
                user_id: user.id,
                session_id: sessionId,
                event_category: category,
                event_type: type,
                metadata
            });

        if (error) {
            console.warn('Failed to log event:', error.message);
        }
    } catch (e) {
        // Silent fail for logging
    }
};

/**
 * Initialize logging session (e.g. on app load)
 */
export const initLogging = () => {
    logEvent('SYSTEM', 'APP_LOAD', {
        userAgent: navigator.userAgent,
        screen: {
            width: window.screen.width,
            height: window.screen.height
        },
        timestamp: new Date().toISOString()
    });
};
