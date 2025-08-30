'use strict'

// Reusable aggregates/metrics for servers
// Keeping response shape stable while centralizing definition for reuse
const voteStatsSummaryObject = {
    type: 'object',
    properties: {
        total_votes: { type: 'integer' }
    }
};

module.exports = {
    voteStatsSummaryObject
};
