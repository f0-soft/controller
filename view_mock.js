var underscore = require('underscore');

var view = {}; //Переменная для хранения массивов с данными для каждой flexo схемы
var dependent; //Переменная для хранения имени зависимой схемы
var viewName; //Название view
var viewDbAccess;
var viewViewAccess;

function init ( config, callback ){
	dependent = config.dependent;
	callback(null, true);
}

//Конструктор view_mock
function View_mock( name, dbAccess, viewAccess ) {
	if (underscore.isString(name)){
		viewName = name;
	} else {
		throw new Error('Not set name in view')
	}

	if (dbAccess){
		viewDbAccess = dbAccess;
	} else {
		throw new Error('Not set dbAccess in view')
	}

	if (viewAccess){
		viewViewAccess = viewAccess;
	} else {
		throw new Error('Not set viewAccess in view')
	}

	return this;
}

View_mock.prototype.getFields = function (){
	return viewDbAccess;
};

View_mock.prototype.GetTemplate = function ( callback ) {
	callback(null, '<table>' + viewName + '</table>', 'javascriptConfigFor' + viewName);
};

View_mock.prototype.find = function(request, callback){
	//Схемы в запросе
	var schemes = Object.keys(request.queries);
	var objResults = {};

	for(var i=0; i<schemes.length; i++){
		if( view[schemes[i]] ) {

			objResults[schemes[i]] = [];
			if(underscore.isArray(request.queries[schemes[i]])) {
				for(var k=0; k<request.queries[schemes[i]].length; k++){
					var objLocal = [];
					var fieldsSearch = Object.keys(request.queries[schemes[i]][k].selector);
					var limit = -1;
					var skip = 0;
					if (request.queries[schemes[i]][k].options && request[schemes[i]][k].options.limit)
						limit = Object.keys(request.queries[schemes[i]][k].options.limit);
					if (request.queries[schemes[i]][k].options && request.queries[schemes[i]][k].options.limit)
						skip = Object.keys(request.queries[schemes[i]][k].options.skip);

					//Получаем массив объектов с полями

					for(var j=0; j<view[schemes[i]].length; j++){
						//Ищем подходящие документы
						if(fieldsSearch.length !== 0){
							var trigger = true;
							for(var l=0; l<fieldsSearch.length;l++){
								if( request.queries[schemes[i]][k].selector[fieldsSearch[l]] ===
									view[schemes[i]][j][fieldsSearch[l]] ){
									continue;
								}

								if (l === (fieldsSearch.length-1)){
									trigger = false;
								}
							}

							if(trigger) objLocal.push(view[schemes[i]][j]);
						} else {
							objLocal = view[schemes[i]];
							break;
						}

					}


					if(objLocal.length !== 0) {
						objResults[schemes[i]].push(objLocal[0]);
					}

				}

				if (skip) {
					objResults[schemes[i]] = objResults[schemes[i]].splice(0, skip);
				}

				if (limit !== -1) {
					objResults[schemes[i]] = objResults[schemes[i]].slice(0, limit);
				}


			} else {
				var objLocal = [];
				var fieldsSearch = Object.keys(request.queries[schemes[i]].selector);
				var limit = -1;
				var skip = 0;
				if (request.queries[schemes[i]].options && request[schemes[i]].options.limit)
					limit = Object.keys(request.queries[schemes[i]].options.limit);
				if (request.queries[schemes[i]].options && request.queries[schemes[i]].options.limit)
					skip = Object.keys(request.queries[schemes[i]].options.skip);

				//Получаем массив объектов с полями

				for(var j=0; j<view[schemes[i]].length; j++){
					//Ищем подходящие документы
					if(fieldsSearch.length !== 0){
						var trigger = true;
						for(var k=0; k<fieldsSearch.length;k++){
							if( request.queries[schemes[i]].selector[fieldsSearch[k]] ===
								view[schemes[i]][j][fieldsSearch[k]] ){
								continue;
							}

							if (k === (fieldsSearch.length-1)){
								trigger = false;
							}
						}


						if(trigger) {
							//Получаем имена полей
							var fieldsByView = Object.keys(view[schemes[i]][j]);

							for(var x=0; x<fieldsByView.length; x++){
								if(underscore.isArray(view[schemes[i]][j][fieldsByView[x]])){
									if(schemes.length === 1){
										schemes.push(dependent);
										request.queries[dependent] = [];

										for(var z=0; z<view[schemes[i]][j][fieldsByView[x]].length; z++){
											request.queries[dependent].push({
												selector:{
													_id:view[schemes[i]][j][fieldsByView[x]][z]
												}
											});
										}

									}
								}
							}

							objLocal.push(view[schemes[i]][j]);
						}
					} else {
						objLocal = view[schemes[i]];
						break;
					}

				}

				objResults[schemes[i]] = [];

				if(objLocal.length !== 0) {
					if (skip) {
						objLocal = objLocal.splice(0, skip);
					}

					if (limit !== -1) {
						objLocal = objLocal.slice(0, limit);
					}

					objResults[schemes[i]] = objLocal;
				}
			}
		}
	}

	setImmediate(function(){
		callback(null, objResults)
	});
	return;
};

View_mock.prototype.insert = function (request, callback) {
	//Проверяю налчия хранилища данных для вставляемых документов
	//Схемы в запросе
	var schemes = Object.keys(request.queries);
	var objReturn = {};
	for(var i=0; i<schemes.length; i++){
		//Проверяем наличие объекта для данной схемы
		if( !view[schemes[i]] ) view[schemes[i]] = [];

		if(underscore.isArray(request.queries[schemes[i]])) {
			objReturn[schemes[i]] = [];
			for(var j=0; j<request.queries[schemes[i]].length; j++){
				var obj = request.queries[schemes[i]][j];
				obj._id = getRandomArbitary(0,10000).toString();
				var time = new Date().getTime();
				obj.tsCreate = time;
				obj.tsUpdate = time;

				if ( !view[schemes[i]]) view[schemes[i]] = [];
				view[schemes[i]].push(obj);

				if (viewDbAccess['insert'][schemes[i]]) {
					var newObj = {};
					for(var k=0; k < viewDbAccess['insert'][schemes[i]].length; k++ ){
						newObj[viewDbAccess['insert'][schemes[i]][k]] =
							obj[viewDbAccess['insert'][schemes[i]][k]];
					}
					newObj._id = obj._id;
					newObj.tsCreate = obj.tsCreate;
					newObj.tsUpdate = obj.tsUpdate;
					objReturn[schemes[i]].push(newObj);
				} else {
					var newObj = {};
					newObj._id = obj._id;
					newObj.tsCreate = obj.tsCreate;
					newObj.tsUpdate = obj.tsUpdate;
					objReturn[schemes[i]].push(newObj);
				}

			}
		} else {

			var obj = request.queries[schemes[i]];
			obj._id = getRandomArbitary(0,10000).toString();
			var time = new Date().getTime();
			obj.tsCreate = time;
			obj.tsUpdate = time;

			view[schemes[i]] = [];
			view[schemes[i]].push(obj);


			if (viewDbAccess['insert'][schemes[i]]) {
				var newObj = {};
				for(var j=0; j < viewDbAccess['insert'][schemes[i]].length; j++ ){
					newObj[viewDbAccess['insert'][schemes[i]][j]] =
						obj[viewDbAccess['insert'][schemes[i]][j]];
				}
				newObj._id = obj._id;
				newObj.tsCreate = obj.tsCreate;
				newObj.tsUpdate = obj.tsUpdate;
				objReturn[schemes[i]] = [newObj];
			} else {
				var newObj = {};
				newObj._id = obj._id;
				newObj.tsCreate = obj.tsCreate;
				newObj.tsUpdate = obj.tsUpdate;
				objReturn[schemes[i]] = [newObj];
			}

		}




	}
	setImmediate(function(){
		callback(null, objReturn)
	});
	return;
};

View_mock.prototype.modify = function( request, callback ){
	//Схемы в запросе
	var schemes = Object.keys(request.queries);
	var objResults = {};

	for(var i=0; i<schemes.length; i++){
		objResults[schemes[i]] = [];
		if( view[schemes[i]] ) {

			if(underscore.isArray(request.queries[schemes[i]])) {
				for(var k=0; k<request.queries[schemes[i]].length; k++) {

					for(var j=0; j<view[schemes[i]].length; j++){

						if(view[schemes[i]][j]._id === request.queries[schemes[i]][k].selector._id){

							var modifyFields = Object.keys(request.queries[schemes[i]][k].properties);

							for(var l=0; l < modifyFields.length; l++){
								view[schemes[i]][j][modifyFields[l]] =
									request.queries[schemes[i]][k].properties[modifyFields[l]];
							}
							view[schemes[i]][j].tsUpdate = new Date().getTime() +1;


							objResults[schemes[i]].push({
								_id: view[schemes[i]][j]._id,
								tsUpdate: view[schemes[i]][j].tsUpdate
							});
						}
					}
				}
			} else {
				for(var j=0; j<view[schemes[i]].length; j++){

					if(view[schemes[i]][j]._id === request.queries[schemes[i]].selector._id){

						var modifyFields = Object.keys(request.queries[schemes[i]].properties);

						for(var l=0; l < modifyFields.length; l++){
							view[schemes[i]][j][modifyFields[l]] =
								request.queries[schemes[i]].properties[modifyFields[l]];
						}
						view[schemes[i]][j].tsUpdate = new Date().getTime() +1;

						objResults[schemes[i]].push({
							_id: view[schemes[i]][j]._id,
							tsUpdate: view[schemes[i]][j].tsUpdate
						});
					}
				}
			}
		}
	}

	setImmediate(function(){
		callback(null, objResults)
	});
	return;
};

View_mock.prototype.delete = function (request, callback){
	//Схемы в запросе
	var schemes = Object.keys(request.queries);
	var objResults = {};

	for(var i=0; i<schemes.length; i++){
		objResults[schemes[i]] = [];
		if( view[schemes[i]] ) {

			if(underscore.isArray(request.queries[schemes[i]])) {
				for(var k=0; k<request.queries[schemes[i]].length; k++) {

					for(var j=0; j<view[schemes[i]].length; j++){

						if(view[schemes[i]][j]._id === request.queries[schemes[i]][k].selector._id){

							objResults[schemes[i]].push({
								_id: view[schemes[i]][j]._id
							});

							view[schemes[i]].splice(j,1);
							j=j-1;
						}
					}
				}
			} else {
				for(var j=0; j<view[schemes[i]].length; j++){

					if(view[schemes[i]][j]._id === request.queries[schemes[i]].selector._id){


						objResults[schemes[i]].push({
							_id: view[schemes[i]][j]._id
						});

						view[schemes[i]].splice(j,1);
						j=j-1;
					}
				}
			}
		}
	}

	setImmediate(function(){
		callback(null, objResults)
	});
	return;
};

module.exports = {
	view_mock:View_mock,
	init:init
};

//Создаем случайное число в заданных пределах
function getRandomArbitary(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
