const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('students');
    }
}

module.exports = new Repository();