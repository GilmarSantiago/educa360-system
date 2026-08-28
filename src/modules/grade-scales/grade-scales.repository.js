const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('gradeScales');
    }
}

module.exports = new Repository();