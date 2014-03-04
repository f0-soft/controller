var underscore = require('underscore');

var view = {}; //Переменная для хранения массивов с данными для каждой flexo схемы
var dependent; //Переменная для хранения имени зависимой схемы
var viewName; //Название view

function init ( config, callback ){
	dependent = config.dependent;
	callback(null, true);
}


function getTemplate ( name, vids, callback ) {

	if ( !underscore.isString( name ) ) {
		callback(new Error( 'View_mock: Parameter viewName is not set or not string' ));
		return;
	}

	if ( !underscore.isArray( vids ) ) {
		callback(new Error( 'View_mock: Parameter vids is not set or not array' ));
		return;
	}

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'View_mock: callback not a function' );
	}

	callback(null, vids, 'javascriptConfigFor' + name, '');
}

function find(viewName, listOf_vids, request, options, callback){

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'View_mock: Parameter viewName is not set or not string' ));
		return;
	}

	if ( !underscore.isArray( listOf_vids ) ) {
		callback(new Error( 'View_mock: Parameter vids is not set or not array' ));
		return;
	}

	if ( !request ) {
		callback(new Error( 'View_mock: Parameter request is not set' ));
		return;
	}

	if ( !options ) {
		callback(new Error( 'View_mock: Parameter options is not set' ));
		return;
	}

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'View_mock: callback not a function' );
	}

		//Схемы в запросе
	var objResults = {};

	if( view[viewName] ) {

		objResults[viewName] = [];

		var objLocal = [];
		var fieldsSearch = Object.keys(request.selector);
		var limit = -1;
		var skip = 0;
		if (request.options && request.options.limit)
			limit = request.options.limit;
		if (request.options && request.options.limit)
			skip = request.options.skip;

		//Получаем массив объектов с полями

		for( var j = 0; j < view[viewName].length; j++ ) {
			//Ищем подходящие документы
			if(fieldsSearch.length !== 0){
				var trigger = true;
				for( var k = 0; k < fieldsSearch.length; k++ ){
					if( request.selector[fieldsSearch[k]] ===
						view[viewName][j][fieldsSearch[k]] ){
						continue;
					}

					if (k === (fieldsSearch.length-1)){
						trigger = false;
					}
				}


				if(trigger) {
					//Получаем имена полей
					var fieldsByView = Object.keys(view[viewName][j]);

					for(var x=0; x<fieldsByView.length; x++){
						if(underscore.isArray(view[viewName][j][fieldsByView[x]])){
							if(schemes.length === 1){
								schemes.push(dependent);
								request.selector[dependent] = [];

								for(var z=0; z<view[viewName][j][fieldsByView[x]].length; z++){
									request.selector[dependent].push({
										selector:{
											_id:view[viewName][j][fieldsByView[x]][z]
										}
									});
								}

							}
						}
					}

					objLocal.push(view[viewName][j]);
				}
			} else {
				objLocal = view[viewName];
				break;
			}

		}

		if(objLocal.length !== 0) {
			if (skip) {
				objLocal = objLocal.splice(0, skip);
			}

			if (limit !== -1) {
				objLocal = objLocal.slice(0, limit);
			}

			objResults = objLocal;
		}

	} else {
		//ToDo:Захардкожено для получения данных о коллекциях компаний связанных с ролью
		if ( viewName === 'customer' ) {
			objResults = [
				{'a1':'c1', 'a2':'ООО "Саша пряник"', 'a3':'123456789'},
				{'a1':'c2', 'a2':'ООО "Рога и копыта"', 'a3':'987654321'},
				{'a1':'c3', 'a2':'ООО "Хорошая идея"', 'a3':'987651234'}
			];
		} else if ( viewName === 'contractor' ) {
			objResults = [
				{'a1':'c4', 'a2':'ЗАО "Носы и хвосты"', 'a3':'123456780'},
				{'a1':'c5', 'a2':'ЗАО "Плохая идея"', 'a3':'987654320'},
				{'a1':'c6', 'a2':'ЗАО "Вася пупкин"', 'a3':'987651234'}
			];
		}
	}

	setImmediate(function(){
		callback(null, objResults)
	});
	return;
}

function insert (viewName, listOf_vids, request, options, callback) {

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'View_mock: Parameter viewName is not set or not string' ));
		return;
	}

	if ( !underscore.isArray( listOf_vids ) ) {
		callback(new Error( 'View_mock: Parameter vids is not set or not array' ));
		return;
	}

	if ( !request ) {
		callback(new Error( 'View_mock: Parameter request is not set' ));
		return;
	}

	if ( !options ) {
		callback(new Error( 'View_mock: Parameter options is not set' ));
		return;
	}

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'View_mock: callback not a function' );
	}


	var objReturn = [];

	//Проверяем наличие объекта для данной схемы
	if( !view[viewName] ) view[viewName] = [];

	if(underscore.isArray(request)) {

		for(var j=0; j<request.length; j++){
			var obj = request[j];
			view[viewName].push(obj);

			objReturn.push(obj);
		}
	} else {

		var obj = request;
		var time = new Date().getTime();

		view[viewName].push(obj);

		objReturn = [obj];
	}

	setImmediate(function(){
		callback(null, objReturn )
	});
	return;

}

function modify ( viewName, request, options, callback ){

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'View_mock: Parameter viewName is not set or not string' ));
		return;
	}

	if ( !request ) {
		callback(new Error( 'View_mock: Parameter request is not set' ));
		return;
	}

	if ( !options ) {
		callback(new Error( 'View_mock: Parameter options is not set' ));
		return;
	}

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'View_mock: callback not a function' );
	}

	var objResults = [];
	if(underscore.isArray(request)) {
		for( var i = 0; i < request.length; i++ ) {
			objResults.push(request[i].selector);
		}
	} else {
		objResults.push(request.selector);
	}

	setImmediate(function(){
		callback(null, objResults)
	});

	return;
}

function del(viewName, request, options, callback){

	if ( !underscore.isString( viewName ) ) {
		callback(new Error( 'View_mock: Parameter viewName is not set or not string' ));
		return;
	}

	if ( !request ) {
		callback(new Error( 'View_mock: Parameter request is not set' ));
		return;
	}

	if ( !options ) {
		callback(new Error( 'View_mock: Parameter options is not set' ));
		return;
	}

	if ( !underscore.isFunction( callback ) ) {
		throw new Error( 'View_mock: callback not a function' );
	}

	var objResults = [];
	if(underscore.isArray(request)) {
		for( var i = 0; i < request.length; i++ ) {
			objResults.push({1:1});
		}
	} else {
		objResults.push({1:1});
	}

	setImmediate(function(){
		callback(null, objResults)
	});
	return;
}

module.exports = {
	init: init,
	getTemplate: getTemplate,
	find: find,
	insert: insert,
	modify: modify,
	delete: del
};

//Создаем случайное число в заданных пределах
function getRandomArbitary(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
