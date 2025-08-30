const { createStream } = require('rotating-file-stream');
const { Transform } = require('stream');
const path = require('path');

module.exports = function (options) {
    const { filename, directory, maxSize, maxFiles } = options;

    // Create rotating file stream
    const rotatingStream = createStream(filename, {
        path: directory,
        size: maxSize || '50M',
        interval: '1d',
        maxFiles: maxFiles || 10,
        compress: 'gzip',
        encoding: 'utf8'
    });

    // Transform stream to handle pino messages
    const transform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            try {
                const line = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
                this.push(line + '\n');
            } catch (error) {
                // Fallback for unparseable data
                this.push(chunk.toString() + '\n');
            }
            callback();
        }
    });

    transform.pipe(rotatingStream);

    // Handle errors
    rotatingStream.on('error', (err) => {
        console.error('Rotating file stream error:', err);
    });

    transform.on('error', (err) => {
        console.error('Transform stream error:', err);
    });

    return transform;
};