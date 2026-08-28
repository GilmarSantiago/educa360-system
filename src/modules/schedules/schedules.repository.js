const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('schedules');
    }
}

module.exports = new Repository();