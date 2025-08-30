'use strict'

const net = require('net');
const crypto = require('crypto');

/**
 * Votifier Service
 * Handles sending votes to Minecraft servers via Votifier protocol
 */
class VotifierService {
    constructor(logger) {
        this.logger = logger;
        this.timeout = 5000; // 5 seconds timeout
    }

    /**
     * Send vote to Votifier server
     */
    async sendVote(voteData) {
        const { host, port, token, username, address, timestamp } = voteData;

        this.logger.info({
            host,
            port,
            username,
            address,
            timestamp,
            tokenLength: token ? token.length : 0
        }, '🔄 Starting Votifier vote send process');

        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let responseData = '';
            let handshakeComplete = false;
            const startTime = Date.now();

            const timeoutHandle = setTimeout(() => {
                const duration = Date.now() - startTime;
                this.logger.error({
                    host,
                    port,
                    duration,
                    responseData: responseData.substring(0, 200),
                    handshakeComplete
                }, '⏰ Votifier connection timeout');
                socket.destroy();
                reject(new Error(`Votifier connection timeout after ${duration}ms`));
            }, this.timeout);

            this.logger.debug({ host, port }, '🔌 Attempting to connect to Votifier server');

            socket.connect(port, host, () => {
                const duration = Date.now() - startTime;
                this.logger.info({ 
                    host, 
                    port, 
                    username, 
                    duration 
                }, '✅ Connected to Votifier server');
            });

            socket.on('data', (data) => {
                const newData = data.toString();
                responseData += newData;
                
                this.logger.debug({
                    host,
                    port,
                    dataLength: newData.length,
                    totalLength: responseData.length,
                    newData: newData.substring(0, 100),
                    handshakeComplete
                }, '📥 Received data from Votifier');

                // Check if we received the handshake (VOTIFIER version info)
                if (!handshakeComplete && responseData.includes('VOTIFIER')) {
                    handshakeComplete = true;
                    
                    try {
                        const lines = responseData.split('\n');
                        const versionLine = lines[0].trim();
                        
                        this.logger.info({ 
                            host,
                            port,
                            versionLine,
                            totalLines: lines.length,
                            responseLength: responseData.length
                        }, '🤝 Received Votifier handshake');

                        if (versionLine.includes('VOTIFIER 2') || versionLine.includes('NUVOTIFIER')) {
                            this.logger.info({ host, port }, '📡 Using NuVotifier v2 protocol');
                            // NuVotifier v2 - use JSON format with token
                            this.sendNuVotifierV2Vote(socket, token, username, address, timestamp)
                                .then(() => {
                                    const duration = Date.now() - startTime;
                                    this.logger.info({ 
                                        host, 
                                        port, 
                                        username, 
                                        duration 
                                    }, '✅ NuVotifier v2 vote sent successfully');
                                    clearTimeout(timeoutHandle);
                                    resolve({
                                        success: true,
                                        response: 'Vote sent successfully (NuVotifier v2)',
                                        duration
                                    });
                                })
                                .catch((error) => {
                                    const duration = Date.now() - startTime;
                                    this.logger.error({ 
                                        host, 
                                        port, 
                                        username, 
                                        error: error.message,
                                        duration
                                    }, '❌ NuVotifier v2 vote send failed');
                                    clearTimeout(timeoutHandle);
                                    socket.destroy();
                                    reject(error);
                                });
                        } else if (versionLine.includes('VOTIFIER 1')) {
                            this.logger.info({ host, port }, '📡 Using VotifierPlus v1 protocol (RSA encryption required)');
                            // VotifierPlus expects RSA encryption, use the token as the public key or try to get it
                            // For now, we'll try to use a stored public key or the token
                            this.sendVotifierPlusRSAVote(socket, token, username, address, timestamp)
                                .then(() => {
                                    const duration = Date.now() - startTime;
                                    this.logger.info({ 
                                        host, 
                                        port, 
                                        username, 
                                        duration 
                                    }, '✅ VotifierPlus RSA vote sent successfully');
                                    clearTimeout(timeoutHandle);
                                    resolve({
                                        success: true,
                                        response: 'Vote sent successfully (VotifierPlus RSA)',
                                        duration
                                    });
                                })
                                .catch((error) => {
                                    const duration = Date.now() - startTime;
                                    this.logger.error({ 
                                        host, 
                                        port, 
                                        username, 
                                        error: error.message,
                                        duration
                                    }, '❌ VotifierPlus RSA vote send failed');
                                    clearTimeout(timeoutHandle);
                                    socket.destroy();
                                    reject(error);
                                });
                        } else {
                            this.logger.info({ host, port }, '📡 Using legacy Votifier v1 protocol');
                            // Legacy Votifier v1 - use RSA encryption
                            const publicKeyPem = lines.slice(1).join('\n');
                            this.sendVotifierV1Vote(socket, publicKeyPem, username, address, timestamp)
                                .then(() => {
                                    const duration = Date.now() - startTime;
                                    this.logger.info({ 
                                        host, 
                                        port, 
                                        username, 
                                        duration 
                                    }, '✅ Votifier v1 vote sent successfully');
                                    clearTimeout(timeoutHandle);
                                    resolve({
                                        success: true,
                                        response: 'Vote sent successfully (Votifier v1)',
                                        duration
                                    });
                                })
                                .catch((error) => {
                                    const duration = Date.now() - startTime;
                                    this.logger.error({ 
                                        host, 
                                        port, 
                                        username, 
                                        error: error.message,
                                        duration
                                    }, '❌ Votifier v1 vote send failed');
                                    clearTimeout(timeoutHandle);
                                    socket.destroy();
                                    reject(error);
                                });
                        }
                    } catch (error) {
                        const duration = Date.now() - startTime;
                        this.logger.error({
                            host,
                            port,
                            error: error.message,
                            responseData: responseData.substring(0, 200),
                            duration
                        }, '❌ Failed to parse Votifier handshake');
                        clearTimeout(timeoutHandle);
                        socket.destroy();
                        reject(new Error(`Failed to parse Votifier response: ${error.message}`));
                    }
                } else if (handshakeComplete && (responseData.includes('ok') || responseData.includes('OK'))) {
                    // Vote was accepted
                    const duration = Date.now() - startTime;
                    this.logger.info({ 
                        host, 
                        port, 
                        username, 
                        duration,
                        response: responseData.trim()
                    }, '✅ Vote accepted by Votifier server');
                    clearTimeout(timeoutHandle);
                    socket.destroy();
                    resolve({
                        success: true,
                        response: 'Vote accepted by server',
                        duration
                    });
                }
            });

            socket.on('error', (error) => {
                const duration = Date.now() - startTime;
                this.logger.error({ 
                    host, 
                    port, 
                    error: error.message,
                    errorCode: error.code,
                    duration,
                    handshakeComplete,
                    responseData: responseData.substring(0, 100)
                }, '❌ Votifier connection error');
                clearTimeout(timeoutHandle);
                reject(new Error(`Votifier connection failed: ${error.message} (${error.code})`));
            });

            socket.on('close', (hadError) => {
                const duration = Date.now() - startTime;
                this.logger.warn({
                    host,
                    port,
                    hadError,
                    duration,
                    handshakeComplete,
                    responseLength: responseData.length,
                    responsePreview: responseData.substring(0, 100)
                }, '🔌 Votifier connection closed');
                
                clearTimeout(timeoutHandle);
                if (!handshakeComplete) {
                    reject(new Error(`Votifier connection closed without handshake (duration: ${duration}ms)`));
                }
            });

            socket.on('timeout', () => {
                const duration = Date.now() - startTime;
                this.logger.error({
                    host,
                    port,
                    duration,
                    handshakeComplete
                }, '⏰ Votifier socket timeout');
                socket.destroy();
            });
        });
    }

    /**
     * Send vote using Votifier v1 protocol (RSA encrypted)
     */
    async sendVotifierV1Vote(socket, publicKeyPem, username, address, timestamp) {
        try {
            // Create vote payload for Votifier v1 (5 lines required)
            const serviceName = 'MCServerList';
            const votePayload = `VOTE\n${serviceName}\n${username}\n${address}\n${timestamp}\n`;

            this.logger.info({
                username,
                address,
                timestamp,
                payloadLength: votePayload.length,
                payload: votePayload.replace(/\n/g, '\\n'),
                publicKeyLength: publicKeyPem.length
            }, '📤 Preparing Votifier v1 vote');

            // Clean up the public key PEM format
            let cleanPublicKey = publicKeyPem.trim();
            if (!cleanPublicKey.includes('-----BEGIN')) {
                // Add PEM headers if missing
                cleanPublicKey = `-----BEGIN PUBLIC KEY-----\n${cleanPublicKey}\n-----END PUBLIC KEY-----`;
            }

            this.logger.debug({
                originalKeyLength: publicKeyPem.length,
                cleanKeyLength: cleanPublicKey.length,
                keyPreview: cleanPublicKey.substring(0, 100)
            }, '🔑 Processed public key');

            // Encrypt with RSA public key
            const encrypted = crypto.publicEncrypt({
                key: cleanPublicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            }, Buffer.from(votePayload, 'utf8'));

            this.logger.info({
                username,
                address,
                originalLength: votePayload.length,
                encryptedLength: encrypted.length
            }, '🔐 Vote encrypted successfully');

            // Send encrypted vote
            const bytesWritten = socket.write(encrypted);

            this.logger.info({
                username,
                address,
                bytesWritten,
                encryptedLength: encrypted.length
            }, '📤 Sent Votifier v1 encrypted vote');

            // Close the connection after sending
            setTimeout(() => {
                if (!socket.destroyed) {
                    socket.end();
                }
            }, 100);

        } catch (error) {
            this.logger.error({
                error: error.message,
                stack: error.stack,
                username,
                address,
                publicKeyLength: publicKeyPem ? publicKeyPem.length : 0
            }, '❌ Failed to send Votifier v1 vote');
            throw new Error(`Failed to send Votifier v1 vote: ${error.message}`);
        }
    }

    /**
     * Send vote using NuVotifier v2 protocol (JSON + token)
     */
    async sendNuVotifierV2Vote(socket, token, username, address, timestamp) {
        try {
            // Create the vote payload for NuVotifier v2
            const vote = {
                serviceName: 'MCServerList',
                username: username,
                address: address,
                timestamp: timestamp.toString()
            };

            // For NuVotifier v2, we need to create an HMAC signature
            const payload = JSON.stringify(vote);
            const signature = this.createSignature(payload, token);

            // Create the message with HMAC signature
            const message = {
                payload: payload,
                signature: signature
            };

            // Convert to JSON and send
            const jsonMessage = JSON.stringify(message);
            
            this.logger.info({ 
                username, 
                address, 
                timestamp,
                messageLength: jsonMessage.length,
                tokenLength: token.length,
                payloadLength: payload.length,
                signatureLength: signature.length
            }, '📤 Sending NuVotifier v2 vote with HMAC signature');

            // Send the message
            const bytesWritten = socket.write(jsonMessage);
            
            this.logger.debug({
                bytesWritten,
                messageLength: jsonMessage.length
            }, '📤 Vote message written to socket');

            // Add a small delay to allow for response
            setTimeout(() => {
                if (!socket.destroyed) {
                    this.logger.debug('🔌 Closing socket after vote send');
                    socket.end();
                }
            }, 100);

        } catch (error) {
            this.logger.error({
                error: error.message,
                stack: error.stack,
                username,
                address
            }, '❌ Failed to send NuVotifier v2 vote');
            throw new Error(`Failed to send NuVotifier v2 vote: ${error.message}`);
        }
    }

    /**
     * Send vote using VotifierPlus protocol (RSA encryption required)
     */
    async sendVotifierPlusRSAVote(socket, token, username, address, timestamp) {
        try {
            // VotifierPlus expects RSA encrypted vote data in Votifier v1 format
            const serviceName = 'MCServerList';
            const votePayload = `VOTE\n${serviceName}\n${username}\n${address}\n${timestamp}\n`;

            // Use a hardcoded public key for VotifierPlus (you provided this)
            const votifierPlusPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk9miqjRS2gWCrvS9I98G
dVCPkCrSA1J48wbkkTYSgMqAyGobj6XgsWAi64ibx9IS+aGlvVQaV9yEsr78nnI7
8RkjjPrKZYUPMMhfweeo/Cy39iQRW0YZkepziT8YwNr/8o3uJ5C3PMOe52Td2ar9
l5+nCit0vmZgLWYRDbffasTmtlKU79O5qObr1jVE8x4QrUQkvhAGVTiDKTG8HUbl
vwSU9gtBOL3FQzEbq4O/ggNubIZTEtjpj3djWnObIBXREHHdTr3LvB1LtSZsD4to
Fum9FlJMhN7ZJzmI9K9gvOMdkwmG/yIaCv5gipC1W7lBzKoAAMFvZQPFHJOPpVXq
uwIDAQAB
-----END PUBLIC KEY-----`;

            this.logger.info({
                username,
                address,
                timestamp,
                payloadLength: votePayload.length,
                payload: votePayload.replace(/\n/g, '\\n')
            }, '📤 Preparing VotifierPlus RSA vote');

            // Encrypt with RSA public key
            const encrypted = crypto.publicEncrypt({
                key: votifierPlusPublicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            }, Buffer.from(votePayload, 'utf8'));

            this.logger.info({
                username,
                address,
                originalLength: votePayload.length,
                encryptedLength: encrypted.length
            }, '🔐 VotifierPlus vote encrypted successfully');

            // Send encrypted vote (should be exactly 256 bytes)
            const bytesWritten = socket.write(encrypted);

            this.logger.info({
                username,
                address,
                bytesWritten,
                encryptedLength: encrypted.length,
                expectedLength: 256
            }, '📤 VotifierPlus RSA vote sent, waiting for response');

            // Don't close immediately, wait for response from main handler

        } catch (error) {
            this.logger.error({
                error: error.message,
                stack: error.stack,
                username,
                address
            }, '❌ Failed to send VotifierPlus RSA vote');
            throw new Error(`Failed to send VotifierPlus RSA vote: ${error.message}`);
        }
    }

    /**
     * Send vote using Votifier v2 protocol (JSON + HMAC signature)
     */
    async sendVotifierV2Vote(socket, token, username, address, timestamp) {
        try {
            // Create JSON payload
            const payload = {
                serviceName: 'MCServerList',
                username: username,
                address: address,
                timestamp: timestamp.toString(),
                challenge: this.generateChallenge()
            };

            // Create signature
            const signature = this.createSignature(JSON.stringify(payload), token);

            // Create final message
            const message = {
                payload: JSON.stringify(payload),
                signature: signature
            };

            // Send JSON message
            socket.write(JSON.stringify(message) + '\n');

            this.logger.debug({ username, address }, 'Sent Votifier v2 vote');
        } catch (error) {
            throw new Error(`Failed to send Votifier v2 vote: ${error.message}`);
        }
    }

    /**
     * Generate challenge for Votifier v2
     */
    generateChallenge() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Create HMAC signature for Votifier v2
     */
    createSignature(payload, token) {
        return crypto
            .createHmac('sha256', token)
            .update(payload)
            .digest('hex');
    }

    /**
     * Test Votifier connection
     */
    async testConnection(host, port) {
        this.logger.info({ host, port }, '🧪 Testing Votifier connection');
        
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let responseData = '';
            const startTime = Date.now();

            const timeoutHandle = setTimeout(() => {
                const duration = Date.now() - startTime;
                this.logger.error({ host, port, duration }, '⏰ Votifier test connection timeout');
                socket.destroy();
                reject(new Error(`Connection timeout after ${duration}ms`));
            }, this.timeout);

            this.logger.debug({ host, port }, '🔌 Connecting to Votifier for test');

            socket.connect(port, host, () => {
                const duration = Date.now() - startTime;
                this.logger.info({ host, port, duration }, '✅ Connected to Votifier server for testing');
            });

            socket.on('data', (data) => {
                const newData = data.toString();
                responseData += newData;
                
                this.logger.debug({
                    host,
                    port,
                    dataLength: newData.length,
                    totalLength: responseData.length,
                    data: newData.substring(0, 100)
                }, '📥 Received test data from Votifier');

                if (responseData.includes('VOTIFIER') || responseData.includes('NUVOTIFIER')) {
                    const duration = Date.now() - startTime;
                    clearTimeout(timeoutHandle);
                    socket.destroy();

                    const lines = responseData.split('\n');
                    const versionLine = lines[0].trim();
                    
                    let version = 'v1';
                    if (versionLine.includes('VOTIFIER 2') || versionLine.includes('NUVOTIFIER')) {
                        version = 'v2';
                    }

                    this.logger.info({
                        host,
                        port,
                        version,
                        versionLine,
                        duration,
                        totalLines: lines.length
                    }, '✅ Votifier test connection successful');

                    resolve({
                        success: true,
                        version: version,
                        response: versionLine,
                        duration,
                        fullResponse: responseData
                    });
                }
            });

            socket.on('error', (error) => {
                const duration = Date.now() - startTime;
                this.logger.error({
                    host,
                    port,
                    error: error.message,
                    errorCode: error.code,
                    duration
                }, '❌ Votifier test connection error');
                clearTimeout(timeoutHandle);
                reject(new Error(`Connection failed: ${error.message} (${error.code}) after ${duration}ms`));
            });

            socket.on('close', (hadError) => {
                const duration = Date.now() - startTime;
                this.logger.warn({
                    host,
                    port,
                    hadError,
                    duration,
                    responseLength: responseData.length
                }, '🔌 Votifier test connection closed');
                
                clearTimeout(timeoutHandle);
                if (!responseData) {
                    reject(new Error(`Connection closed without response after ${duration}ms`));
                }
            });
        });
    }

    /**
     * Process pending votes (for background job)
     */
    async processPendingVotes(serverVoteRepository) {
        try {
            const pendingVotes = await serverVoteRepository.getVotesNeedingVotifier();

            if (pendingVotes.length === 0) {
                this.logger.debug('No pending votes to process');
                return { processed: 0, successful: 0, failed: 0 };
            }

            this.logger.info({ count: pendingVotes.length }, 'Processing pending Votifier votes');

            let successful = 0;
            let failed = 0;

            for (const { vote, votifier } of pendingVotes) {
                try {
                    const result = await this.sendVote({
                        host: votifier.host,
                        port: votifier.port,
                        token: votifier.token,
                        username: vote.username,
                        address: vote.ip_address,
                        timestamp: Math.floor(new Date(vote.created_at).getTime() / 1000)
                    });

                    await serverVoteRepository.update(vote.id, {
                        votifier_sent: true,
                        votifier_response: result.response
                    });

                    successful++;
                } catch (error) {
                    await serverVoteRepository.update(vote.id, {
                        votifier_sent: false,
                        votifier_response: error.message
                    });

                    this.logger.warn({
                        voteId: vote.id,
                        host: votifier.host,
                        port: votifier.port,
                        error: error.message
                    }, 'Failed to send Votifier vote');

                    failed++;
                }
            }

            this.logger.info({
                processed: pendingVotes.length,
                successful,
                failed
            }, 'Completed processing Votifier votes');

            return { processed: pendingVotes.length, successful, failed };
        } catch (error) {
            this.logger.error({ error: error.message }, 'Failed to process pending votes');
            throw error;
        }
    }
}

module.exports = VotifierService;