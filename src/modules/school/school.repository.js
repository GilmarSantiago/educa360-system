const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('school'); 
    }
}

module.exports = new Repository();
