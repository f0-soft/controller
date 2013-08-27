var ModuleUser = {};

/**
 * Создаем нового пользователя и сохраняем в redis
 *
 * @param odjUser - объект содержащий параметры создания пользователя в виде {fieldName:value}
 * @param callback
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного создания
 */
ModuleUser.create = function create( client, odjUser, callback ) {

	if(typeof odjUser['_id'] !== "string"){
		throw new Error( 'In the object field _id is missing: ' + JSON.stringify( odjUser ) );
	}

	//Сохраняем данные о пользователе в redis
	var multi = client.multi();

	//Сохраняем кеш с данными о пользователе
	multi.SET( strUserCache( odjUser['_id'] ), JSON.stringify( odjUser ) );
	//Сохраняем свзку логин и _id пользователся
	multi.SET( strLoginToId( odjUser['login'] ), odjUser['_id'] );
	//Сохраняем связку _id и логин пользователя
	multi.SET( strIdToLogin( odjUser['_id'] ), odjUser['login'] );
	//ToDo:Черновой вариант
	//Сохраняем логин пользователя в справочник пользователей
	multi.SADD( setListOfLogin(), odjUser['login'] );
	//Сохраняем role пользователя в справочник ролей
	if ( odjUser['role'] ) {
		multi.SADD( setListOfRole() , odjUser['role']);
	}

	//ToDo: Временно для быстрого удаления всех прав
	multi.SADD( setAllAccess(), strUserCache( odjUser['_id'] ) );
	multi.SADD( setAllAccess(), strLoginToId( odjUser['login'] ) );
	multi.SADD( setAllAccess(), strIdToLogin( odjUser['_id'] ) );
	multi.SADD( setListOfLogin(), odjUser['login'] );
	multi.SADD( setListOfRole() , odjUser['role']);

	multi.EXEC(function( err ){
		if(err){
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModuleUser.createRole = function createRole(client, role, callback) {
	client.SADD( setListOfRole() , role, function( err, reply ) {
		if( err ) {
			callback( err );
		} else {
			callback( null, true );
		}
	} );
};

ModuleUser.checkUnique = function checkUnique(client, login, callback){
	if(typeof login !== "string"){
		throw new Error( 'In the object field login is missing: ' + JSON.stringify( odjUser ) );
	}

	//Проверяем уникальность создаваемого пользователя
	client.GET( strLoginToId( login ), function( err, reply ){
		if( err ){
			callback( err );
		} else if (reply) {
			callback( new Error( 'User already exists in redis with login: ' +  login ) );
		} else {
			callback(null, true);
		}
	});
};

/**
 * Простой поиск информации о пользователе
 *
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - объект с информацией о пользователе	в виде {fieldName:value}
 */
ModuleUser.find = function find(client, _id, login, callback){
	//Простой поиск пользователя
	if( _id ) {
		//Получаем кеш с данными пользователя
		client.GET( strUserCache( _id ), function( err, reply ) {
			if ( err ) {
				callback( err );
			} else if (reply) {
				callback( null, JSON.parse( reply ) );
			} else {
				callback( new Error( 'No cache in redis for the _id: '+ _id ) );
			}
		} );
	} else if ( login ) {
		//Получаем идентификатор пользователя
		client.GET( strLoginToId( login ), function( err, _id ){
			if( err ){
				callback(err);
			} else if ( _id ){
				//Получаем кеш с данными пользователя
				client.GET( strUserCache( _id ), function( err, reply ) {
					if ( err ) {
						callback( err );
					} else if (reply) {
						callback( null, JSON.parse( reply ) );
					} else {
						callback( new Error( 'No cache in redis for the login: '+ login ) );
					}
				} );

			} else {
				callback( new Error( 'Requested the login does not exist: ' + login ) );
			}
		});
	} else {
		throw new Error( 'Not set login or _id in find query. ' );
	}
};

ModuleUser.findsPass = function findsPass(client, listDocuments, callback){
	//ToDo: хранить пары логин пароль, возможно???
	var multi = client.multi();

	for(var i=0; i<listDocuments.length; i++){
		multi.GET( strIdToLogin(listDocuments._id) );
	}

	multi.EXEC( function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			for( var i; i<replies.length; i++ ) {
				listDocuments[i].pass = JSON.parse(replies[i]).pass;
			}
			callback(null, listDocuments);
		}
	} );
};

ModuleUser.findListOfUsers = function findListOfUsers(client, callback){
	client.SMEMBERS( setListOfLogin(), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

ModuleUser.findListOfRoles = function findListOfRoles(client, callback){
	client.SMEMBERS( setListOfRole(), function( err, replies ){
		if ( err ) {
			callback( err );
		} else {
			callback( null, replies );
		}
	})
};

/**
 * Удаление пользователя
 *
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного удаления
 */
ModuleUser.delete = function del(client, _id, callback){
	if ( _id ) {
		//Получаем имя пользователя
		client.GET( strIdToLogin( _id ), function(err, login){
			if ( err ) {
				callback( err );
			} else if ( login ) {
				//Формируем команды на удаление пользователя
				var multi = client.multi();
				multi.DEL( strUserCache( _id ) );
				multi.DEL( strIdToLogin( _id ) );
				multi.DEL( strLoginToId( login ) );
				//ToDo: продумать удаление пользователя из справочника и роли
				//ToDo: продумать как обеспечеть целостность объектов прав связанных с удаляемым
				//ToDo: пользователем и ролью
				multi.SREM( setListOfLogin(), login );

				//ToDo: Временно зачистка ключей из множества для бытрого удаления всех прав
				multi.SREM( setAllAccess(), strUserCache( _id ) );
				multi.SREM( setAllAccess(), strIdToLogin( _id ) );
				multi.SREM( setAllAccess(), strLoginToId( login ) );

				multi.EXEC(function( err, replies ) {
					if ( err ) {
						callback( err );
					} else {
						callback( null, true );
					}
				} );
			} else {
				callback( new Error( 'Removal is not an existing user with _id: ' + _id ) );
			}
		} );
	} else {
		throw new Error( 'Not set _id in delete query. ' );
	}
};

/**
 * Модификация данных о пользователе
 *
 * @param objNewData - бъект содержащий только измененные данные о пользователе в
 * виде {fieldName:value}
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного удаления
 */
ModuleUser.modify = function modify(client, _id, objNewData, callback){

	if ( _id ) {
		//Получаем кеш из redis по _id
		client.GET( strUserCache( _id ), function( err, reply ){
			if( err ) {
				callback( err );
			} else if ( reply ) {
				var cache = JSON.parse(reply);
				//Получаю список изменяемых полей
				var listFields = Object.keys( objNewData );
				//Вносим изменения в кеш
				var multi = client.multi();
				for( var i = 0; i < listFields.length; i++ ) {
					//Проверяем изменение логина пользователя
					if(listFields[i] === 'login') {
						var lastLogin = cache['login'];
						var newLogin = objNewData['login'];

						multi.DEL(strLoginToId(lastLogin));
						multi.DEL(strIdToLogin(_id));
						multi.SET(strLoginToId(newLogin), _id);
						multi.SET(strIdToLogin(_id), newLogin);
					}

					//Отфильтровываем изменение поля _id
					if(listFields[i] !== '_id') {
						cache[listFields[i]] = objNewData[listFields[i]]
					}

				}

				//Сохраняем измененные кеш с данными о пользователе
				multi.SET( strUserCache( _id ), JSON.stringify( cache ));
				multi.EXEC( function( err ){
						if ( err ){
							callback( err );
						} else {
							callback( null, cache );
						}
					} );

			} else {
				callback( new Error( 'Modification of data is not existing user with _id: '
					+ _id ) );
			}
		} );
	} else {
		throw new Error( 'Not set _id in modify query. ' );
	}
};

//Формирование строки ключа Redis (SET) для хранения справочника о пользователей
function setListOfLogin( ) {
	return 'list:users';
}

//Формирование строки ключа Redis (SET) для хранения справочника о ролях
function setListOfRole( ) {
	return 'list:roles';
}

//Формирование строки ключа Redis (STRING) для хранения соответствия логина и _id пользователя
function strLoginToId( login ) {
	return 'login:_id:' + login;
}

//Формирование строки ключа Redis (STRING) для хранения соответствия _id и логина пользователя
function strIdToLogin( _id ) {
	return 'login:login:' + _id;
}

//Формирование строки ключа Redis (STRING) для хранения кеша данных о пользователе
function strUserCache( _id ) {
	return 'userCache:' + _id;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

module.exports = ModuleUser;
