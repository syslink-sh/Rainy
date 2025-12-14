const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/privacypolicy
 * Reads the privacypolicy.json file and returns its contents as JSON
 */
exports.getPrivacyPolicy = async (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'assets', 'privacypolicy.json');
// Note: The privacy policy data has been moved into public/assets for static serving and ease of edit.
        const raw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(raw || '{}');
        res.set('Content-Type', 'application/json');
        return res.status(200).json(data);
    } catch (err) {
        // Don't leak internal error details in production
        const msg = (err && err.code === 'ENOENT') ? 'Privacy policy not found' : 'Failed to load privacy policy';
        if (process.env.DEBUG || process.env.NODE_ENV !== 'production') console.error('[Privacy API] Error', err && err.stack ? err.stack : err);
        return res.status(500).json({ error: msg });
    }
};
