import { appSupabase, isAppSupabaseConfigured } from './appSupabase';

const GUEST_LIMIT = 3;
const PRO_LIMIT = 15;
const MASTER_LIMIT = 1000;
const DEMO_EMAIL = 'demo@neuronlink.pro';

/**
 * Get the current user's IP address using a public service.
 * Essential for guest tracking in a client-side environment.
 */
export const getClientIp = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (e) {
        console.error('Failed to get IP address:', e);
        return 'unknown';
    }
};

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    currentCount: number;
}

/**
 * Check if the user is within their daily query limit.
 */
export const checkRateLimit = async (userId: string | null, userEmail?: string | null): Promise<RateLimitResult> => {
    if (!isAppSupabaseConfigured()) return { allowed: true, remaining: 999, limit: 999, currentCount: 0 };

    const today = new Date().toISOString().split('T')[0];
    const ipAddress = await getClientIp();

    let limit = GUEST_LIMIT;
    if (userId) {
        const isMaster = userEmail?.toLowerCase() === DEMO_EMAIL.toLowerCase();
        limit = isMaster ? MASTER_LIMIT : PRO_LIMIT;
    }

    let query = appSupabase
        .from('user_usage')
        .select('query_count')
        .eq('reset_date', today);

    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('ip_address', ipAddress);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 is "Row not found" - treat as 0 usage
        console.warn('Usage check error:', error);
        return { allowed: true, remaining: limit, limit, currentCount: 0 };
    }

    const currentCount = data?.query_count || 0;
    const remaining = Math.max(0, limit - currentCount);

    return {
        allowed: remaining > 0,
        remaining,
        limit,
        currentCount
    };
};

/**
 * Increment the usage count for the current user/IP.
 */
export const incrementUsage = async (userId: string | null) => {
    if (!isAppSupabaseConfigured()) return;

    const today = new Date().toISOString().split('T')[0];
    const ipAddress = await getClientIp();

    let query = appSupabase
        .from('user_usage')
        .select('id, query_count')
        .eq('reset_date', today);

    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('ip_address', ipAddress);
    }

    const { data } = await query.single();

    if (data) {
        await appSupabase
            .from('user_usage')
            .update({
                query_count: data.query_count + 1,
                last_query_at: new Date().toISOString()
            })
            .eq('id', data.id);
    } else {
        await appSupabase
            .from('user_usage')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                query_count: 1,
                reset_date: today
            });
    }
};
