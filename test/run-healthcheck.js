const http = require('http');
const assert = require('assert');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3005;

const to = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    // Wait a short time to allow server to boot
    await to(300);

    const options = {
        hostname: HOST,
        port: PORT,
        path: '/api/health',
        method: 'GET',
        timeout: 3000,
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            try {
                assert.strictEqual(res.statusCode, 200, `Unexpected status: ${res.statusCode}`);
                const json = JSON.parse(data);
                assert.ok(json.status === 'OK', 'Health status not OK');
                console.log('Healthcheck passed');

                // Search test
                await new Promise((resolve, reject) => {
                    const searchOpts = { hostname: HOST, port: PORT, path: '/api/search?q=riyadh', method: 'GET' };
                    const sreq = http.request(searchOpts, sres => {
                        let b = '';
                        sres.on('data', c => b += c);
                        sres.on('end', () => {
                            try {
                                assert.strictEqual(sres.statusCode, 200, `Search status ${sres.statusCode}`);
                                const arr = JSON.parse(b);
                                console.log('Search test passed (results length:', arr.length, ')');
                                resolve();
                            } catch (err) { reject(err); }
                        });
                    });
                    sreq.on('error', reject);
                    sreq.end();
                });

                // Weather test
                await new Promise((resolve, reject) => {
                    const weatherOpts = { hostname: HOST, port: PORT, path: '/api/weather?lat=24.7136&lon=46.6753', method: 'GET' };
                    const wreq = http.request(weatherOpts, wres => {
                        let b = '';
                        wres.on('data', c => b += c);
                        wres.on('end', () => {
                            try {
                                assert.strictEqual(wres.statusCode, 200, `Weather status ${wres.statusCode}`);
                                const wdata = JSON.parse(b);
                                assert.ok(wdata && wdata.main && typeof wdata.main.temp !== 'undefined');
                                console.log('Weather endpoint passed');
                                resolve();
                            } catch (err) { reject(err); }
                        });
                    });
                    wreq.on('error', reject);
                    wreq.end();
                });

                console.log('All checks passed');
                process.exit(0);

            } catch (e) {
                console.error('Healthcheck failed:', e.message);
                process.exit(2);
            }
        });
    });

    req.on('error', (err) => {
        console.error('Healthcheck request error:', err.message);
        process.exit(3);
    });

    req.end();
})();
