
import { appSupabase } from './appSupabase';
import { Configuration } from '../types';

export const configService = {
    /**
     * Save a new configuration or update an existing one
     */
    saveConfig: async (config: Omit<Configuration, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Configuration> => {
        const { data: { user } } = await appSupabase.auth.getUser();

        if (!user) {
            throw new Error('User must be logged in to save configurations');
        }

        const payload = {
            ...config,
            user_id: user.id,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await appSupabase
            .from('configurations')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data as Configuration;
    },

    /**
     * Get all configurations visible to the user
     */
    getConfigs: async (type: 'db_config' | 'analysis_config'): Promise<Configuration[]> => {
        const { data: { user } } = await appSupabase.auth.getUser();

        let query = appSupabase
            .from('configurations')
            .select('*')
            .eq('type', type)
            .order('updated_at', { ascending: false });

        // If logged in, get my configs OR public configs
        // simplified: RLS handles the "my configs" part.
        // We just need to make sure we fetch public ones too if we want them in the same list.
        // For now, let's just fetch everything the RLS allows (mine + public)

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        return data as Configuration[];
    },

    /**
     * Get specific config by ID
     */
    getConfigById: async (id: string): Promise<Configuration> => {
        const { data, error } = await appSupabase
            .from('configurations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data as Configuration;
    },

    /**
     * Delete a configuration
     */
    deleteConfig: async (id: string): Promise<void> => {
        const { error } = await appSupabase
            .from('configurations')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(error.message);
        }
    }
};
