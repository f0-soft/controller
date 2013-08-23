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
	//ToDo:Временно сохраняем ключ в множество для быстрого удаления всех прав
	multi.SADD( setAllAccess, key );

    multi.EXEC( function( err ) {
		if ( err ) {
			callback( err );
		} else {
			callback( null, true );
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