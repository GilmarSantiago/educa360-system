const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('enrollments');
    }
}

module.exports = new Repository();