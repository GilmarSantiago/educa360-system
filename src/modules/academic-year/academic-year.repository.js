const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('academicYears');
    }
}

module.exports = new Repository();