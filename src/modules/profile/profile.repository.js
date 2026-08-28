const BaseRepository = require('../../shared/BaseRepository');

class Repository extends BaseRepository {
    constructor() {
        super('users'); // Profile uses the users table
    }
}

module.exports = new Repository();
