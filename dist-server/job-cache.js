class JobCache {
    cache = new Map();
    CACHE_DURATION = 30 * 1000; // 30 seconds for more variety
    generateKey(skills, limit) {
        const skillsKey = skills ? skills.sort().join(',') : 'general';
        return `${skillsKey}_${limit || 20}`;
    }
    get(skills, limit) {
        const key = this.generateKey(skills, limit);
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }
        return cached.jobs;
    }
    set(jobs, skills, limit) {
        const key = this.generateKey(skills, limit);
        this.cache.set(key, {
            jobs: jobs.slice(0, limit || 20), // Limit cached results
            timestamp: Date.now(),
            skills
        });
        // Clean old entries
        this.cleanup();
    }
    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.cache.entries()) {
            if (now - data.timestamp > this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
}
export const jobCache = new JobCache();
