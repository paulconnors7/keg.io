var fs = require('fs'),
	sys = require('sys'),
	util = require(process.binding('natives').util ? 'util': 'sys'),
	sqlite = require('../node-sqlite/sqlite');

KegDb = function() {                
    this.db = new sqlite.Database();
    this.logger = null;        
};

//util.inherits(Keg, process.EventEmitter);     
                       
// I have no idea why, but this no longer works if the 'method'
// is named 'init'.  It's the strangest error...
KegDb.prototype.initialize = function(logger, dbName) {
	this.logger = logger;       
	this.logger.info("Opening DB: " + dbName);
	
    var self = this;    
	this.db.open(dbName, function(error) {
        if (error) {
            self.logger.error("Error opening db. Please check your configuration.");
            throw error;
        }
        else
        {
            self.logger.info(dbName + " opened for reading/writing.");
        }
    });
};

KegDb.prototype.getTemperatureHistory = function(callback) {
    var self = this;
    this.db.execute('SELECT temperature, temperature_date FROM temperature ORDER BY temperature_date',
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.getPourHistory = function(callback) {
    var self = this;
    this.db.execute("SELECT rfid, pour.keg_id, pour_date, volume_ounces " +
					"FROM pour INNER JOIN keg on pour.keg_id = keg.keg_id " +  
					"WHERE active = 'true' " +
					"ORDER BY pour_date DESC",
    function(error, rows) {
        callback(rows);
    });
};                  

KegDb.prototype.getPourHistoryByKeg = function(keg_id, callback) {
    var self = this;
    this.db.execute('SELECT rfid, keg_id, pour_date, volume_ounces FROM pour WHERE keg_id = \'' + keg_id + '\' ORDER BY pour_date DESC',
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.getKegs = function(callback) {
    var self = this;
    this.db.execute("SELECT keg_id, beer, brewery, description, beer_style, tapped_date, image_path, volume_gallons " + 
					"FROM keg ORDER BY tapped_date DESC",
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.getActiveKeg = function(callback) {
    var self = this;
    this.db.execute("SELECT keg_id, beer, brewery, description, beer_style, tapped_date, image_path, volume_gallons " + 
					"FROM keg WHERE active = 'true' ORDER BY tapped_date DESC",
    function(error, rows) {         
        callback(rows);
    });
};

// Get the top 10 drinkers
KegDb.prototype.getPourTotalsByUser = function(callback) {
    var self = this;
    var sql = 'SELECT user.first_name, user.last_name, SUM(pour.volume_ounces) as volume ' +
    		  'FROM pour INNER JOIN user ON pour.rfid = user.rfid ' +
    		  'GROUP BY user.rfid, user.first_name, user.last_name ' +
    		  'ORDER BY SUM(pour.volume_ounces) DESC ' +
    		  'LIMIT 10';
    this.db.execute(sql,
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.getPourTotalsByUserByKeg = function(keg_id, callback) {
    var self = this;
    var sql = 'SELECT user.first_name, user.last_name, SUM(pour.volume_ounces) ' +
    		  'FROM pour INNER JOIN user ON pour.rfid = user.rfid ' +
    		  'WHERE pour.keg_id = \'' + keg_id + '\' '
    		  'GROUP BY user.rfid, user.first_name, user.last_name ' +
    		  'ORDER BY SUM(pour.volume_ounces) DESC ' +
    		  'LIMIT 10';
    this.db.execute(sql,
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.validateUser = function(tag, callback) {
    var self = this;
    var sql = 'SELECT first_name, last_name, nickname, email, twitter_handle ' +
    		  'FROM user ' +
    		  'WHERE rfid=\'' + tag + '\' ' +
    		  'LIMIT 1';
    this.db.execute(sql,
    function(error, rows) {
        callback(rows);
    });
};

KegDb.prototype.addTemperature = function(temperature) {
    this.db.execute(
    "INSERT INTO temperature (temperature, temperature_date) VALUES (?, ?)"
    , [Math.round(temperature), new Date() + '']
    , function(error, rows) {});
};

KegDb.prototype.addPour = function(rfid, volumeInOunces) {
	                                                           
	// Ex.
	// INSERT INTO pour(rfid, keg_id, pour_date, volume_ounces)    
	// SELECT '12341234', keg_id, '2011-03-12 01:23:46.666', '16'
	// FROM keg WHERE active = 'true'
    this.db.execute(
    "INSERT INTO pour (rfid, keg_id, pour_date, volume_ounces) " + 
	"SELECT \'" + rfid + "\', keg_id, \'" + new Date() + "\', \'" + 
	 Math.round(volumeInOunces) + "\' FROM keg WHERE active = 'true'"
    , function(error, rows) {});
};

KegDb.prototype.addUser = function(first_name, last_name, rfid, email,twitter_handle){
	this.db.execute(
		"INSERT INTO user (first_name,last_name,rfid,email) VALUES (?, ?, ?, ?, ?)"
		, [first_name, last_name, rfid, email,twitter_handle]
		, function(error, rows) {});
};

KegDb.prototype.updateUser = function(first_name, last_name, rfid, email,twitter_handle){
	this.db.execute(
		"UPDATE user SET first_name =? ,last_name = ?,email =?,twitter_handle = ? WHERE rfid = ?"
		, [first_name, last_name, email,twitter_handle,rfid]
		, function(error, rows) {});
};
 
exports.KegDb = KegDb;