var ModuleErrorLogging = {};

ModuleErrorLogging.save = function save( client, aDescriptionesErrors, callback ){
	var multi = client.multi();

	var key; //Формируемый ключ redis

	//Сохранение объекта прав в redis
	key = zsetErrorLoging();
	//ToDo:Проверка объекта objDescriptioneError
	for( var i = 0; i < aDescriptionesErrors.length; i++ ) {
		multi.ZADD( key, aDescriptionesErrors[i].time, JSON.stringify(aDescriptionesErrors[i]));
	}

    multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModuleErrorLogging.saveAndReturnError = function save( client, aDescriptioneError, callback ){
	//Сохранение объекта прав в redis
	var key = zsetErrorLoging();
	//ToDo:Проверка объекта objDescriptioneError

	client.ZADD( key, aDescriptioneError.time, JSON.stringify(aDescriptioneError),
		function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( aDescriptioneError.descriptione.title );
		}
	});
};

ModuleErrorLogging.findFromMinToMax = function findFromMinToMax ( client, min, max, callback ) {
	client.ZRANGEBYSCORE( zsetErrorLoging(), min, max, function ( err, replies ) {
		if( err ) {
			callback( err );
		} else {
			var objResult = [];
			for( var i = 0; i < replies.length ; i++ ) {
				objResult.push(JSON.parse(replies[i]));
			}

			callback(null, objResult);
		}
	} );
};

ModuleErrorLogging.deleteErrorLogging = function deleteErrorLogging(client, time, callback) {
	client.ZREMRANGEBYSCORE(zsetErrorLoging( ), time, time, function(err, reply){
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModuleErrorLogging.deleteAllErrorLogging = function deleteAllErrorLogging(client, callback) {
	client.DEL( zsetErrorLoging( ), function( err, reply ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

//Формирование строки ключа Redis (STRING) для прав относящиеся к view для заданной схемы и
//пользователю
function zsetErrorLoging( ) {
	return 'errorLogging:';
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = ModuleErrorLogging;