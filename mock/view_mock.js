var underscore = require('underscore');

var view = {}; //Переменная для хранения массивов с данными для каждой flexo схемы
var dependent; //Переменная для хранения имени зависимой схемы
var viewName; //Название view

function init ( config, callback ){
	dependent = config.dependent;
	callback(null, true);
}


function getTemplate ( name, vids, callback ) {

	callback(null, vids, '<table>' + name + '</table>', 'javascriptConfigFor' + name);
}

function find(viewName, listOf_vids, request, callback){
	//Схемы в запросе
	var objResults = {};

	if( view[viewName] ) {

		objResults[viewName] = [];

		var objLocal = [];
		var fieldsSearch = Object.keys(request.queries.selector);
		var limit = -1;
		var skip = 0;
		if (request.queries.options && request.queries.options.limit)
			limit = request.queries.options.limit;
		if (request.queries.options && request.queries.options.limit)
			skip = request.queries.options.skip;

		//Получаем массив объектов с полями

		for( var j = 0; j < view[viewName].length; j++ ) {
			//Ищем подходящие документы
			if(fieldsSearch.length !== 0){
				var trigger = true;
				for( var k = 0; k < fieldsSearch.length; k++ ){
					if( request.queries.selector[fieldsSearch[k]] ===
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
								request.queries[dependent] = [];

								for(var z=0; z<view[viewName][j][fieldsByView[x]].length; z++){
									request.queries[dependent].push({
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

	}


	setImmediate(function(){
		callback(null, objResults)
	});
	return;
}

function insert (viewName, listOf_vids, request, callback) {

	var objReturn = [];

	//Проверяем наличие объекта для данной схемы
	if( !view[viewName] ) view[viewName] = [];

	if(underscore.isArray(request.queries)) {

		for(var j=0; j<request.queries.length; j++){
			var obj = request.queries[j];
			obj._id = getRandomArbitary(0,10000).toString();
			var time = new Date().getTime();
			obj.tsCreate = time;
			obj.tsUpdate = time;

			view[viewName].push(obj);


			var newObj = {};
			newObj._id = obj._id;
			newObj.tsCreate = obj.tsCreate;
			newObj.tsUpdate = obj.tsUpdate;
			objReturn.push(newObj);


		}
	} else {

		var obj = request.queries;
		obj._id = getRandomArbitary(0,10000).toString();
		var time = new Date().getTime();
		obj.tsCreate = time;
		obj.tsUpdate = time;

		view[viewName].push(obj);


		var newObj = {};
		newObj._id = obj._id;
		newObj.tsCreate = obj.tsCreate;
		newObj.tsUpdate = obj.tsUpdate;
		objReturn = [newObj];
	}

	setImmediate(function(){
		callback(null, objReturn)
	});
	return;

}

function modify ( viewName, request, callback ){
	var objResults = [];
	if(underscore.isArray(request.queries)) {
		for( var i = 0; i < request.queries.length; i++ ) {
			objResults.push(request.queries[i].selector);
		}
	} else {
		objResults.push(request.queries.selector);
	}

	setImmediate(function(){
		callback(null, objResults)
	});

	return;
}

function del(viewName, request, callback){

	var objResults = [];
	if(underscore.isArray(request.queries)) {
		for( var i = 0; i < request.queries.length; i++ ) {
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
