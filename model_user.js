module.exports = ModelUser;

/**
 * Конструктор модели пользователя
 *
 * @constructor
 * @param client - объект redis клиент
 * @param [login] - строка, login пользователя
 * @param [_id] - строка, идентификатор пользователя
 */

function ModelUser( client, login, _id ) {
	this.client = client;
	this.login = login;
	this._id = _id;
	this.objUser = {};
	return this;
}

/**
 * Создаем нового пользователя и сохраняем в redis
 *
 * @param odjUser - объект содержащий параметры создания пользователя в виде {fieldName:value}
 * @param callback
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного создания
 */
ModelUser.prototype.create = function create( odjUser, callback ) {

	if(typeof odjUser['_id'] !== "string"){
		throw new Error( 'In the object field _id is missing: ' + JSON.stringify( odjUser ) );
	}

	var self = this;

	//Сохраняем данные о пользователе в redis
	var multi = this.client.multi();

	//Сохраняем кеш с данными о пользователе
	multi.SET( strUserCache( odjUser['_id'] ), JSON.stringify( odjUser ) );
	//Сохраняем свзку логин и _id пользователся
	multi.SET( strLoginToId( odjUser['login'] ), odjUser['_id'] );
	//Сохраняем связку _id и логин пользователя
	multi.SET( strIdToLogin( odjUser['_id'] ), odjUser['login'] );
	//ToDo: Временно для быстрого удаления всех прав
	multi.SADD( setAllAccess(), strUserCache( odjUser['_id'] ), JSON.stringify( odjUser ) );
	multi.SADD( setAllAccess(), strLoginToId( odjUser['login'] ), odjUser['_id'] );
	multi.SADD( setAllAccess(), strIdToLogin( odjUser['_id'] ), odjUser['login'] );

	multi.EXEC(function( err ){
		if(err){
			callback( err );
		} else {
			self.objUser = odjUser;

			callback( null, true );
		}
	});
};

ModelUser.prototype.checkUnique = function checkUnique(login, callback){
	if(typeof login !== "string"){
		throw new Error( 'In the object field login is missing: ' + JSON.stringify( odjUser ) );
	}

	//Проверяем уникальность создаваемого пользователя
	this.client.GET( strLoginToId( login ), function( err, reply ){
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
ModelUser.prototype.find = function find(callback){
	//Простой поиск пользователя
	if( this._id ) {
		var self = this;
		//Получаем кеш с данными пользователя
		this.client.GET( strUserCache( this._id ), function( err, reply ) {
			if ( err ) {
				callback( err );
			} else if (reply) {
				callback( null, JSON.parse( reply ) );
			} else {
				callback( new Error( 'No cache in redis for the _id: '+ self._id ) );
			}
		} );
	} else if ( this.login ) {
		var self = this;
		//Получаем идентификатор пользователя
		this.client.GET( strLoginToId( this.login ), function( err, _id ){
			if( err ){
				callback(err);
			} else if ( _id ){
				//Получаем кеш с данными пользователя
				self.client.GET( strUserCache( _id ), function( err, reply ) {
					if ( err ) {
						callback( err );
					} else if (reply) {
						callback( null, JSON.parse( reply ) );
					} else {
						callback( new Error( 'No cache in redis for the login: '+ self.login ) );
					}
				} );

			} else {
				callback( new Error( 'Requested the login does not exist: ' + self.login ) );
			}
		});
	} else {
		throw new Error( 'Not set login or _id in find query. ' );
	}
};

ModelUser.prototype.findsPass = function findsPass(listDocuments, callback){
	//ToDo: хранить пары логин пароль, возможно???
	var multi = this.client.multi();

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

/**
 * Удаление пользователя
 *
 * @param callback (err, reply)
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного удаления
 */
ModelUser.prototype.delete = function del(callback){
	if ( this._id ) {
		//Получаем имя пользователя
		var self = this;
		this.client.GET( strIdToLogin( this._id ), function(err, login){
			if ( err ) {
				callback( err );
			} else if ( login ) {
				//Формируем команды на удаление пользователя
				var multi = self.client.multi();
				multi.DEL( strUserCache( self._id ) );
				multi.DEL( strIdToLogin( self._id ) );
				multi.DEL( strLoginToId( login ) );
				//ToDo: Временно зачистка ключей из множества для бытрого удаления всех прав
				multi.SREM( setAllAccess(), strUserCache( self._id ) );
				multi.SREM( setAllAccess(), strIdToLogin( self._id ) );
				multi.SREM( setAllAccess(), strLoginToId( login ) );

				multi.EXEC(function( err, replies ) {
					if ( err ) {
						callback( err );
					} else {
						callback( null, true );
					}
				} );
			} else {
				callback( new Error( 'Removal is not an existing user with _id: ' + self._id ) );
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
ModelUser.prototype.modify = function modify(objNewData, callback){

	if ( this._id ) {
		//Получаем кеш из redis по _id
		var self = this;
		this.client.GET( strUserCache( this._id ), function( err, reply ){
			if( err ) {
				callback( err );
			} else if ( reply ) {
				var cache = JSON.parse(reply);
				//Получаю список изменяемых полей
				var listFields = Object.keys( objNewData );
				//Вносим изменения в кеш
				var multi = self.client.multi();
				for( var i = 0; i < listFields.length; i++ ) {
					//Проверяем изменение логина пользователя
					if(listFields[i] === 'login') {
						var lastLogin = cache['login'];
						var newLogin = objNewData['login'];

						multi.DEL(strLoginToId(lastLogin));
						multi.DEL(strIdToLogin(self._id));
						multi.SET(strLoginToId(newLogin), self._id);
						multi.SET(strIdToLogin(self._id), newLogin);
					}

					//Отфильтровываем изменение поля _id
					if(listFields[i] !== '_id') {
						cache[listFields[i]] = objNewData[listFields[i]]
					}

				}

				//Сохраняем измененные кеш с данными о пользователе
				multi.SET( strUserCache( self._id ), JSON.stringify( cache ))
				multi.EXEC( function( err ){
						if ( err ){
							callback( err );
						} else {
							callback( null, cache );
						}
					} );

			} else {
				callback( new Error( 'Modification of data is not existing user with _id: '
					+ self._id ) );
			}
		} );
	} else {
		throw new Error( 'Not set _id in modify query. ' );
	}
};


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

