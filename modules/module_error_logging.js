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
			callback( aDescriptioneError.descriptione.title + "" );
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

ModuleErrorLogging.error1 = function error1( sender, query ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция create контроллера до его инициализации'
		}
	};
};

ModuleErrorLogging.error2 = function error2( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Parameter query is not set',
			text:'Вызвана функция create с неопределенным или равным нулю аргументом query'
		}
	};
};

ModuleErrorLogging.error3 = function error3( sender, request, err ) {
	return {
		type: 'unknown_error',
		variant: 3,
		place: 'View.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:'sys_users',
			request:request,
			listAllowedOf_vid:['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
		},
		descriptione: {
			title:  err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.find при запросе _id пользователя по логину'
		}
	}
};

ModuleErrorLogging.error4 = function error4( sender, request, err ) {
	return {
		type: 'unknown_error',
		variant: 2,
		place: 'View.insert',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:'sys_users',
			request:request,
			listAllowedOf_vid:['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10']
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при ' +
				'вызове функции view.insert при сохранение логина ' +
				'пользователя'
		}
	}
};

ModuleErrorLogging.error5 = function error5( sender, request, err ) {
	return {
		type: 'unknown_error',
		variant: 3,
		place: 'View.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:'sys_users',
			request:request
		},
		descriptione: {
			title: err.message || err,
				text:'Ошибка полученная в функции обратного вызова при ' +
				'вызове функции view.modify при перезаписи ' +
			'сущесмтвующего в mongo пользователя'
		}
	}
};

ModuleErrorLogging.error6 = function error6( sender, odjUser ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.ModuleUser.create',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			odjUser:odjUser
		},
		descriptione: {
			title:'Controller: In the query.user field _id is missing',
			text:'При создании пользователя, в объекте query.user не  ' +
				'указан идентификатор пользователя'
		}
	}
};

ModuleErrorLogging.error7 = function error7( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.ModuleUser.checkUnique',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: In the query.user field login is missing',
			text:'При создании пользователя, в объекте query.user не  ' +
				'указан логин пользователя'
		}
	};
};

ModuleErrorLogging.error8 = function error8( sender, login ) {
	return {
		type: 'non-existent_data',
		variant: 1,
		place: 'Controller.ModuleUser.checkUnique',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			login:login
		},
		descriptione: {
			title:'Controller: User already exists in redis',
			text:'При создании пользователя проверка уникальности логина показала, что' +
				'пользователь с таким логином уже существует'
		}
	};
};

ModuleErrorLogging.error9 = function error9( sender, _id ) {
	return {
		type: 'non-existent_data',
		variant: 1,
		place: 'Controller.ModuleUser.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			_idUser:_id
		},
		descriptione: {
			title:'Controller: No cache in redis',
			text:'Не существует данных о пользователе в redis, поиск осуществляется по' +
				'идентификатору пользователя'
		}
	};
};

ModuleErrorLogging.error10 = function error10( sender, _id, login ) {
	return {
		type: 'non-existent_data',
		variant: 2,
		place: 'Controller.ModuleUser.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			login:login
		},
		descriptione: {
			title:'Controller: No cache in redis',
			text:'Не существует данных о пользователе в redis, поиск ' +
				'осуществляется по логину пользователя',
			_idUser:_id
		}
	};
};

ModuleErrorLogging.error11 = function error11( sender, login ) {
	return {
		type: 'non-existent_data',
		variant: 3,
		place: 'Controller.ModuleUser.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			login:login
		},
		descriptione: {
			title:'Controller: Requested the login does not exist',
			text:'Не существует в redis пользователя с указанным логином ' +
				'(не удается найти _id пользователя по его логину)'
		}
	};
};

ModuleErrorLogging.error12 = function error12( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.ModuleUser.find',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Not set login or _id in query.user',
			text:'При поиске данных о пользователе в объекте query.user не указан параметр' +
				'login или _id пользователя'
		}
	};
};

ModuleErrorLogging.error13 = function error13( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query.access',
			text:'Вызвана функция create, без указания в query.access логина или ' +
				'роли пользователя при указанном параметре viewName'
		}
	};
};

ModuleErrorLogging.error14 = function error14( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция create, без указания в query.access логина или ' +
				'роли пользователя при указанном параметре flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error15 = function error15( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter access in query',
			text:'Вызвана функция create, без указания в query.access параметра viewName или ' +
				'flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error16 = function error16( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 5,
		place: 'Controller.create',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter query',
			text:'Вызвана функция create, без указания в query параметров access, user или ' +
				'role'
		}
	};
};

ModuleErrorLogging.error17 = function error17( sender, query ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция find контроллера до его инициализации'

		}
	};
};

ModuleErrorLogging.error18 = function error18( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Parameter query is not set',
			text:'Вызвана функция find с неопределенным или равным нулю аргументом query'
		}
	};
};

ModuleErrorLogging.error19 = function error19( sender, viewName, request, err ) {
	return {
		type: 'unknown_error',
		variant: 4,
		place: 'View.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			request:request,
			listAllowedOf_vid:['a1', 'a2', 'a3']
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.find при запросе списка компаний'
		}
	};
};

ModuleErrorLogging.error20 = function error20( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Unknown type of query in query.user',
			text:'Вызвана функция find, без указания в query.user какого либо ' +
				'дополнительного параметра определяющего тип поиска'
		}
	};
};

ModuleErrorLogging.error21 = function error21( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция find, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре viewName'
		}
	};
};

ModuleErrorLogging.error22 = function error22( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция find, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error23 = function error23( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 5,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter access in query',
			text:'Вызвана функция find, без указания в query.access параметра viewName ' +
				'или flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error24 = function error24( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 6,
		place: 'Controller.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter query',
			text:'Вызвана функция find, без указания в query параметров access или user'
		}
	};
};

ModuleErrorLogging.error25 = function error25( sender, query ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция delete контроллера до его инициализации'
		}
	};
};

ModuleErrorLogging.error26 = function error26( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Parameter query is not set',
			text:'Вызвана функция delete с неопределенным или равным нулю аргументом query'
		}
	};
};

ModuleErrorLogging.error27 = function error27( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция delete, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре viewName'
		}
	};
};

ModuleErrorLogging.error28 = function error28( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция delete, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error29 = function error29( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter access in query',
			text:'Вызвана функция delete, без указания в query.access параметра viewName ' +
				'или flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error30 = function error30( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 5,
		place: 'Controller.delete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter query',
			test:'Вызвана функция delete, без указания в query параметров access, role или user'
		}
	};
};

ModuleErrorLogging.error31 = function error31( sender, query ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция modify контроллера до его инициализации'
		}
	};
};

ModuleErrorLogging.error32 = function error32( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Parameter query is not set',
			text:'Вызвана функция modify с неопределенным или равным нулю аргументом query'
		}
	};
};

ModuleErrorLogging.error33 = function error33( sender, request, err ) {
	return {
		type: 'unknown_error',
		variant: 2,
		place: 'View.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:'sys_users',
			request:request
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при ' +
				'вызове функции view.modify при сохранение логина и _id компании ' +
				'пользователя'
		}
	};
};

ModuleErrorLogging.error34 = function error34( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция modify, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре viewName'
		}
	};
};

ModuleErrorLogging.error35 = function error35( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Not set role or login in query',
			text:'Вызвана функция modify, без указания в query.access параметров ' +
				'логина или роли пользователя при указанном параметре flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error36 = function error36( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter access in query',
			text:'Вызвана функция modify, без указания в query.access параметра viewName ' +
				'или flexoSchemeName'
		}
	};
};

ModuleErrorLogging.error37 = function error37( sender, query ) {
	return {
		type: 'invalid_function_arguments',
		variant: 5,
		place: 'Controller.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			query:query
		},
		descriptione: {
			title:'Controller: Incorrect parameter query',
			test:'Вызвана функция modify, без указания в query параметров access или user'
		}
	};
};

ModuleErrorLogging.error38 = function error38( sender, viewName ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.getTemplate',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			viewName:viewName
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция getTemplate контроллера до его инициализации'
		}
	};
};

ModuleErrorLogging.error39 = function error39( sender ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.getTemplate',
		time: new Date().getTime(),
		sender:sender,
		descriptione: {
			title:'Controller: Parameter viewName is not set or value not exist in global',
			text:'Вызвана функция getTemplate с неопределенным, равным нулю или несуществующим ' +
				'аргументом viewName'
		}
	};
};

ModuleErrorLogging.error40 = function error40( sender, viewName ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.getTemplate',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName
		},
		descriptione: {
			title:'Controller: Parameter login is not set in socket',
			text:'Вызвана функция getTemplate с неопределенным или равным нулю параметром ' +
				'login в аргументе sender'
		}
	};
};

ModuleErrorLogging.error41 = function error41( sender, viewName ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.getTemplate',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName
		},
		descriptione: {
			title:'Controller: Parameter role is not set in socket',
			text:'Вызвана функция getTemplate с неопределенным или равным нулю параметром ' +
				'role в аргументе sender'
		}
	};
};

ModuleErrorLogging.error42 = function error42( sender, viewName ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.getTemplate',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName
		},
		descriptione: {
			title:'Controller: Parameter socket is not set',
			text:'Вызвана функция getTemplate с неопределенным или равным нулю аргументом ' +
				'socket'
		}
	};
};

ModuleErrorLogging.error43 = function error43( sender, socket, viewName, err ) {
	return {
		type: 'unknown_error',
		variant: 1,
		place: 'View.getTemplate',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.getTemplate'
		}
	};
};

ModuleErrorLogging.error44 = function error44( sender, listAllowedOf_vid, viewName, ids ) {
	return {
		type:'loss_integrity',
		variant:1,
		place:'View.getTemplate',
		time:new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			listAllowedOf_vid:listAllowedOf_vid
		},
		descriptione: {
			text:'Ошибка целостности, так как view обрезала список разрешенных ' +
				'идентификаторов',
			vidsFromView:ids
		}
	};
};

ModuleErrorLogging.error45 = function error45( sender, type, request, viewName ) {
	return {
		type: 'invalid_function_arguments',
		variant: -1,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			request:request,
			viewName:viewName
		},
		descriptione: {
			title:'Controller: Parameter company_id not set in socket',
			text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
				'socket'
		}
	};
};

ModuleErrorLogging.error46 = function error46( sender, type, request, viewName ) {
	return {
		type: 'invalid_function_arguments',
		variant: 1,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			request:request,
			viewName:viewName
		},
		descriptione: {
			title:'Controller: Parameter socket is not set',
			text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
				'socket'
		}
	};
};

ModuleErrorLogging.error47 = function error47( sender, type, request, viewName, socket ) {
	return {
		type: 'initialization',
		variant: 1,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender: sender,
		arguments:{
			type:type,
			request:request,
			viewName:viewName,
			socketViews:socket.view
		},
		descriptione: {
			title:'Controller: initialization required',
			text:'Вызвана функция queryToView контроллера до его инициализации'
		}
	};
};

ModuleErrorLogging.error48 = function error48( sender, type, request, viewName, socket ) {
	return {
		type: 'invalid_function_arguments',
		variant: 2,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			request:request,
			socketViews:socket.view
		},
		descriptione: {
			title:'Controller: Parameter viewName is not set',
			text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
				'viewName'
		}
	};
};

ModuleErrorLogging.error49 = function error49( sender, type, request, viewName, socket ) {
	return {
		type: 'invalid_function_arguments',
		variant: 3,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			viewName:viewName,
			socketViews:socket.view
		},
		descriptione: {
			title:'Controller: Parameter request is not set',
			text:'Вызвана функция queryToView с неопределенным или равным нулю аргументом ' +
				'request'
		}
	};
};

ModuleErrorLogging.error50 = function error50( sender, type, request, viewName, socket ) {
	return {
		type: 'invalid_function_arguments',
		variant: 4,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			viewName:viewName,
			socketViews:socket.view,
			request:request
		},
		descriptione: {
			title:'Controller: Parameter request is not array',
			text:'Вызвана функция queryToView с типом запроса который подразумевает, что ' +
				'аргумент request должен быть массивом'
		}
	};
};

ModuleErrorLogging.error51 = function error51( sender, request, viewName, options, socket, err ) {
	return {
		type: 'unknown_error',
		variant: 1,
		place: 'View.find',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request,
			optionsView:options
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.find'
		}
	};
};

ModuleErrorLogging.error52 = function error52( sender, request, viewName, socket ) {
	return {
		type: 'access_violation',
		variant: 1,
		place: 'Controller.checkRead',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request
		},
		descriptione: {
			title:'Controller: No permission to read in view ' + viewName + ' or not correct request',
			text:'Запрашиваются несуществующие или неразрешенные идентификаторы на ' +
				'чтение view в request, или некоректный запрос'
		}
	};
};

ModuleErrorLogging.error53 = function error53( sender, request, viewName, options, err ) {
	return {
		type: 'unknown_error',
		variant: 1,
		place: 'View.insert',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request,
			optionsView:options
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.insert'
		}
	};
};

ModuleErrorLogging.error54 = function error54( sender, request, viewName, socket ) {
	return {
		type: 'access_violation',
		variant: 1,
		place: 'Controller.checkCreate',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request
		},
		descriptione: {
			title:'Controller: No permission to create in view ' + viewName + ' or not correct request',
			text:'Запрашиваются несуществующие или неразрешенные идентификаторы на' +
				'создание view в request, или некоректный запрос'
		}
	};
};

ModuleErrorLogging.error55 = function error55( sender, request, viewName, options, err ) {
	return {
		type: 'unknown_error',
		variant: 1,
		place: 'View.modify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			request:request,
			optionsView:options
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.modify'
		}
	};
};

ModuleErrorLogging.error56 = function error56( sender, request, viewName, socket ) {
	return {
		type: 'access_violation',
		variant: 1,
		place: 'Controller.checkModify',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request
		},
		descriptione: {
			title:'Controller: No permission to modify in view ' + viewName + ' or not correct request',
			text:'Запрашиваются несуществующие или неразрешенные идентификаторы на' +
				'модификацию view в request, или некоректный запрос'
		}
	};
};

ModuleErrorLogging.error57 = function error57( sender, request, viewName, options, err ) {
	return {
		type: 'unknown_error',
		variant: 1,
		place: 'View.delete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			request:request,
			optionsView:options
		},
		descriptione: {
			title: err.message || err,
			text:'Ошибка полученная в функции обратного вызова при вызове ' +
				'функции view.delete'
		}
	};
};

ModuleErrorLogging.error58 = function error58( sender, request, viewName, socket ) {
	return {
		type: 'access_violation',
		variant: 1,
		place: 'Controller.checkDelete',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			viewName:viewName,
			list_vidsFromSocket:socket.view[viewName].ids,
			request:request
		},
		descriptione: {
			title:'Controller: No permission to delete in view ' + viewName + ' or not ' +
				'correct request',
			text:'Запрашиваются неразрешенная операция на удаление view в request, или некоректный запрос'
		}
	};
};

ModuleErrorLogging.error59 = function error59( sender, type, request, viewName, socket ) {
	return {
		type: 'invalid_function_arguments',
		variant: 5,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			viewName:viewName,
			socketViews:socket.view,
			request:request
		},
		descriptione: {
			title:'Controller: Unknown type of request',
			text:'Вызвана функция queryToView с неизвестным значением параметра type'
		}
	};
};

ModuleErrorLogging.error60 = function error60( sender, type, request, viewName, socket ) {
	return {
		type: 'invalid_function_arguments',
		variant: 6,
		place: 'Controller.queryToView',
		time: new Date().getTime(),
		sender:sender,
		arguments:{
			type:type,
			viewName:viewName,
			socketViews:socket.view,
			request:request
		},
		descriptione: {
			title:'Controller: There is no list of approved viewIDs in socket or ' +
				'requested data without requiring a template or config',
			text:'Вызвана функция queryToView до вызова шаблона для данной view, иначе говоря' +
				'отсутствует список разрешенных идентификаторов прикрепленных к socket'
		}
	};
};

module.exports = ModuleErrorLogging;