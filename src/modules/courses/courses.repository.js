const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('courses');
    }
}

module.exports = new Repository();